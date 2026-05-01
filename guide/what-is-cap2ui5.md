# What is cap2UI5?

**cap2UI5** is a framework that lets you write complete SAPUI5 applications directly in your **CAP backend (Node.js)** — as plain JavaScript classes. No separate frontend project, no hand-crafted XML, no duplicated data modeling.

If you know the term [abap2UI5](https://github.com/abap2UI5/abap2UI5): cap2UI5 is **the same concept**, but instead of an ABAP backend it sits on top of [SAP Cloud Application Programming Model (CAP)](https://cap.cloud.sap/) on Node.js.

## The core idea

In classical UI5 development you maintain **two worlds in parallel**:

| | Backend (CAP) | Frontend (UI5) |
|---|---|---|
| Language | JS / TS | JS + XML + i18n |
| Build | `cds build` | `ui5 build` |
| State | DB / service handlers | JSONModel / controller |
| Routing | CAP service | manifest.json + router |
| Data | CDS entities | OData bindings |

That works — but it means every small workflow has to pass through **three layers**: service → OData → controller → view. With Fiori Elements you get generation, but lose flexibility.

cap2UI5 turns that around: **your CAP backend renders the view** and exchanges state with the frontend automatically. The frontend is a finished, static UI5 app that you no longer touch — it receives the XML from the server on every roundtrip.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser  ─── static UI5 frontend (from abap2UI5) ─────────  │
│      ▲                                                      │
│      │  POST /rest/root/z2ui5  { S_FRONT, XX, MODEL }       │
│      ▼                                                      │
│  CAP server ─── your app class → main(client) ────────────  │
│      └─ z2ui5_cl_xml_view.factory().Page().Input()...       │
│      └─ client.view_display(view.stringify())               │
│      └─ persisted in CDS entity z2ui5_t_01                  │
└─────────────────────────────────────────────────────────────┘
```

## What you write

A cap2UI5 app is **a single JavaScript class** that extends `z2ui5_if_app`:

```js
class z2ui5_cl_app_hello_world extends z2ui5_if_app {

  name = "";        // ← app state, persisted automatically

  async main(client) {
    if (client.check_on_init()) {
      // render view
      const view = z2ui5_cl_xml_view.factory()
        .Shell()
        .Page({ title: "Hello World" })
          .Input({  value: client._bind_edit(this.name) })
          .Button({ text: "Send", press: client._event("BUTTON_POST") });
      client.view_display(view.stringify());

    } else if (client.check_on_event("BUTTON_POST")) {
      // handle event
      client.message_box_display(`Hello, ${this.name}!`);
    }
  }
}
```

That's all. No `manifest.json`, no `Component.js`, no `View.controller.js`, no separate `i18n.properties`. The server sends XML + a model delta on every roundtrip, and the frontend renders it.

## What cap2UI5 is _not_

- **Not a UI5 killer.** It uses UI5 — even in its full breadth (Page, Table, SimpleForm, ChartJS, FileUploader, Geolocation, …). You only get the view definition back on the server.
- **Not a replacement for CAP services.** Your `srv/*.cds` services keep running. cap2UI5 runs _alongside_ them — as an additional CDS REST action. OData consumers (mobile, Excel, BTP) see nothing of it.
- **Not server-side rendering (SSR) in the classical sense.** It is a **server-driven UI** via JSON roundtrips, not hydration of an initial HTML.
- **Not a new framework.** It is a _pattern_ + a few thousand lines of JS that you carry along inside your CAP project.

## The two parts

| Repository | What | Who touches it? |
|---|---|---|
| [`cap2UI5/dev`](https://github.com/cap2UI5/dev) → folder `cap2UI5/srv/z2ui5/` | Backend library: handler, view builder, persistence | you build your apps here |
| [`abap2UI5/abap2UI5`](https://github.com/abap2UI5/abap2UI5) → folder `app/webapp/` | Static UI5 frontend | never (synced automatically) |

The frontend is **wire-format compatible** with abap2UI5 — meaning every patch there automatically comes over. The backend is the JS port of abap2UI5's handler architecture.

## When is cap2UI5 the right choice?

✅ **Internal tools, admin backends, workflow apps** — quickly assembled, one developer is enough, no frontend build setup.
✅ **Migration and data maintenance UIs** — when you're writing CAP services anyway and need a small UI for them.
✅ **Prototyping** — from idea to clickable UI in minutes.
✅ **Embedded configuration UIs** — e.g. a custom control panel for a larger Fiori app.
✅ **Apps with lots of dynamic view state** — e.g. wizards where the next screen depends on previous inputs.

❌ **High-frequency read-only lists** with complex OData filtering — Fiori Elements is better there.
❌ **Offline apps** — cap2UI5 is server-driven, one roundtrip per interaction.
❌ **Pixel-perfect custom designs** — the view builder maps UI5 standard.

→ Continue to [**Why cap2UI5?**](./why-cap2ui5) for the technical justification, or jump straight to the [**Quickstart**](./getting-started).
