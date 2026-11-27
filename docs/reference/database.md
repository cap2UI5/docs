# Database Model

cap2UI5 adds **two entities** to your model: `cap2ui5.Drafts`, the session
state, and — since 0.5.0 — `cap2ui5.AgentLog`, the audit log of the
[agent endpoint](../guide/agents). That is the whole persistence footprint.

## `cap2ui5.Drafts`

```cds
namespace cap2ui5;

entity Drafts {
  key id              : String(36);
      id_prev         : String(36);
      id_prev_app     : String(36);
      id_prev_app_stk : String(36);
      owner           : String(120) not null;
      createdAt       : Timestamp;
      data            : LargeString;
}
```

It arrives through the plugin's `package.json#cds.requires`, so `cds deploy`
creates it — and `cap2ui5.AgentLog`, [below](#agentlog) — beside your
own tables — same database, same connection, same
transaction, same authorization.

| column | |
|---|---|
| `id` | the draft's uuid; the frontend carries it and sends it back on the next roundtrip |
| `id_prev` | the draft this one continues — the chain of an app session |
| `id_prev_app`, `id_prev_app_stk` | the app stack: who called whom, and who gets the screen back |
| `owner` | who created it. `not null`, and the reason is below |
| `createdAt` | when, for the retention sweep |
| `data` | the serialized app instance — the state your fields hold |

## The owner binding

A draft is not a small object: it carries the serialized model of a running
app. So a read answers **only** to the user who created it:

```js
if (r.owner !== who()) throw notFound();
```

and the refusal is the *same* `NO_DRAFT_ENTRY_OF_PREVIOUS_REQUEST_FOUND` a
missing draft produces — deliberately, so a caller cannot tell a foreign draft
from an absent one. A shared bookmark degrades to a fresh app start rather than
to somebody else's session.

::: danger Why the column is `not null`, and why the comparison is `!==`
An earlier version wrote `if (r.owner && r.owner !== who())`. That is the same
check with a hole in it: a row whose `owner` was `NULL` or `""` passed it, so it
belonged to **everybody** rather than to nobody. A security review found it and
a proof of concept confirmed it — one user replayed another's draft id against
a blanked row and was handed her running app.

An authorization check compares presence, never truthiness. `&&` in front of a
comparison in an access decision turns a missing value into a wildcard. The
column is `not null` now, the comparison is `!==`, the `UPDATE` carries `owner`
in its `WHERE`, and the test for it discriminates — red on the old condition,
green on the new.
:::

## What is NOT reachable

`cap2ui5.Drafts` is in your model, which is what lets `cds deploy` create it —
but a CAP service exposes only what it *projects*. Unless you write a
projection over it (do not), it is not reachable through any OData service.

Measured rather than assumed, because session state reachable through somebody's
OData service would be the worst kind of surprise: in `coexistence.test.mjs`,
`/odata/v4/catalog/Drafts` answers **404** and the service metadata names no
draft entity.

## Retention

### A chain is pruned to two rows

Since plugin 0.8.0: abap2UI5 `1.151.0` adds two methods
to `z2ui5_if_ui5_draft_store`, `prune_chain( )` and `touch( )`, and the CDS
draft store implements both, following the shipped store step for step:

- **`prune_chain( )`** runs after every save and deletes the one draft that
  fell out of the window — the user exit's `draft_keep_per_chain`, 2 by
  default; `0` switches it off. It walks `id_prev` from the draft just saved
  and never deletes, or walks past, the drafts of the app stack
  (`id_prev_app`, `id_prev_app_stk`), a draft any draft of the user still
  names as the app to return to, or a draft the framework protects — the one
  an app handed out a link to with `app_state_get_href( )`. It is scoped to
  the owner.
- **`touch( )`** renews `createdAt` of a draft a roundtrip answered again
  instead of writing a new one — an unchanged timer tick — so the sweep below
  counts its age from then.

Neither raises: a draft that is not pruned lives until the sweep takes it by
age. Measured with cap2UI5's `drafts.test.mjs` on runtime `1.151.0`: six
roundtrips of one app session left two rows, the newest two, and a draft
whose link the app had handed out stayed. Up to 0.7.0 `cap2ui5.Drafts` grew
by one row per roundtrip until the expiry.

### Expired drafts are swept

The framework calls the store's `cleanup()` **when somebody opens an app** — a
roundtrip without a draft id that starts an app by its name, or restores one
from a bookmark — and not on the roundtrips of an app's events. It deletes the drafts older than
`draft_exp_time_in_hours`, four hours unless your
[user exit](../guide/user-exit#onroundtrip) says otherwise:

```sql
DELETE FROM cap2ui5_Drafts WHERE createdAt < <now - draft_exp_time_in_hours>
```

::: info Not on every roundtrip
This page used to say the sweep runs once per roundtrip. It does not: it runs
about as often as somebody starts an app. Where nobody does for a while, the
expired drafts — each a whole app state — stay in the table until somebody
does.
:::

It asks the exit the same way the framework's own store does, so raising the
expiry keeps the rows as long as the framework will resume them. Hard-coding
the sweep at four hours made the two disagree: a 20-hour-old draft the
framework was willing to restore had already been deleted.

It never raises — a failed sweep must not fail an app start. It is not scoped by
owner, because it is a retention policy rather than an access decision; in a
multitenant CAP app it is scoped by the tenant like every other `cds.run`.

### `purgeDrafts` — the same sweep from your own job {#purgedrafts}

Since 0.6.0 — read from the plugin's code, not run for this page. For a project that
does not want expired drafts to wait for the next app start, the package
exports the same `DELETE`:

```js
import { purgeDrafts } from "@cap2ui5/cds-plugin";

const deleted = await purgeDrafts();            // the user exit's expiry, else 4 hours
const older = await purgeDrafts({ hours: 24 }); // another expiry
```

It deletes the expired drafts of **every** user and answers how many. `hours`
must be a number above 0; anything else throws. It runs in `cds.context`'s
transaction where there is one, so a multitenant application calls it once per
tenant, inside `cds.tx({ tenant }, …)`. cap2UI5 starts no timer of its own —
when the job runs is your scheduler's business.

::: warning SQLite: give it a busy timeout
Every roundtrip writes a draft — and from 0.8.0 on deletes one — so a cap2UI5 app writes to the database far
more often than a typical OData service. On a **file-backed SQLite** with more
than one process — a second worker, a test suite, a second `cds watch` —
`@cap-js/sqlite` 3 (which uses node's built-in `node:sqlite`) fails the write
immediately with *database is locked*, because its busy timeout defaults to
zero. WAL is on, so readers are fine; writers are the ones that collide.

```json
{ "cds": { "requires": { "db": {
  "kind": "sqlite",
  "credentials": { "url": "db.sqlite" },
  "client": { "timeout": 5000 }
} } } }
```

`client` goes straight to the driver. Measured in this project's own example:
five of six suite runs failed without it, six of six passed with it. On HANA
or Postgres the question does not arise.
:::

## `cap2ui5.AgentLog` {#agentlog}

Since 0.5.0. One row per tool call of the [agent endpoint](../guide/agents),
written by the plugin as the user the agent acted as:

```cds
entity AgentLog {
  key ID         : UUID;
      createdAt  : Timestamp;
      owner      : String(120) not null;
      userAgent  : String(200);
      tool       : String(20);
      app        : String(120);
      appStart   : String(120);
      sessionIn  : String(36);
      sessionOut : String(36);
      event      : String(255);
      fields     : String(1000);
      args       : String(1000);
      outcome    : String(10);
      message    : String(1000);
}
```

What each column holds is on the
[agent page](../guide/agents#audit-log). Two things
matter here:

- **`fields` names the fields an agent filled, never their values.** Longer
  texts are cut to fit their column.
- **It is in no service**, like `cap2ui5.Drafts`. To show it, expose it in a
  service of your own, with a `@restrict` such as `where: 'owner = $user'`.

### The table is there whether the endpoint is on or not

The entity is part of the model the plugin contributes, so the next
`cds deploy` — or `cds build --production` — creates `cap2ui5_AgentLog` in
**every** project, also in one that never switches the endpoint on. It is
written only while the endpoint is on. That is deliberate
([ADR-009](https://github.com/cap2UI5/cap2UI5/blob/main/docs/adr/adr-009-agent-endpoint.md),
decision 9):

- the database is built from the model where `cds build` runs, and the
  endpoint is switched on where the server runs — often by an environment
  variable the build never sees. A conditional table would be missing exactly
  there;
- switching the endpoint off would, on the next deploy, drop the table and
  with it the record of what agents did.

`"cap2ui5": false` under `cds.requires` still removes both tables with the
plugin.

### Its retention

Rows older than `agent.retention` days — 90 unless set, `0` or `false` for
never — are deleted on the way of an agent call, at most once an hour per
process and tenant. `purgeAgentLog( { days } )`, exported by the package since
0.5.0, runs the same `DELETE` from a job of your own. Both are described under
[Retention](../guide/agents#retention) on the agent page.

## Your own tables

Untouched. The apps read and write them through `cds.ql` exactly like a
handler, and a plain OData service beside the apps sees the same rows:

```js
const { Books } = cds.entities("my.bookshop");
this.books = await SELECT.from(Books).where`title like ${"%" + this.search + "%"}`;
```

Both directions are tested: a row the app writes is there for the OData client
at once, and a row POSTed through OData is found by the app's next search.

## Next

- [**Persistence & Sessions**](../guide/persistence) — what this means while writing an app
- [**Agents: the MCP Endpoint**](../guide/agents) — what writes `cap2ui5.AgentLog`
- [**Configuration**](./configuration) — the auth default the owner binding depends on
