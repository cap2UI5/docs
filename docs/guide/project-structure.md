# Project Structure

A cap2UI5 project is a **completely ordinary CAP project** with two additional building blocks: the `z2ui5/` framework folder under `srv/` and the static frontend bundle under `app/z2ui5/`. This page shows what lives where and why.

## Top level

```
cap2UI5/
├── app/
│   └── z2ui5/                  # ← static UI5 frontend (read-only)
├── db/
│   └── schema.cds              # ← persistence table z2ui5_t_01
├── srv/
│   ├── cat-service.cds         # ← CDS service definitions
│   ├── cat-service.js          # ← service handlers
│   ├── server.js               # ← CAP bootstrap
│   ├── samples/                # ← your apps
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

One line to wire the action up to the framework handler. You can add any additional service handlers here; they continue to run normally.

## `srv/server.js` — the bootstrap

```js
const cds = require("@sap/cds");
const z2ui5_cl_app_index_html = require("./z2ui5/01/03/z2ui5_cl_app_index_html");

cds.on("bootstrap", (app) => {
  app.get("/rest/root/z2ui5",  (_req, res) => {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(z2ui5_cl_app_index_html.get_source());
  });

  app.head("/rest/root/z2ui5", (_req, res) => {
    res.set("X-CSRF-Token", "disabled");
    res.status(200).end();
  });
});

module.exports = cds.server;
```

This is needed because CDS REST actions **only understand POST**. The **GET** delivers the bootstrap HTML that loads the UI5 bundle; the **HEAD** answers the CSRF prefetch.

## `db/schema.cds` — the persistence

```cds
namespace my.domain;

entity z2ui5_t_01 {
  key id      : UUID;
  id_prev     : UUID;
  data        : LargeString;
}
```

This is where the **serialized app instances** land between roundtrips. Every roundtrip response contains the new `id`, which the frontend sends along on the next call — the server uses it to load the app and apply the frontend delta.

→ Details in [Database Model](../reference/database).

## `srv/z2ui5/` — the framework

```
srv/z2ui5/
├── 00/03/z2ui5_cl_util.js               # RTTI / class lookup
├── 01/01/z2ui5_cl_core_srv_draft.js     # serialize / DB persistence
├── 01/02/                               # core logic
│   ├── z2ui5_cl_core_handler.js         # roundtrip orchestrator
│   ├── z2ui5_cl_core_action.js          # app resolution
│   ├── z2ui5_cl_core_app.js             # lifecycle helper
│   ├── z2ui5_cl_core_client.js          # the client class (your API)
│   ├── z2ui5_cl_core_srv_bind.js        # _bind / _bind_edit implementation
│   ├── z2ui5_cl_core_srv_event.js       # _event string builder
│   ├── z2ui5_cl_core_srv_model.js       # XX delta + response model
│   └── z2ui5_if_core_types.js           # constants container
├── 01/03/                               # bootstrap assets as a JS module
│   └── z2ui5_cl_app_index_html.js
└── 02/                                  # public API
    ├── z2ui5_if_app.js                  # base class for apps
    ├── z2ui5_cl_http_handler.js         # CDS action adapter
    ├── z2ui5_cl_xml_view.js             # ViewBuilder
    ├── z2ui5_cl_xml_view_cc.js          # custom control decorator
    ├── z2ui5_cl_app_startup.js          # built-in launcher
    └── z2ui5_cl_app_hello_world.js      # mini example
```

The numbering `00/`, `01/`, `02/` mirrors the abap2UI5 layering:

- **`00/`** — pure utilities, no dependencies into the system
- **`01/`** — core plumbing (persistence, handler, binding engine, HTML bootstrap)
- **`02/`** — everything that app developers **import directly**: `z2ui5_if_app`, `z2ui5_cl_xml_view`, the HTTP adapter

As an app developer you almost always only need to know these two imports:

```js
const z2ui5_if_app      = require("../z2ui5/02/z2ui5_if_app");
const z2ui5_cl_xml_view = require("../z2ui5/02/z2ui5_cl_xml_view");
```

::: warning Hands off `01/`
The `01/` layer is maintained as a 1:1 port from abap2UI5. Any changes there will be overwritten on the next sync.
:::

## `srv/samples/` — your apps

A flat folder of `*.js` files, each containing _one_ app class. Convention: **file name = class name**. The lookup (`z2ui5_cl_util.rtti_get_class`) finds anything under:

- `srv/z2ui5/02/`  (framework apps)
- `srv/z2ui5/02/01/` (pop helpers)
- `srv/samples/`     (your apps)

You can't trivially change this lookup path without patching `_findAppFile` in `z2ui5_cl_core_srv_draft.js` — ideally maintain your apps under `srv/samples/` or extend the lookup.

## `app/z2ui5/` — the frontend

A **finished, static** UI5 bundle that is copied from [abap2UI5](https://github.com/abap2UI5/abap2UI5) via a CI pipeline (`npm run mirror_frontend`). You don't touch it. Bundle updates flow in automatically.

```
app/z2ui5/
└── webapp/
    ├── index.html              # replaced with z2ui5_cl_app_index_html.get_source()
    ├── manifest.json           # replaced with a cap2UI5-specific manifest
    ├── Component.js
    ├── controller/
    ├── view/
    └── ... (UI5 custom controls, action handlers, etc.)
```

The mirror workflow replaces **only** `index.html` and `manifest.json` with the cap2UI5 versions from `app/backup/`; everything else stays 1:1 with the abap2UI5 repo.

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

You can declare external services as usual and call them from your app via `cds.connect.to(...)`. See the Northwind example under [External OData](../examples/external-odata).

→ Continue to the [**App Lifecycle**](./lifecycle).
