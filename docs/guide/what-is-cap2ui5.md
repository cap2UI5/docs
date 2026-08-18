# What is cap2UI5?

**cap2UI5** lets you build complete SAPUI5 applications **inside your CAP backend (Node.js)** — as plain JavaScript classes. No separate frontend project, no hand-written XML views, no `manifest.json`, no second build pipeline. One class in `srv/` = one app.

It is the CAP/Node.js twin of [abap2UI5](https://github.com/abap2UI5/abap2UI5), a popular open-source framework from the ABAP world. Never heard of abap2UI5? That's expected — it lives on the other side of the SAP fence. The short version: it lets ABAP developers write UI5 apps purely in ABAP, and it's been very successful at that. cap2UI5 brings the exact same concept to CAP. The full story, including how the two stay in sync, is on [Where cap2UI5 comes from](./where-it-comes-from).

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

cap2UI5 turns this around: **your CAP backend builds the view** and exchanges state with the frontend automatically.

## Server-driven UI, in one section {#server-driven-ui}

Most CAP developers have never worked with this pattern directly, so it is worth naming precisely.

In a classic UI5/Fiori app — and in every React/Angular/Vue app — the **browser owns the UI**. It downloads views, controllers, `manifest.json` and i18n files, renders the screens, and calls your CAP service via OData whenever it needs data. UI state (which tab is open, what the user typed, which wizard step you're on) lives in the browser. That is a **single-page application**, and the server is "just" a data supplier.

The opposite idea is **server-side rendering**: every click sends a request, the server builds the next page, the browser displays it. Older than the SPA — PHP, JSP and Rails always worked this way — and it fell out of fashion for business apps because full-page reloads feel clunky.

**Server-driven UI is the middle ground**, and it is what cap2UI5 (like abap2UI5) does:

- The browser loads a **generic, static UI5 app** exactly once. It is always the same app, no matter what you build — think of it as a "UI5 player".
- On every interaction the frontend sends **one POST request** with the event that happened and the values the user changed.
- The server — your CAP application — runs your app class, builds the **view as XML** plus a **JSON data model**, and sends both back.
- The player renders whatever it receives.

```
Browser                                 CAP server
┌───────────────────────┐              ┌──────────────────────────────┐
│  generic UI5 app      │              │  your app class (plain JS)   │
│  ("player", static,   │──── POST ───▶│  main(client) {              │
│   loaded once)        │   event +    │    ...build view, set data   │
│                       │   changed    │  }                           │
│  renders XML + model  │◀── response ─│  → view XML + JSON model     │
└───────────────────────┘              └──────────────────────────────┘
```

So it is **not** classical SSR (no HTML pages are re-sent) and **not** an SPA (the browser does not own your UI logic). The browser renders; the server decides *what* to render. Views, events, state and flow live in one place, in one language, in your CAP project.

| | Client renders (SPA) | Server-driven (cap2UI5) |
|---|---|---|
| UI logic lives | in the browser | on the server |
| Interaction | often local, instant | one roundtrip per interaction |
| Frontend project | yes, full build & tooling | none |
| State | split browser/server | in one place |
| Offline capable | possible | no |

## What you write

A cap2UI5 app is **a single JavaScript class** extending `z2ui5_if_app`:

```js
const z2ui5_if_app              = require("abap2UI5/z2ui5_if_app");
const z2ui5_cl_ui5_view_builder = require("abap2UI5/z2ui5_cl_ui5_view_builder");

class my_hello_world extends z2ui5_if_app {

  name = "";        // ← app state, persisted automatically

  async main(client) {
    if (client.check_on_init()) {
      // first call: render the view
      const view = z2ui5_cl_ui5_view_builder.factory()
        .ele({ n: `View`, ns: `mvc` })
        .a({ n: `xmlns`,     v: `sap.m` })
        .a({ n: `xmlns:mvc`, v: `sap.ui.core.mvc` });

      view.ele(`Shell`).ele(`Page`).a({ n: `title`, v: `Hello World` })
        .tag(`Input`).a({ n: `value`, v: client._bind_edit(this.name) })
        .tag(`Button`)
        .a({ n: `text`,  v: `Send` })
        .a({ n: `press`, v: client._event(`BUTTON_POST`) });

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

## The gap this closes {#the-gap}

For UIs on top of CAP you had, until now, exactly two options:

1. **Fiori Elements** — annotate your CDS entities and get generated List Reports and Object Pages. Excellent for standard CRUD, rigid as soon as your UI is a wizard, a dashboard or "it depends on what the user clicked".
2. **Freestyle UI5** — total freedom, full price: a separate frontend project, XML views, controllers, `manifest.json`, a second build pipeline, duplicated state handling.

There was **nothing in between** — no lightweight way to get a free-form UI5 UI out of a few lines of backend code. The same gap existed in the ABAP world, and abap2UI5 closed it there. cap2UI5 closes it for CAP.

| | Fiori Elements | **cap2UI5** | Freestyle UI5 |
|---|---|---|---|
| Effort to first screen | low (if standard) | **minutes** | high |
| Flexibility | annotation-limited | **free-form logic in JS** | unlimited |
| Extra frontend project | generated `app/` folder | **none** | full project |
| Best for | standard CRUD lists | **tools, wizards, admin UIs** | pixel-perfect products |

→ The honest, detailed comparison is on [cap2UI5 vs. Fiori Elements](./vs-fiori-elements).

## What cap2UI5 is _not_

- **Not a UI5 replacement.** It *uses* UI5, in its full breadth — Page, Table, SimpleForm, charts, file upload, camera, geolocation. Only the view *definition* moves to the server.
- **Not a replacement for CAP services.** Your `srv/*.cds` services keep running unchanged. cap2UI5 is one additional REST action alongside them; OData consumers never see it.
- **Not classical server-side rendering.** The server sends view XML + a JSON delta, not finished HTML pages.
- **Not a big framework dependency.** It's a pattern plus a vendored library package (`core/`) that travels inside your CAP project.

## When is cap2UI5 the right choice?

✅ **Internal tools, admin backends, workflow apps** — quickly assembled, one developer is enough, no frontend build setup.
✅ **Migration and data-maintenance UIs** — you're writing CAP services anyway and need a small UI on top.
✅ **Prototyping** — from idea to clickable UI in minutes; try it in the [browser playground](./playground) right now.
✅ **Wizards and state-heavy flows** — the next screen depends on previous inputs? That's an `if` statement here, not an annotation puzzle.

And what it costs, plainly:

❌ **Every interaction is a roundtrip.** A click travels to the server and back — typically 50–200 ms on a LAN or on BTP. Fine for business apps, wrong for offline apps or 60-fps interactions.
❌ **High-volume read-only lists** with complex OData filtering — Fiori Elements is better there, because the filtering stays in the OData driver.
❌ **Pixel-perfect custom design systems** — you are inside the UI5 control set.

## The moving parts

| Piece | Where | Who touches it? |
|---|---|---|
| Backend library (handler, view builder, persistence) | [`cap2UI5/cap2UI5`](https://github.com/cap2UI5/cap2UI5) → `core/srv/z2ui5/` | nobody — carried along as-is |
| Your apps | `srv/app/` or your own folder | **you** — this is where you work |
| Static UI5 frontend | `app/z2ui5/webapp/` — mirrored 1:1 from [abap2UI5](https://github.com/abap2UI5/abap2UI5) | nobody — synced automatically |

The frontend is **wire-format compatible** with abap2UI5: the browser cannot tell whether ABAP or Node.js answers. Every upstream frontend improvement flows into cap2UI5 automatically via a [sync pipeline](./where-it-comes-from#how-the-port-actually-works).

→ Continue with [**Why cap2UI5?**](./why-cap2ui5) for the case in your own project's terms, or jump straight to the [**Quickstart**](./getting-started).
