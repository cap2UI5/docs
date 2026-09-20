# Why cap2UI5?

[What is cap2UI5?](./what-is-cap2ui5) explains the pattern and the gap it closes. This page is the concrete case: what changes **in your project** when a UI stops being a second project — for CAP developers who are tired of the tooling overhead, the duplicated data modeling and the XML maintenance.

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
├── package.json                     # ← + 1 dependency: cap2ui5
└── srv/
    └── apps/
        └── my_app.js                # ← your app. One file.
```

Nothing else. No service definition to extend, no `server.js` to touch, no
frontend folder: the route, the UI5 shell and the draft entity arrive with the
plugin, and `cds deploy` creates the table next to your own.

A new UI = **a new JS file in `srv/apps/`**. Available immediately via `?app_start=ZCL_MY_APP` — the name you gave `defineApp`.

## Concrete advantages

### 1. Unified language & tooling

You spend the entire time in **JavaScript** (or TypeScript, if you prefer). No XML editor, no UI5 CLI, no second `npm install`. Your existing `cds watch` workflow is enough.

```bash
npx cds watch
# → CAP server runs on :4004
# → open /z2ui5/webapp/index.html?app_start=my_app → done
```

### 2. Server state = app state

A cap2UI5 app is a **class with fields**. These fields are your state:

```js
class CustomerEdit extends z2ui5_if_app {

  customer_id   = "";
  customer_data = {};
  is_dirty      = false;
  validation    = { name: "None", email: "None" };

  async main(c) { /* ... */ }
}
```

After every roundtrip the entire instance is **persisted automatically in the CDS entity `cap2ui5.Drafts`**. On the next roundtrip it is rebuilt, the browser's model is applied, and `main(c)` runs again. You don't need to manage a JSONModel, write a reducer, or build a "service worker" for offline state — the server holds everything.

### 3. Bindings without a model

This is the core pattern that makes cap2UI5 (and abap2UI5) lightweight code in the first place:

```js
`<Input value="${c.bind("name")}"/>`
```

`c.bind("name")` returns the UI5 binding path for that field. Binding is two-way: when the user types, the value arrives on `this.name` **before** your next `main(c)` runs. No JSONModel, no property mapping, no sync code.

(In abap2UI5 the ABAP call passes the attribute itself and the framework matches it by reference. JavaScript cannot do that — two empty strings are indistinguishable — so the facade takes the field name instead.)

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
  if (c.isDisplay) {
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

The trade-offs are listed on [What is cap2UI5?](./what-is-cap2ui5#the-gap) — offline, pixel-perfect design systems, read-heavy filtering. One of them is worth a second sentence here, because it is the one that bites in a CAP project: a **live search filter over millions of rows** sends every keystroke's filter change to the server, where a Fiori Elements list filters locally in the JSONModel or pages server-side through the OData driver. If that is your screen, use the OData model (see [set_odata_model](../examples/external-odata#where-the-data-goes)) or build that one screen with Fiori Elements.

For **UI-centric back-office apps**, which are the typical CAP use case, cap2UI5 is almost always the more ergonomic choice.

→ Continue with the [**Quickstart**](./getting-started) or the architecture reference at [Architecture](../reference/architecture).
