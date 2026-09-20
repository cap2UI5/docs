# Deployment

A cap2UI5 project deploys like **any other CAP project**, because it is one.
The plugin adds a dependency, an entity and a route — nothing that needs its own
module, its own build step or its own pipeline.

::: warning What is verified here, and what is not
Everything on this page about the *plugin's* behaviour is measured: the entity,
the route, the shell, and the authentication chain under `xsuaa` and `ias`. The
Cloud Foundry topology below is the standard CAP one and has **not** been
exercised end to end for this plugin. Treat it as the shape to expect rather
than as a tested recipe, and tell us if it bites.
:::

## Locally

```bash
npx cds watch
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
| **The shell** | served by your CAP server from `node_modules/@abap2ui5/runtime/webapp`. There is no separate frontend project to build, no HTML5 module to push, no UI5 tooling in the pipeline |
| **The entity** | `cap2ui5.Drafts` deploys through your normal `db` module, HDI container included. Nothing special |
| **Authentication** | whatever `cds.requires.auth` is — the route runs behind CAP's own chain. Verified for `jwt`, `xsuaa` and `ias`, not only for the development kinds |
| **Scaling** | app state is in the database, not in memory, so a second instance is a second instance. No sticky sessions, no shared cache |
| **The runtime** | `@abap2ui5/runtime` is an ordinary dependency. **Pin it.** |

## Pin the runtime

```json
{ "dependencies": { "@abap2ui5/runtime": "1.144.0", "cap2ui5": "^0.1.0" } }
```

Backend, UI5 shell and wire version come from that one package. Pinning it is
what stops a redeploy from silently pairing your app with a different framework.

## Cloud Foundry (BTP)

The usual CAP modules, with one fewer than a hand-built UI5 app needs:

```yaml
modules:
  - name: my-srv                 # the CAP service — serves the apps AND the shell
  - name: my-db-deployer         # HDI container, incl. cap2ui5.Drafts
  - name: my-approuter           # if you want one in front

resources:
  - name: my-uaa                 # xsuaa
  - name: my-hdi                 # HANA
```

There is **no HTML5 module for the frontend** and no app-repo push, because the
shell is a static directory inside a dependency of the service.

If an approuter sits in front, route the two POST paths and the shell to the
CAP service:

```json
{
  "routes": [
    { "source": "^/sap/bc/z2ui5.*",  "destination": "srv-api", "authenticationType": "xsuaa" },
    { "source": "^/rest/root/z2ui5.*", "destination": "srv-api", "authenticationType": "xsuaa" },
    { "source": "^/z2ui5/webapp/.*", "destination": "srv-api", "authenticationType": "xsuaa" }
  ]
}
```

Adjust the paths if you changed `cds.cap2ui5.routes` or `webapp`.

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
