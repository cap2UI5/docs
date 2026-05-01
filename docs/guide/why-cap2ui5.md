# Why cap2UI5?

This page is aimed at **CAP developers** who need to deliver UI5 apps but are tired of the tooling overhead, duplicated data modeling and XML maintenance.

## The problem in the classical world

Starting a "small" UI5 app on CAP today costs you:

```
my-cap-project/
├── srv/
│   ├── catalog-service.cds          # service definition
│   ├── catalog-service.js           # handler
│   └── ...
├── app/
│   └── catalog/
│       ├── webapp/
│       │   ├── Component.js         # ← boilerplate
│       │   ├── manifest.json        # ← boilerplate
│       │   ├── index.html           # ← boilerplate
│       │   ├── i18n/i18n.properties
│       │   ├── controller/
│       │   │   └── App.controller.js
│       │   ├── view/
│       │   │   └── App.view.xml     # ← maintain XML
│       │   └── model/
│       │       └── models.js
│       ├── package.json             # ← second npm world
│       ├── ui5.yaml                 # ← UI5 build tooling
│       └── xs-app.json
└── package.json
```

The **first clickable UI** easily costs you an hour of setup before you've written a single line of business logic. If a field name later changes, you have to touch _three_ places: CDS entity, service handler, view.

## What cap2UI5 changes

With cap2UI5 the structure shrinks to:

```
my-cap-project/
├── srv/
│   ├── cat-service.cds              # ← + 4 lines for the z2ui5 action
│   ├── cat-service.js               # ← + 1 line srv.on('z2ui5', handler)
│   ├── server.js                    # ← + bootstrap HTML mount
│   ├── samples/
│   │   └── my_app.js                # ← your app. One file.
│   └── z2ui5/                       # ← library (carried along unchanged)
└── app/
    └── z2ui5/                       # ← static frontend (carried along unchanged)
```

A new UI = **a new JS file in `srv/samples/`**. Available immediately via `?app_start=my_app`.

## Concrete advantages

### 1. Unified language & tooling

You spend the entire time in **JavaScript** (or TypeScript, if you prefer). No XML editor, no UI5 CLI, no second `npm install`. Your existing `cds watch` workflow is enough.

```bash
npx cds w
# → CAP server runs on :4004
# → open /rest/root/z2ui5 → done
```

### 2. Server state = app state

A cap2UI5 app is a **class with fields**. These fields are your state:

```js
class CustomerEdit extends z2ui5_if_app {

  customer_id   = "";
  customer_data = {};
  is_dirty      = false;
  validation    = { name: "None", email: "None" };

  async main(client) { /* ... */ }
}
```

After every roundtrip the entire instance is **persisted automatically in the CDS entity `z2ui5_t_01`**. On the next roundtrip it is deserialized, the frontend delta (XX) is applied, and `main()` runs again. You don't need to manage a JSONModel, write a reducer, or build a "service worker" for offline state — the server holds everything.

### 3. Reference-equality bindings

This is the core pattern that makes cap2UI5 (and abap2UI5) lightweight code in the first place:

```js
.Input({ value: client._bind_edit(this.name) })
```

`_bind_edit(this.name)` looks at your app instance to find **which property corresponds to the passed value** and returns the path as a UI5 binding expression `{/XX/name}`. When the user types, the value flows back through the delta into `this.name`. No manual mapping, no property strings, no sync code.

→ Details under [Data Binding](./data-binding).

### 4. No OData layer for UI purposes

In classical CAP you have to build an OData-capable entity for every field in the UI. With cap2UI5 the view is bound to your **server state** — which can be arbitrary JavaScript values, including nested structures that you would _never_ model as a CDS entity:

```js
this.wizard_state = {
  step: 2,
  inputs: { /* ... */ },
  errors: [],
  preview: { /* computed from inputs */ }
};
```

You use CDS entities where it **makes business sense** (master data, business data) — not because the UI insists on it.

### 5. External calls seamlessly

Inside `main()` you can do **anything** Node.js allows — including, of course, CAP connections:

```js
async main(client) {
  if (client.check_on_init()) {
    const northwind = await cds.connect.to("northwind");
    this.customers = await northwind.run(SELECT.from("Customers"));
    /* ... view ... */
  }
}
```

The server already knows auth, destinations, and all CDS services. **You don't have to tunnel anything through to the UI**, because the UI logic lives directly in the backend.

### 6. Secure by default

There is no "freely accessible" OData endpoint that exists for the UI. The only open endpoint is `POST /rest/root/z2ui5` — and it only accepts frontend events that the server has rendered. Server state that is not bound is also unreachable.

→ Compare to Fiori Elements: there every column of a SmartTable is an OData endpoint that an attacker can paginate through arbitrarily.

### 7. Fast initial rendering

The UI5 bundle is loaded once. After that every roundtrip returns only **a bit of XML + a JSON delta** — no component initialization, no second OData metadata round, no i18n roundtrip.

## Where it gets unfair

cap2UI5 doesn't solve every problem. Specifically:

- **Offline scenarios**: every interaction is a roundtrip. If you need to be offline-capable, write Fiori Elements or a classical UI5 setup.
- **Pixel designs outside UI5 standard**: the view builder knows `sap.m`, `sap.ui.layout`, `sap.tnt`, plus the z2ui5 custom controls. You can include your own foreign JS libraries — but with significantly more work.
- **Read-heavy lists** with live search filter over millions of rows: every filter change is a server roundtrip — that doesn't scale as well as OData bindings, which the frontend driver filters locally in the JSONModel.

For **UI-centric back-office apps**, which are the typical CAP use case, cap2UI5 is almost always the more ergonomic choice.

→ Continue with the [**Quickstart**](./getting-started) or the architecture reference at [Architecture](../reference/architecture).
