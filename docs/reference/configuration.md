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

`"cap2ui5": false` under `cds.requires` switches the plugin off: no route, and
no `cap2ui5.Drafts` table in the model.

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

`@cap2ui5/cds-plugin` depends on `@abap2ui5/node-runtime` **pinned exactly** — `1.145.0`
for 0.3.0 — so `npm add @cap2ui5/cds-plugin` already gives you one known
runtime release. There is nothing to add to your own `package.json`.

The runtime resolves as the plugin's own dependency, at the pinned version.
To load another release, use npm `overrides` in your `package.json`. The log
names what was loaded at startup:

```
[cap2ui5] - @abap2ui5/node-runtime 1.145.0 from …/node_modules/@abap2ui5/node-runtime
```

Backend, UI5 frontend and wire protocol version come from that one package,
which is what makes a frontend/backend mismatch impossible. See
[HTTP Protocol](./protocol).

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

An unhandled error in the roundtrip answers `roundtrip failed (<id>)`, where
`<id>` is `cds.context.id`. The detail — the stack, the SQL, the entity names —
goes to the server log under the same id. That is deliberate: CDS and driver
messages carry entity names, SQL fragments and deployment paths, and none of it
belongs in an HTTP response.

## Next

- [**Deployment**](./deployment) — what changes when this leaves your laptop
- [**Database Model**](./database) — `cap2ui5.Drafts`
- [**The User Exit**](../guide/user-exit) — the CSP, the headers, the draft expiry
- [**Architecture**](./architecture) — how the pieces fit
