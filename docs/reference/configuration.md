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
      "routes": ["/sap/bc/z2ui5", "/rest/root/z2ui5"],
      "webapp": "/z2ui5/webapp"
    }
  }
}
```

| key | what it does |
|---|---|
| `apps` | the directory scanned for app modules, relative to `cds.root`. Every `.js`/`.mjs`/`.cjs` in it is imported once the runtime is up. A project without the directory simply has no JavaScript apps |
| `requires` | the role the route demands. `null` lets anonymous callers in — read the box below first |
| `routes` | the paths the roundtrip answers on. Both defaults exist so that a frontend or a bookmark written for either name works |
| `webapp` | where the UI5 shell is mounted, served straight from the runtime package |

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

`@abap2ui5/runtime` is resolved from **your project** (`cds.root`), not from
the plugin's own `node_modules`. The version you install is the version that
runs; the plugin only declares the range.

Pin it in production:

```json
{ "dependencies": { "@abap2ui5/runtime": "1.144.0" } }
```

Backend, UI5 shell and wire protocol version come from that one package, which
is what makes a frontend/backend mismatch impossible. See
[HTTP Protocol](./protocol).

## Errors

An unhandled error in the roundtrip answers `roundtrip failed (<id>)`, where
`<id>` is `cds.context.id`. The detail — the stack, the SQL, the entity names —
goes to the server log under the same id. That is deliberate: CDS and driver
messages carry entity names, SQL fragments and deployment paths, and none of it
belongs in an HTTP response.

## Next

- [**Deployment**](./deployment) — what changes when this leaves your laptop
- [**Database Model**](./database) — `cap2ui5.Drafts`
- [**Architecture**](./architecture) — how the pieces fit
