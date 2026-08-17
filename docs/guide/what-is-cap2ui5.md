# What is cap2UI5?

**cap2UI5** lets you build complete SAPUI5 applications **inside your CAP backend (Node.js)** — as plain JavaScript classes. No separate frontend project, no hand-written XML views, no `manifest.json`, no second build pipeline. One class in `srv/` = one app.

It is the CAP/Node.js twin of [abap2UI5](https://github.com/abap2UI5/abap2UI5), a popular open-source framework from the ABAP world. Never heard of abap2UI5? That's expected — it lives on the other side of the SAP fence. The short version: it lets ABAP developers write UI5 apps purely in ABAP, and it's been very successful at that. cap2UI5 brings the exact same concept to CAP. The full story is on [Where cap2UI5 comes from](./where-it-comes-from).

## The core idea

In classical UI5 development you maintain **two worlds in parallel**:

| | Backend (CAP) | Frontend (UI5) |
|---|---|---|
| Language | JS / TS | JS + XML + i18n |
| Build | `cds build` | `ui5 build` |
| State | DB / service handlers | JSONModel / controller |
| Routing | CAP service | manifest.json + router |
| Data | CDS entities | OData bindings |

That works — but every small workflow passes through three layers (service → OData → controller → view), and the "small admin UI" you wanted to build in an afternoon starts with an hour of project setup.

cap2UI5 turns this around: **your CAP backend builds the view** and exchanges state with the frontend automatically. The frontend is a finished, generic UI5 app that you never touch — on every roundtrip it receives view XML plus a JSON model from the server and renders it. This pattern is called **server-driven UI**; if it's new to you, read [Server-Driven UI, Explained](./server-driven-ui) first — it also covers which gap this closes between Fiori Elements and freestyle UI5.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser ──── generic UI5 frontend (from abap2UI5) ───────  │
│      ▲                                                      │
│      │  POST /rest/root/z2ui5  { S_FRONT, XX, MODEL }       │
│      ▼                                                      │
│  CAP server ─── your app class → main(client) ────────────  │
│      └─ z2ui5_cl_xml_view.factory().Page().Input()...       │
│      └─ client.view_display(view.stringify())               │
│      └─ state persisted in CDS entity z2ui5_t_01            │
└─────────────────────────────────────────────────────────────┘
```

## What you write

A cap2UI5 app is **a single JavaScript class** extending `z2ui5_if_app`:

```js
const z2ui5_if_app      = require("abap2UI5/z2ui5_if_app");
const z2ui5_cl_xml_view = require("abap2UI5/z2ui5_cl_xml_view");

class my_hello_world extends z2ui5_if_app {

  name = "";        // ← app state, persisted automatically

  async main(client) {
    if (client.check_on_init()) {
      // first call: render the view
      const view = z2ui5_cl_xml_view.factory()
        .Shell()
        .Page({ title: "Hello World" })
          .Input({  value: client._bind_edit(this.name) })
          .Button({ text: "Send", press: client._event("BUTTON_POST") });
      client.view_display(view.stringify());

    } else if (client.check_on_event("BUTTON_POST")) {
      // button clicked: this.name already contains the user's input
      client.message_box_display(`Hello, ${this.name}!`);
    }
  }
}
module.exports = my_hello_world;
```

That's the whole app. No `manifest.json`, no `Component.js`, no controller file, no i18n setup. The class fields are your state, `main(client)` is your logic, and the view builder produces the UI.

::: tip About those class names
`z2ui5_cl_ui5_view_builder`, `check_on_init`, `_bind_edit` — the naming comes from abap2UI5's ABAP conventions and is kept intentionally, so every abap2UI5 sample and doc maps 1:1 to cap2UI5. It looks unusual in JS at first; you get used to it within an hour.
:::

## What cap2UI5 is _not_

- **Not a UI5 replacement.** It *uses* UI5, in its full breadth — Page, Table, SimpleForm, charts, file upload, camera, geolocation. Only the view *definition* moves to the server.
- **Not a replacement for CAP services.** Your `srv/*.cds` services keep running unchanged. cap2UI5 is one additional REST action alongside them; OData consumers never see it.
- **Not classical server-side rendering.** The server sends view XML + a JSON delta, not finished HTML pages — see [Server-Driven UI, Explained](./server-driven-ui).
- **Not a big framework dependency.** It's a pattern plus a vendored library package (`core/`) that travels inside your CAP project.

## The moving parts

| Piece | Where | Who touches it? |
|---|---|---|
| Backend library (handler, view builder, persistence) | [`cap2UI5/cap2UI5`](https://github.com/cap2UI5/cap2UI5) → `core/srv/z2ui5/` | nobody — carried along as-is |
| Your apps | `srv/app/` or your own folder | **you** — this is where you work |
| Static UI5 frontend | `app/z2ui5/webapp/` — mirrored 1:1 from [abap2UI5](https://github.com/abap2UI5/abap2UI5) | nobody — synced automatically |

The frontend is **wire-format compatible** with abap2UI5: the browser cannot tell whether ABAP or Node.js answers. Every upstream frontend improvement flows into cap2UI5 automatically via a [sync pipeline](./where-it-comes-from#how-the-port-actually-works).

## When is cap2UI5 the right choice?

✅ **Internal tools, admin backends, workflow apps** — quickly assembled, one developer is enough, no frontend build setup.
✅ **Migration and data-maintenance UIs** — you're writing CAP services anyway and need a small UI on top.
✅ **Prototyping** — from idea to clickable UI in minutes; try it in the [browser playground](./playground) right now.
✅ **Wizards and state-heavy flows** — the next screen depends on previous inputs? That's an `if` statement here, not an annotation puzzle.

❌ **High-volume read-only lists** with complex OData filtering — Fiori Elements is better there.
❌ **Offline apps** — cap2UI5 is server-driven, one roundtrip per interaction.
❌ **Pixel-perfect custom design systems** — the view builder maps the UI5 standard.

→ Continue with [**Why cap2UI5?**](./why-cap2ui5) for the technical case, or jump straight to the [**Quickstart**](./getting-started).
