# Database Model

cap2UI5 adds **one entity** to your model. That is the whole persistence
footprint.

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
creates it beside your own tables — same database, same connection, same
transaction, same authorization.

| column | |
|---|---|
| `id` | the draft's uuid; the frontend carries it and sends it back on the next roundtrip |
| `id_prev` | the draft this one continues — the chain that makes back-navigation work |
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

`cleanup()` runs once per roundtrip and deletes drafts older than
`draft_exp_time_in_hours` — four hours unless your
[user exit](../guide/user-exit#onroundtrip) says otherwise:

```sql
DELETE FROM cap2ui5_Drafts WHERE createdAt < <now - draft_exp_time_in_hours>
```

It asks the exit the same way the framework's own store does, so raising the
expiry keeps the rows as long as the framework will resume them. Hard-coding
the sweep at four hours made the two disagree: a 20-hour-old draft the
framework was willing to restore had already been deleted.

It never raises — a failed sweep must not fail a roundtrip. It is not scoped by
owner, because it is a retention policy rather than an access decision; in a
multitenant CAP app it is scoped by the tenant like every other `cds.run`.

::: warning SQLite: give it a busy timeout
Every roundtrip writes a draft, so a cap2UI5 app writes to the database far
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
- [**Configuration**](./configuration) — the auth default the owner binding depends on
