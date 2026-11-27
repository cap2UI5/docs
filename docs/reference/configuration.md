# Configuration

Everything the plugin reads lives under `cds.requires.cap2ui5` and is a plain
CAP configuration value: `package.json#cds`, a `.cdsrc.json`, a
`CDS_REQUIRES_CAP2UI5_*` environment variable, a profile — whatever you
already use. That is where SAP's own plugins keep their settings.

## The defaults

These ship in the plugin's own `package.json` and apply until you override one:

```json
{
  "cds": {
    "requires": {
      "cap2ui5": {
        "apps": "srv/apps",
        "roles": ["authenticated-user"],
        "routes": ["/sap/bc/z2ui5", "/rest/root/z2ui5"]
      }
    }
  }
}
```

| key | what it does |
|---|---|
| `apps` | the directory scanned for app modules, relative to `cds.root`. Every `.js`/`.mjs`/`.cjs` in it is imported once the runtime is up. A project without the directory simply has no JavaScript apps of its own. Apps a dependency brings come on top — see [Apps from a package](../guide/project-structure#apps-from-a-package) |
| `roles` | who may call: a role, or a list of roles any one of which lets the user in, as with CAP's `@requires`. `any` or `null` lets anonymous callers in — read the box below first |
| `routes` | the paths the roundtrip answers on. Both defaults exist so that a frontend or a bookmark written for either name works. A GET on a route answers with the page, and the UI5 frontend that page runs comes from the same route — there is no separate static route to configure |
| `body_parser.limit` | the largest roundtrip body, a larger one gets 413. No default of its own: CAP's `cds.server.body_parser.limit` applies, else `10mb`. A roundtrip carries the app's whole model, so a table of a few thousand rows is an ordinary request |
| `compression` | `true`: the page, the frontend bundle and every roundtrip of 1 kB or more are gzipped where the browser accepts gzip — with 0.8.0 the bundle goes out as 57 kB instead of 194 kB (measured; up to 0.7.0 the frontend was part of the page). Nothing is compressed twice behind an approuter or ingress that compresses too; `false` leaves the work to it. From 0.8.0 on the gzip is the runtime package's own `compress( )`; for a project nothing changes |
| `timeout` | since 0.6.0. The milliseconds an app's async `main( )` may take: `60000` unless set, `0` or `false` for no limit. See [One roundtrip at a time](#one-roundtrip-at-a-time) |
| `agent` | since 0.5.0. Off unless set: `true`, or `{ path, apps, confirm, forbidden, retention }`, switches on the MCP endpoint AI agents operate apps through — see [Agents](../guide/agents) |

The first three have their defaults in the plugin's `package.json`; the rest
are read by `plugin/lib/config.js`, which holds theirs. A `timeout` that is
not a number of milliseconds, an `agent` setting the endpoint does not know and
an empty `routes` list fail the start, naming the setting.

`"cap2ui5": false` under `cds.requires` switches the plugin off: no route, and
no `cap2ui5.Drafts` or `cap2ui5.AgentLog` table in the model.

::: info `accelerate` is gone with 0.8.0
Up to 0.7.0 there was one more key, `accelerate`, which switched the runtime's
`accelerate( )` off. Plugin 0.8.0 — not released yet — removes it: the runtime
it hosts is linear on large tables by itself (see [Performance](#performance)),
so there is nothing left to switch. A project that still sets the key is not
refused; the setting is ignored.
:::

::: info Coming from 0.1.0
0.1.0 read a top-level `cds.cap2ui5`, with `requires` for the roles. Those
settings still apply, and the log warns and names the new place: move them
under `cds.requires.cap2ui5`, and rename `requires` to `roles`.
:::

## Overriding

In your project's `package.json`:

```json
{
  "cds": {
    "requires": {
      "cap2ui5": {
        "apps": "srv/ui",
        "routes": ["/ui5"],
        "body_parser": { "limit": "20mb" }
      }
    }
  }
}
```

or per profile, the usual CAP way:

```json
{ "cds": { "[production]": { "requires": { "cap2ui5": { "roles": ["MyUi5Role"] } } } } }
```

## Authentication — and what opening the route costs

The route runs **behind CAP's own middleware chain**, so whatever
`cds.requires.auth` is configured to has already identified the caller by the
time the plugin's guard decides. That is not a detail: `cds.context`, and with
it `cds.context.user`, only exists where CAP's middlewares ran.

The guard decides the way CAP decides for a service annotated with
`@requires`: a user with any one of `cap2ui5.roles` is let in. A caller who is
not logged in gets **401** with the auth strategy's login challenge; a
logged-in user without the role gets **403**. Both are answered by CAP's own
error middleware, in CAP's error format.

::: warning Setting `roles` to `any` or `null` opens more than the door
Then every caller who has not logged in is CAP's anonymous user — and the
draft store binds each session to `cds.context.user.id`. So *all* anonymous
visitors share one owner and therefore each other's sessions. That is the
documented consequence of turning authentication off, not a defect, but a
public demo and a shared staging system are very different things.
:::

Verified for **every** auth kind, not just the development ones — the chain is
read in a child process per kind in `cap-abi.test.mjs`:

```
mocked  ["cds_context","OBJ:[]","basic_auth","OBJ:[]"]
basic   ["cds_context","OBJ:[]","basic_auth","OBJ:[]"]
dummy   ["cds_context","OBJ:[]","dummy_auth","OBJ:[]"]
jwt     ["cds_context","OBJ:[]","jwt_auth","OBJ:[]"]
xsuaa   ["cds_context","OBJ:[]","jwt_auth","OBJ:[]"]
ias     ["cds_context","OBJ:[]","ias_auth","OBJ:[]"]
```

The auth middleware is a plain function in all six, so the route really does
run behind it under `xsuaa` and `ias` and not only under `mocked`.

## The runtime

`@cap2ui5/cds-plugin` depends on `@abap2ui5/node-runtime` **pinned exactly**,
so `npm add @cap2ui5/cds-plugin` already gives you one known runtime release.
There is nothing to add to your own `package.json`.

| plugin | runtime it pins | what came with that runtime |
|---|---|---|
| 0.4.0 | `1.146.0` | the frontend's `X-CSRF-Token` handshake with the approuter, `accelerate( )`, `view_display`'s transitions |
| 0.5.0 | `1.147.0` | flat tables written to JSON directly, the draft kept as a digest, the developer tools as a bundle of their own |
| 0.6.0, 0.7.0 | `1.149.0` | the windowed table in its first, framework-driven form: `client.window_bind_tab( )` with `t_sort` and `t_filter`, and `window_get_row( )`. The eight obsolete invisible custom controls (`z2ui5.cc.Timer`, `Focus`, `Scrolling`, `Title`, `LPTitle`, `Favicon`, `History`, `Info`) are gone from the frontend: a view that still names one fails to load |
| 0.8.0 — **not released yet** | `1.151.0` | see below |

The plugin's [CHANGELOG](https://github.com/cap2UI5/cap2UI5/blob/main/plugin/CHANGELOG.md)
has the full list per release. No plugin release pinned the runtime releases
in between.

### 0.8.0 and runtime `1.151.0` — not released yet

`npm add @cap2ui5/cds-plugin` installs 0.7.0 today (looked up on 2026-11-27).
0.8.0 is on cap2UI5's `main` since
[cap2UI5/cap2UI5#119](https://github.com/cap2UI5/cap2UI5/pull/119) and is
released once it is tagged and published to npm; this site already describes
it. While
the version starts with 0 a minor release may break the API, and this one
does. What an app has to change:

- **The windowed table is the app's.**
  `client.window_bind_tab({ val, total, event, window })` binds a result the
  app loads a window at a time; the framework no longer sorts, filters or
  counts, `t_sort` and `t_filter` are no parameters any more and
  `client.window_get_row( )` is gone — see
  [`client`](../api/client#the-windowed-table).
- **`client._bind_edit( )` and the `*_model_update( )` no-ops are gone**, as
  they left `z2ui5_if_client`. Write `_bind( )`; delete the update calls —
  left in, one fails with "is not a function".
- **`client.hash_set( )` and `client.hash_replace( )` write the URL only for
  an app that owns the hash** — a listener registered with
  `cs_event.hash_attach_changed`.
- **The wire is protocol 3** — nothing for an app, something for a test or a
  tool that reads the response. See [HTTP Protocol](./protocol).

What comes with it and breaks nothing: a change made in place to a table or a
structure field is kept ([Data Binding](../guide/data-binding#tables)); the
client's `check_on_nav_back( )`, `get_nav_tag( )`, `check_nav_pending( )`,
`get_start_param( )`, `timer_set( )` and `timer_stop( )`; a draft chain pruned
to two rows ([Persistence](../guide/persistence#retention)); and the page as a
small loader for a frontend bundle. The `accelerate` key is removed, see above.

The runtime resolves as the plugin's own dependency, at the pinned version.
To load another release, use npm `overrides` in your `package.json`. The log
names what was loaded at startup — with plugin 0.8.0:

```
[cap2ui5] - @abap2ui5/node-runtime 1.151.0 from …/node_modules/@abap2ui5/node-runtime
[cap2ui5] - drafts live in cap2ui5.Drafts
```

Up to 0.7.0 a line `runtime accelerations active` followed the first; 0.8.0
has none, as it has no `accelerate`.

Backend, UI5 frontend and wire protocol version come from that one package,
which is what makes a frontend/backend mismatch impossible. See
[HTTP Protocol](./protocol).

## Performance

A roundtrip carries the app's model, restored from the draft, run and answered
whole, so its cost grows with the model. Measured by the plugin on one editable
table (the plugin's README has the table):

- **Linear since the runtime of plugin 0.4.0.** Before it, a table of n rows
  cost time in n² — not in abap2UI5's ABAP but in two places of
  `@abaplint/runtime` it runs on. The runtime worked around both with its
  `accelerate( )`: measured on the runtime of plugin 0.4.0, 2000 rows start in
  1.6 s instead of 19.6 s, and an edited cell answers in 2.9 s instead of
  43.5 s. `@abaplint/runtime` 2.13.96 fixed them at the source, so the runtime
  0.8.0 pins is linear with nothing to switch on — which is why the
  `accelerate` key went. That last step is the plugin's README's statement;
  the table was not measured again for this page.
- **Node 24 is recommended.** CAP keeps `cds.context` in an
  `AsyncLocalStorage`, which on Node 22 costs the transpiled framework about
  as much again as its own work; Node 24 keeps it nearly free. On Node 22.7
  and later, `NODE_OPTIONS=--experimental-async-context-frame` does the same.
- **`NODE_COMPILE_CACHE`** set to a directory saves part of the runtime's
  import on every start — worth it for `cds watch`.

## One roundtrip at a time

Since 0.5.0 roundtrips run **one at a time per process** — from 0.8.0 on
through the runtime package's own `exclusive( )`, with the same behaviour. The transpiled
framework keeps per-request state where ABAP keeps it per work process — and
the draft store really awaits the database, so without a queue a second
request could run inside the first and share that state. A failed roundtrip
never blocks the next one.

A roundtrip costs milliseconds, so the queue is rarely felt. The price shows
when an app's `main( )` waits: a slow query or a remote call that does not
answer holds **every other user's** roundtrip for as long. So keep the I/O in
`main( )` short, and scale with instances — see
[Deployment](./deployment#what-changes-in-production-and-what-does-not).

Since 0.6.0 two things make that visible and bounded — 0.5.0 has the queue
without them. Both are measured, with plugin 0.6.0 on localhost:

- **`timeout`.** An async `main( )` that takes longer than
  `cds.requires.cap2ui5.timeout` milliseconds — a minute unless set — has its
  roundtrip given up. The browser gets **504** with
  `roundtrip timed out (<id>)`, the draft of that roundtrip is not written,
  and the next roundtrip runs. `0` or `false` is no limit. A synchronous
  `main( )` cannot be interrupted and is not timed, and neither is a
  transpiled ABAP app. Measured: with the limit at 1500 ms, a `main( )` that
  waited 20 seconds was answered 504 after 1525 ms, the roundtrip of another
  user queued behind it got its 200 right after, and the same user carried on
  from the draft id they had. With the default, the 504 came after 60 seconds.
  A synchronous `main( )` that spun for 3 seconds was not cut off.
- **A warning.** A roundtrip that waited a second or more for its turn is
  logged, with the wait and how many were ahead of it — at most once every ten
  seconds:

  ```
  [cap2ui5] - a roundtrip waited 1213 ms behind 1 other(s): roundtrips run one at a time per process, so a slow main( ) holds everyone - look for the app that awaits, or run more instances
  ```

::: warning Upgrading from 0.5.0
An app whose async `main( )` legitimately takes longer than a minute fails
with 504 from 0.6.0 on. Raise the setting, or set it to `0`, for that project.
:::

## What the plugin does not configure

Everything the **framework** decides about a response — the UI5 bootstrap URL,
the Content-Security-Policy, the security headers, the theme, the draft expiry
and the CSRF gate — is not a `cds.requires.cap2ui5` option. It comes from the user
exit, registered with `defineExit`:

```js
// srv/apps/exit.js
import { defineExit } from "@cap2ui5/cds-plugin";

defineExit({
  onPage(cfg, ctx) { cfg.theme = "sap_horizon_dark"; },
  onRoundtrip(cfg) { cfg.draft_exp_time_in_hours = 24; },
});
```

One per project, and the whole surface is on [The User Exit](../guide/user-exit).

## Errors

An unhandled error in the roundtrip answers `500` with
`roundtrip failed (<id>)`, where `<id>` is `cds.context.id` — stripped, since
0.5.0, to letters, digits and `. _ : -`, because CAP takes that id from a
request header when there is one. A `main( )` that ran out of
[time](#one-roundtrip-at-a-time) answers `504` with
`roundtrip timed out (<id>)` instead (since 0.6.0). The detail — the stack, the SQL, the entity names —
goes to the server log under the same id. That is deliberate: CDS and driver
messages carry entity names, SQL fragments and deployment paths, and none of it
belongs in an HTTP response.

## Next

- [**Deployment**](./deployment) — what changes when this leaves your laptop
- [**Database Model**](./database) — `cap2ui5.Drafts` and `cap2ui5.AgentLog`
- [**Agents: the MCP Endpoint**](../guide/agents) — what `agent` switches on
- [**The User Exit**](../guide/user-exit) — the CSP, the headers, the draft expiry
- [**Architecture**](./architecture) — how the pieces fit
