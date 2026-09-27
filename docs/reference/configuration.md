# Configuration

Everything the plugin reads lives under `cds.cap2ui5` and is a plain CAP
configuration value: `package.json#cds`, a `.cdsrc.json`, an environment
variable, a profile — whatever you already use.

## The defaults

These ship in the plugin's own `package.json` and apply until you override one:

```json
{
  "cds": {
    "cap2ui5": {
      "apps": "srv/apps",
      "requires": "authenticated-user",
      "routes": ["/sap/bc/z2ui5", "/rest/root/z2ui5"]
    }
  }
}
```

| key | what it does |
|---|---|
| `apps` | the directory scanned for app modules, relative to `cds.root`. Every `.js`/`.mjs`/`.cjs` in it is imported once the runtime is up. A project without the directory simply has no JavaScript apps |
| `requires` | the role the route demands. `null` lets anonymous callers in — read the box below first |
| `routes` | the paths the roundtrip answers on. Both defaults exist so that a frontend or a bookmark written for either name works. A GET on a route answers with the page that embeds the whole UI5 frontend — there is no separate static route to configure |

## Overriding

In your project's `package.json`:

```json
{
  "cds": {
    "cap2ui5": {
      "apps": "srv/ui",
      "routes": ["/ui5"]
    }
  }
}
```

or per profile, the usual CAP way:

```json
{ "cds": { "[production]": { "cap2ui5": { "requires": "MyUi5Role" } } } }
```

## Authentication — and what `null` costs

The route runs **behind CAP's own middleware chain**, so whatever
`cds.requires.auth` is configured to has already identified the caller by the
time the plugin's guard decides. That is not a detail: `cds.context`, and with
it `cds.context.user`, only exists where CAP's middlewares ran.

The guard is one line: the caller must satisfy `cap2ui5.requires`.

::: warning Setting `requires: null` opens more than the door
With `null`, every caller is CAP's anonymous user — and the draft store binds
each session to `cds.context.user.id`. So *all* anonymous visitors share one
owner and therefore each other's sessions. That is the documented consequence
of turning authentication off, not a defect, but a public demo and a shared
staging system are very different things.
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

`cap2ui5` depends on `@abap2ui5/node-runtime` **pinned exactly** — `1.145.0`
for `cap2ui5` 0.1.0 — so `npm install cap2ui5` already gives you one known
runtime release. There is nothing to add to your own `package.json`.

The plugin resolves the runtime from **your project** (`cds.root`) first and
only then from its own location, and logs what it found at startup:

```
[cap2ui5] @abap2ui5/node-runtime 1.145.0 from …/node_modules/@abap2ui5/node-runtime
```

Backend, UI5 frontend and wire protocol version come from that one package,
which is what makes a frontend/backend mismatch impossible. See
[HTTP Protocol](./protocol).

## What the plugin does not configure

Everything the **framework** decides about a response — the UI5 bootstrap URL,
the Content-Security-Policy, the security headers, the theme, the draft expiry
and the CSRF gate — is not a `cds.cap2ui5` option. It comes from the user
exit, registered with `defineExit`:

```js
// srv/apps/exit.js
import { defineExit } from "cap2ui5";

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
