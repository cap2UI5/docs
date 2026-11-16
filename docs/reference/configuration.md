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
| `routes` | the paths the roundtrip answers on. Both defaults exist so that a frontend or a bookmark written for either name works. A GET on a route answers with the page that embeds the whole UI5 frontend — there is no separate static route to configure |
| `body_parser.limit` | the largest roundtrip body, a larger one gets 413. No default of its own: CAP's `cds.server.body_parser.limit` applies, else `10mb`. A roundtrip carries the app's whole model, so a table of a few thousand rows is an ordinary request |
| `compression` | `true`: the page and every roundtrip of 1 kB or more are gzipped where the browser accepts gzip — the page, which carries the whole UI5 frontend, goes out as 83 kB instead of 358 kB. Nothing is compressed twice behind an approuter or ingress that compresses too; `false` leaves the work to it |
| `accelerate` | `true`: the plugin calls the runtime's `accelerate( )` when the server starts, where the runtime has one (every runtime since plugin 0.4.0 does), and logs `runtime accelerations active`. `false` runs the runtime's own code — see [Performance](#performance) |
| `timeout` | **not released yet** — on cap2UI5's `main`, after 0.5.0. The milliseconds an app's async `main( )` may take: `60000` unless set, `0` or `false` for no limit. See [One roundtrip at a time](#one-roundtrip-at-a-time) |
| `agent` | since 0.5.0. Off unless set: `true`, or `{ path, apps, confirm, forbidden, retention }`, switches on the MCP endpoint AI agents operate apps through — see [Agents](../guide/agents) |

The first three have their defaults in the plugin's `package.json`; the rest
are read by `plugin/lib/config.js`, which holds theirs. A `timeout` that is
not a number of milliseconds, an `agent` setting the endpoint does not know and
an empty `routes` list fail the start, naming the setting.

`"cap2ui5": false` under `cds.requires` switches the plugin off: no route, and
no `cap2ui5.Drafts` or `cap2ui5.AgentLog` table in the model.

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
| `main`, not released yet | `1.149.0` | the windowed table behind `client.window_bind_tab( )` and `window_get_row( )` — see [`client`](../api/client#the-windowed-table). The eight obsolete invisible custom controls (`z2ui5.cc.Timer`, `Focus`, `Scrolling`, `Title`, `LPTitle`, `Favicon`, `History`, `Info`) are gone from the frontend: a view that still names one fails to load |

The plugin's [CHANGELOG](https://github.com/cap2UI5/cap2UI5/blob/main/plugin/CHANGELOG.md)
has the full list per release. No plugin release pinned the runtime between
the last two rows.

The runtime resolves as the plugin's own dependency, at the pinned version.
To load another release, use npm `overrides` in your `package.json`. The log
names what was loaded at startup — for a checkout of `main`:

```
[cap2ui5] - @abap2ui5/node-runtime 1.149.0 from …/node_modules/@abap2ui5/node-runtime
[cap2ui5] - runtime accelerations active
```

Backend, UI5 frontend and wire protocol version come from that one package,
which is what makes a frontend/backend mismatch impossible. See
[HTTP Protocol](./protocol).

## Performance

A roundtrip carries the app's model, restored from the draft, run and answered
whole, so its cost grows with the model. Measured by the plugin on one editable
table (the plugin's README has the table):

- **The runtime's accelerations.** Without them, a table of n rows costs time
  in n² — not in abap2UI5's ABAP but in two places of `@abaplint/runtime` it
  runs on. With them (measured on the runtime of plugin 0.4.0, `accelerate` on), 2000 rows start in
  1.6 s instead of 19.6 s, and an edited cell answers in 2.9 s instead of
  43.5 s.
- **Node 24 is recommended.** CAP keeps `cds.context` in an
  `AsyncLocalStorage`, which on Node 22 costs the transpiled framework about
  as much again as its own work; Node 24 keeps it nearly free. On Node 22.7
  and later, `NODE_OPTIONS=--experimental-async-context-frame` does the same.
- **`NODE_COMPILE_CACHE`** set to a directory saves part of the runtime's
  import on every start — worth it for `cds watch`.

## One roundtrip at a time

Since 0.5.0 roundtrips run **one at a time per process**. The transpiled
framework keeps per-request state where ABAP keeps it per work process — and
the draft store really awaits the database, so without a queue a second
request could run inside the first and share that state. A failed roundtrip
never blocks the next one.

A roundtrip costs milliseconds, so the queue is rarely felt. The price shows
when an app's `main( )` waits: a slow query or a remote call that does not
answer holds **every other user's** roundtrip for as long. So keep the I/O in
`main( )` short, and scale with instances — see
[Deployment](./deployment#what-changes-in-production-and-what-does-not).

Two things on cap2UI5's `main` make that visible and bounded. They are **not
released yet** — 0.5.0 has the queue without them:

- **`timeout`.** An async `main( )` that takes longer than
  `cds.requires.cap2ui5.timeout` milliseconds — a minute unless set — has its
  roundtrip given up. The browser gets **504** with
  `roundtrip timed out (<id>)`, the draft of that roundtrip is not written,
  and the next roundtrip runs. `0` or `false` is no limit. A synchronous
  `main( )` cannot be interrupted and is not timed, and neither is a
  transpiled ABAP app.
- **A warning.** A roundtrip that waited a second or more for its turn is
  logged, with the wait and how many were ahead of it — at most once every ten
  seconds:

  ```
  [cap2ui5] - a roundtrip waited 1840 ms behind 3 other(s): roundtrips run one at a time per process, so a slow main( ) holds everyone - look for the app that awaits, or run more instances
  ```

::: warning Upgrading past 0.5.0
An app whose async `main( )` legitimately takes longer than a minute will fail
with 504 once `timeout` is released. Raise the setting, or set it to `0`, for
that project.
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
`roundtrip timed out (<id>)` instead (not released yet). The detail — the stack, the SQL, the entity names —
goes to the server log under the same id. That is deliberate: CDS and driver
messages carry entity names, SQL fragments and deployment paths, and none of it
belongs in an HTTP response.

## Next

- [**Deployment**](./deployment) — what changes when this leaves your laptop
- [**Database Model**](./database) — `cap2ui5.Drafts` and `cap2ui5.AgentLog`
- [**Agents: the MCP Endpoint**](../guide/agents) — what `agent` switches on
- [**The User Exit**](../guide/user-exit) — the CSP, the headers, the draft expiry
- [**Architecture**](./architecture) — how the pieces fit
