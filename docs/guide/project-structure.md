# Project Structure

A cap2UI5 project is a **completely ordinary CAP project** with two additional building blocks: the `z2ui5/` framework folder under `srv/` and the static frontend under `app/z2ui5/`. This page shows what lives where and why.

## Top level

```
cap2UI5/
├── app/
│   └── z2ui5/                  # ← static UI5 frontend (read-only, synced)
├── db/
│   └── schema.cds              # ← persistence table z2ui5_t_01
├── srv/
│   ├── cat-service.cds         # ← CDS service definitions
│   ├── cat-service.js          # ← service handlers
│   ├── server.js               # ← CAP bootstrap
│   ├── samples/                # ← demo apps + a good place for your own
│   └── z2ui5/                  # ← framework library
├── mta.yaml                    # ← Cloud Foundry deployment
├── xs-security.json
└── package.json
```

## `srv/cat-service.cds` — the service

The file declares two services. The first (`AdminService`) is optional — it is the "normal" CDS interface for external OData consumers. The second (`rootService`) is the **heart of cap2UI5**:

```cds
@protocol: 'rest'
service rootService {

    @open
    type object {};

    action z2ui5(value : object) returns object;

}
```

A single action `z2ui5(value)` — the entire roundtrip runs through here. CAP itself automatically exposes it under `POST /rest/root/z2ui5`.

→ More in [HTTP Protocol](../reference/protocol).

## `srv/cat-service.js` — the handler

```js
const cds = require("@sap/cds");
const z2ui5_cl_http_handler = require("./z2ui5/02/z2ui5_cl_http_handler");

module.exports = cds.service.impl(async function (srv) {
  srv.on("z2ui5", z2ui5_cl_http_handler);
  // … your own READ/CREATE/etc. handlers go here
});
```

One line wires the action up to the framework handler. Any additional service handlers you add here continue to run normally.

## `srv/server.js` — the bootstrap

CDS REST actions only understand POST, so `server.js` registers two extra routes on CAP's `bootstrap` event:

- `GET /rest/root/z2ui5` — delivers the bootstrap HTML (with security headers, theme, and CSP resolved through the framework's exit/config mechanism, mirroring abap2UI5's `_http_get`)
- `HEAD /rest/root/z2ui5` — answers the frontend's CSRF prefetch

You rarely need to touch this file — except to [register your own app directories](#srv-samples-your-apps-and-the-demos).

## `db/schema.cds` — the persistence

```cds
namespace my.domain;

entity z2ui5_t_01 {
  key id      : UUID;
  id_prev     : UUID;
  data        : LargeString;
}
```

This is where the **serialized app instances** land between roundtrips. Every response contains the new `id`, which the frontend sends along on the next call — the server uses it to reload the app and apply the frontend delta.

→ Details in [Database Model](../reference/database).

## `srv/z2ui5/` — the framework

```
srv/z2ui5/
├── 00/                                  # pure utilities (ajson, sorting, util)
│   └── 03/z2ui5_cl_util.js              # RTTI / class lookup / app registry
├── 01/                                  # core plumbing
│   ├── 01/z2ui5_cl_core_srv_draft.js    # serialize / DB persistence
│   ├── 02/z2ui5_cl_core_handler.js      # roundtrip orchestrator
│   ├── 02/z2ui5_cl_core_client.js       # the client class (your API)
│   ├── 02/z2ui5_cl_core_srv_bind.js     # _bind / _bind_edit implementation
│   ├── 02/…                             # action, model, event services
│   └── 03/z2ui5_cl_app_index_html.js    # bootstrap HTML as a JS module
├── 02/                                  # public API
│   ├── z2ui5_if_app.js                  # base class for apps
│   ├── z2ui5_cl_http_handler.js         # CDS action adapter
│   ├── z2ui5_cl_xml_view.js             # view builder
│   ├── z2ui5_cl_xml_view_cc.js          # custom control decorator
│   ├── z2ui5_cl_app_startup.js          # built-in launcher
│   ├── z2ui5_cl_app_hello_world.js      # mini example
│   └── 01/z2ui5_cl_pop_*.js             # popup helpers
└── register-apps.js                     # convenience hook for external app repos
```

The numbering `00/`, `01/`, `02/` mirrors the abap2UI5 layering (see [Where cap2UI5 comes from](./where-it-comes-from)):

- **`00/`** — pure utilities, no dependencies into the system
- **`01/`** — core plumbing (persistence, handler, binding engine, HTML bootstrap)
- **`02/`** — everything app developers **import directly**

As an app developer you almost always need exactly two imports, via the project's package exports:

```js
const z2ui5_if_app      = require("abap2UI5/z2ui5_if_app");
const z2ui5_cl_xml_view = require("abap2UI5/z2ui5_cl_xml_view");
```

(The package is named `abap2UI5` — Node's self-reference feature makes these exports available inside the project itself, and external app repos can depend on it the same way.)

::: warning Hands off the framework tree
`srv/z2ui5/` is maintained as a port of abap2UI5 and updated by the [sync pipeline](./where-it-comes-from#how-the-port-actually-works). Treat it as a library: read it, learn from it, but don't edit it.
:::

## `srv/samples/` — your apps and the demos

A flat folder of `*.js` files, each containing _one_ app class. Convention: **file name = class name**.

It ships with hundreds of `z2ui5_cl_demo_app_*` classes — the transpiled [abap2UI5 samples](https://github.com/abap2UI5/samples), a live cookbook you can start via `?app_start=z2ui5_cl_demo_app_001` etc. Note that the sync pipeline owns these files: they are overwritten on every upstream sync. Your **own** files with other names are safe, but for real projects a separate folder is cleaner.

The class lookup searches, in order:

1. Framework built-ins (`srv/z2ui5/02/`, `srv/z2ui5/02/01/`)
2. The bundled `srv/samples/` folder
3. Directories registered at runtime via `z2ui5_cl_util.register_app_dir(dir)` — or the shortcut `require("abap2UI5/register-apps")(dir)`
4. Directories in the `Z2UI5_APP_DIRS` environment variable (path-separated list)

All directories are searched **recursively**, so you can organize your apps in subfolders. There is also `z2ui5_cl_util.register_app_class(name, Cls)` to register a class directly without any filesystem lookup — that's the hook the [browser playground](./playground) uses.

## `app/z2ui5/` — the frontend

A **finished, static** UI5 webapp, mirrored 1:1 from [abap2UI5](https://github.com/abap2UI5/abap2UI5)'s `app/webapp` folder by the sync pipeline. You don't touch it; upstream updates flow in automatically. CAP serves it at `/z2ui5/webapp/`.

Only two values are cap2UI5-specific and get patched in during the sync (no locally maintained copies):

- the UI5 **CDN bootstrap URL** in `index.html`
- the **`/rest/root/z2ui5` data source** in `manifest.json`

## `package.json` — the configuration

Look at the `cds.requires` block:

```json
"cds": {
  "requires": {
    "northwind": {
      "kind": "odata-v2",
      "model": "srv/external/northwind",
      "credentials": {
        "url": "https://services.odata.org/V2/Northwind/Northwind.svc/"
      }
    }
  },
  "destinations": true,
  "html5-repo": true,
  "workzone": true
}
```

You declare external services as usual and call them from your apps via `cds.connect.to(...)`. See the Northwind example under [External OData](../examples/external-odata).

Also note the `exports` map at the top of `package.json` — it's what makes the `require("abap2UI5/…")` imports work, both inside the project and for external app repositories.

→ Continue to the [**App Lifecycle**](./lifecycle).
