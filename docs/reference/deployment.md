# Deployment

A cap2UI5 project deploys like **any other CAP project**, because it is one.
The plugin adds a dependency, an entity and a route — nothing that needs its own
module, its own build step or its own pipeline.

::: warning What is verified here, and what is not
Measured: the plugin's behaviour (the entity, the route, the authentication
chain under `xsuaa` and `ias`), the output of `cds build --production`, the
built service booting from `csn.json` (with SQLite standing in for HANA), and
the approuter setting below against `@sap/approuter` 23.0.0 run locally
without xsuaa. **Not** exercised: a real HANA or BTP deployment. The Cloud
Foundry topology below is the standard CAP one — treat it as the shape to
expect rather than as a tested recipe, and tell us if it bites.
:::

## Locally

```bash
cds watch
```

In-memory SQLite by default, so every session vanishes on restart — which is
usually what you want while developing. For persistence across restarts:

```json
{ "cds": { "requires": { "db": { "kind": "sqlite", "credentials": { "url": "db.sqlite" } } } } }
```

then `cds deploy` once. `cap2ui5.Drafts` is created along with your own tables.

## What changes in production, and what does not

| | |
|---|---|
| **The frontend** | there are no frontend files. The page the roundtrip route answers a GET with embeds the whole UI5 component, so there is no separate frontend project to build, no HTML5 module to push, no UI5 tooling in the pipeline |
| **The entities** | `cap2ui5.Drafts` and, since 0.5.0, `cap2ui5.AgentLog` deploy through your normal `db` module, HDI container included. Nothing special — but an upgrade to 0.5.0 adds a table, so it needs a deploy |
| **Authentication** | whatever `cds.requires.auth` is — the route runs behind CAP's own chain. Verified for `jwt`, `xsuaa` and `ias`, not only for the development kinds |
| **Scaling** | a JavaScript app's state is in the database, not in memory, so a second instance is a second instance: no sticky sessions, no shared cache. Two things to know — see [Scaling](#scaling) |
| **The runtime** | `@cap2ui5/cds-plugin` pins `@abap2ui5/node-runtime` exactly (`1.149.0` for 0.6.0; the [table](./configuration#the-runtime) has the others). Commit your `package-lock.json` and a redeploy installs the same release |

## Scaling

**"No sticky sessions" holds for JavaScript apps.** Every `defineApp` app keeps
its state in its fields, the fields are in the draft, and the draft is in the
database — so any instance answers any roundtrip, and a restart loses nothing.

Two limits, both since 0.5.0:

- **Roundtrips run one at a time per process.** One instance answers one
  roundtrip at a time, so an app whose `main( )` awaits something slow holds
  everybody on that instance. More instances are how this scales; what bounds
  a single slow roundtrip is on
  [Configuration](./configuration#one-roundtrip-at-a-time).
- **A stateful ABAP app does not scale out.** A *transpiled ABAP* app that
  calls `set_session_stateful( )` is kept in memory between its requests, as
  on an SAP system. The plugin keeps such a session per CAP user, **in the
  process**: a session id it issues travels as `sap-contextid`, only that
  user's requests naming it get the session, and `set_session_stateful(
  abap_false )`, the frontend's terminate ping or 30 idle minutes end it. So
  with more than one instance such an app needs **sticky routing**, and a
  restart or a scale-down loses its sessions — a stateful app skips the draft
  save. A JavaScript app cannot go stateful at all:
  `client.set_session_stateful()` throws.

If none of your apps is a transpiled ABAP class that goes stateful, the second
point does not concern you. Before 0.5.0 the first such app answered every
later request of every user; that is fixed, not a behaviour to plan for.

## Pin the plugin

```json
{ "dependencies": { "@cap2ui5/cds-plugin": "^0.6.0" } }
```

`@cap2ui5/cds-plugin` is on npm, and it depends on one exact `@abap2ui5/node-runtime`
release, so backend, UI5 frontend and wire version move only when the plugin
version does. Nothing else needs pinning.

## The production build

Measured with `cds add hana` followed by `cds build --production` in a project
created by `cds init --nodejs`:

- `gen/db/src/gen/cap2ui5.Drafts.hdbtable` is written next to your own tables
  (`COLUMN TABLE cap2ui5_Drafts ...`), so the entity travels in the same HDI
  artefacts as yours, with no extra step;
- `srv/apps/*` is copied into `gen/srv/srv/apps/`, so the built service has
  your apps;
- `gen/srv/srv/csn.json` contains `cap2ui5.Drafts`, and the built service
  boots from it with the plugin loaded.

The boot was checked with SQLite standing in for HANA. A deployment to a real
HANA database has not been exercised.

## Cloud Foundry (BTP)

The usual CAP modules, with one fewer than a hand-built UI5 app needs:

```yaml
modules:
  - name: my-srv                 # the CAP service — serves the apps AND their page
  - name: my-db-deployer         # HDI container, incl. cap2ui5.Drafts
  - name: my-approuter           # if you want one in front

resources:
  - name: my-uaa                 # xsuaa
  - name: my-hdi                 # HANA
```

There is **no HTML5 module for the frontend** and no app-repo push, because
the frontend is embedded in the page the service itself answers with.

### The approuter and its CSRF token

`cds add xsuaa,approuter` (cds-dk 10.1) writes `.deploy/app-router/xs-app.json`
with a single catch-all route:

```json
{
  "routes": [
    { "source": "^/(.*)$", "target": "$1", "destination": "srv-api", "csrfProtection": true }
  ]
}
```

`@sap/approuter` requires an `x-csrf-token` header on every request other than
GET and HEAD to an authenticated route whose `csrfProtection` is not `false`,
and answers `403` with `x-csrf-token: Required` otherwise. It hands out the
token on a GET or HEAD that carries `x-csrf-token: Fetch`, bound to the session
(approuter 23.0.0, `lib/middleware/xsrf-token-handler.js`).

Since `@cap2ui5/cds-plugin` 0.4.0 that route works as generated. The frontend
of the runtime it pins, and of every later one, answers a `403` with
`x-csrf-token: Required` by fetching the token with a HEAD request and sending
the roundtrip again with it — the handshake
[abap2UI5/abap2UI5#2802](https://github.com/abap2UI5/abap2UI5/pull/2802) added.
That is read from both sides' code; it has not yet been run end to end
against an approuter bound to XSUAA or IAS.

::: details With plugin 0.3.x: one extra route
The frontend in the runtime 0.3.x pins sends no token, so behind
the generated route the page loads and the first click fails. Upgrade, or put
a route for the roundtrip path in front of the catch-all with the approuter's
check off:

```json
{
  "routes": [
    { "source": "^/(sap/bc/z2ui5.*)$", "target": "$1", "destination": "srv-api", "csrfProtection": false },
    { "source": "^/(.*)$", "target": "$1", "destination": "srv-api", "csrfProtection": true }
  ]
}
```

That is not an open door: authentication still applies, and abap2UI5 refuses a
cross-origin POST itself — it compares `Origin` (or `Referer`) with the host,
or with the `X-Forwarded-Host` the approuter sets, and answers `403` on a
mismatch (measured against approuter 23.0.0 run locally without xsuaa). Leave
`check_csrf_active` on in your [user exit](../guide/user-exit#csrf) when you
use it.
:::

Either way the framework's own CSRF gate stays in front of the apps: leave
`check_csrf_active` on in your [user exit](../guide/user-exit#csrf).

## Scale-to-zero and restarts

Both are fine, and tested rather than argued: a process can be **SIGKILLed
mid-session** and a fresh one continues it, navigation stack included. See
[Persistence & Sessions](../guide/persistence). The exception is the session
of a stateful ABAP app, which lives in the process — see [Scaling](#scaling).

## Health

The roundtrip route requires an authenticated user by default, so it is a poor
health probe. Use CAP's own (`/health`) or a service of yours.

## Next

- [**Configuration**](./configuration) — routes, authentication, the runtime
- [**Database Model**](./database) — what lands in the HDI container
