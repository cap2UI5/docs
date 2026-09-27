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
| **The entity** | `cap2ui5.Drafts` deploys through your normal `db` module, HDI container included. Nothing special |
| **Authentication** | whatever `cds.requires.auth` is — the route runs behind CAP's own chain. Verified for `jwt`, `xsuaa` and `ias`, not only for the development kinds |
| **Scaling** | app state is in the database, not in memory, so a second instance is a second instance. No sticky sessions, no shared cache |
| **The runtime** | `cap2ui5` pins `@abap2ui5/node-runtime` exactly (`1.145.0` for 0.1.0). Commit your `package-lock.json` and a redeploy installs the same release |

## Pin the plugin

```json
{ "dependencies": { "cap2ui5": "^0.1.0" } }
```

`cap2ui5` is on npm, and it depends on one exact `@abap2ui5/node-runtime`
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

### The approuter needs one extra route today

`cds add xsuaa,approuter` (cds-dk 10.1) writes `.deploy/app-router/xs-app.json`
with a single catch-all route:

```json
{
  "routes": [
    { "source": "^/(.*)$", "target": "$1", "destination": "srv-api", "csrfProtection": true }
  ]
}
```

With that route **every roundtrip is refused**. `@sap/approuter` requires an
`x-csrf-token` header on every request other than GET and HEAD to an
authenticated route whose `csrfProtection` is not `false`, and answers
`403` with `x-csrf-token: Required` otherwise (read in approuter 23.0.0,
`lib/middleware/xsrf-token-handler.js`). The abap2UI5 frontend up to and
including runtime `1.145.0` — the release `cap2ui5` 0.1.0 pins — sends no
such token. The first page loads, because it is a GET; the first click fails.

What works today is a route for the roundtrip path **in front of** the
catch-all, with the approuter's token check off:

```json
{
  "routes": [
    { "source": "^/(sap/bc/z2ui5.*)$", "target": "$1", "destination": "srv-api", "csrfProtection": false },
    { "source": "^/(.*)$", "target": "$1", "destination": "srv-api", "csrfProtection": true }
  ]
}
```

Add the same route for `rest/root/z2ui5` if your frontend or bookmarks use that
path, and adjust both if you changed `cds.cap2ui5.routes`.

This is not an open door. Authentication still applies — the route sets no
`authenticationType`, so the approuter's default applies, and the plugin's own
guard runs behind it either way — and abap2UI5
refuses a cross-origin POST itself: it compares the request's `Origin` (or
`Referer`) against the host, or against the `X-Forwarded-Host` the approuter
sets, and answers `403` on a mismatch. Measured against approuter 23.0.0 run
locally without xsuaa: the roundtrips pass, and a POST with a foreign `Origin`
gets `403`. That protection is the framework's CSRF gate, so leave
`check_csrf_active` on in your [user exit](../guide/user-exit#csrf) when you
use this route.

::: info Pending upstream: abap2UI5/abap2UI5#2802
That pull request (open, not merged) teaches the frontend the standard
`X-CSRF-Token` fetch-and-send handshake. Once `cap2ui5` pins a runtime release
that carries it, the extra route can go and the generated catch-all works as
it is. Until then, keep the route above.
:::

## Scale-to-zero and restarts

Both are fine, and tested rather than argued: a process can be **SIGKILLed
mid-session** and a fresh one continues it, navigation stack included. See
[Persistence & Sessions](../guide/persistence).

## Health

The roundtrip route requires an authenticated user by default, so it is a poor
health probe. Use CAP's own (`/health`) or a service of yours.

## Next

- [**Configuration**](./configuration) — routes, authentication, the runtime
- [**Database Model**](./database) — what lands in the HDI container
