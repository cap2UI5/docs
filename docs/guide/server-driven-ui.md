# Server-Driven UI, Explained

cap2UI5 is built on an idea that most CAP developers have never worked with directly: **the server decides what the UI looks like**. This page explains that idea from scratch — no abap2UI5 or frontend knowledge required — and shows which gap it closes in the CAP world.

## How a "normal" UI5 app works

In a classic UI5/Fiori app (and in every React/Angular/Vue app, for that matter), the **browser owns the UI**:

1. The browser downloads your app: views, controllers, `manifest.json`, i18n files.
2. The JavaScript in the browser renders the screens.
3. Whenever data is needed, the browser calls your CAP service via **OData**.
4. UI state (which tab is open, what the user typed, which step of the wizard you're on) lives in the browser — in models, controllers, and component state.

This is called a **single-page application (SPA)**. The server is "just" a data supplier. Consequences for you as a CAP developer:

- You maintain **a second project** (the frontend) with its own build, its own `package.json`, its own release cycle.
- Every piece of data the UI needs must be **exposed as an OData service** — even throwaway state that has nothing to do with your data model.
- Logic gets **split across two worlds**: validation, visibility rules, and flow control exist once in the backend and once (at least partly) in the frontend.

## What "server-side rendering" means

Server-side rendering (SSR) is the opposite idea: **the server produces the UI**. It's actually the older model — PHP, JSP, and Rails apps have always worked this way: every click sends a request, the server builds the next page, the browser just displays it.

The trade is simple:

| | Client renders (SPA) | Server renders |
|---|---|---|
| UI logic lives | in the browser | on the server |
| Interaction | often local, instant | one request per interaction |
| Frontend project | yes, full build & tooling | none (or minimal) |
| State | split browser/server | in one place, on the server |
| Offline capable | possible | no |

Classical SSR fell out of fashion for business apps because full-page HTML reloads feel clunky. But there is a modern middle ground — and that's where cap2UI5 lives.

## Server-driven UI: the modern middle ground

cap2UI5 (like abap2UI5, its [origin](./where-it-comes-from)) uses a pattern called **server-driven UI**:

- The browser loads a **generic, static UI5 app** exactly once. It's always the same app, no matter what you build — think of it as a "UI5 player".
- On every interaction, the frontend sends **one POST request** to the server with the event that happened and the values the user changed.
- The server — your CAP application — runs your app class, builds the **view as XML** plus a **JSON data model**, and sends both back.
- The UI5 player renders whatever it receives.

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

So it is **not** classical SSR (no HTML pages are re-sent), and **not** an SPA (the browser doesn't own your UI logic). The browser renders; the server decides *what* to render. All your logic — views, events, state, flow — lives in **one place, in one language, in your CAP project**.

::: tip In one sentence
You write a JavaScript class in `srv/`, and a ready-made UI5 frontend renders whatever that class tells it to — one roundtrip per interaction.
:::

## The gap cap2UI5 closes

For UIs on top of CAP you had, until now, exactly two options:

1. **Fiori Elements** — you annotate your CDS entities and get generated List Reports and Object Pages. Fantastic for standard CRUD, but rigid: as soon as your UI is a wizard, a dashboard, an admin tool, or "it depends on what the user clicked", you fight the annotations.
2. **Freestyle UI5** — total freedom, but you pay full price: a separate frontend project, XML views, controllers, `manifest.json`, a second build pipeline, and duplicated state handling.

There was **nothing in between**: no lightweight way to get a free-form UI5 UI out of a few lines of backend code.

In the ABAP world the exact same gap existed — and the open-source project [abap2UI5](https://github.com/abap2UI5/abap2UI5) closed it there, very successfully: UI5 apps written purely in ABAP classes, no frontend artifacts to deploy. **cap2UI5 brings that same solution to CAP**: UI5 apps written purely in JavaScript classes inside your CAP project.

| | Fiori Elements | **cap2UI5** | Freestyle UI5 |
|---|---|---|---|
| Effort to first screen | low (if standard) | **minutes** | high |
| Flexibility | annotation-limited | **free-form logic in JS** | unlimited |
| Extra frontend project | generated `app/` folder | **none** | full project |
| Best for | standard CRUD lists | **tools, wizards, admin UIs** | pixel-perfect products |

## What this costs you

Server-driven UI is a trade-off, not magic. Be aware of:

- **Every interaction is a roundtrip.** A button click travels to the server and back. In a LAN or on BTP this is typically 50–200 ms — fine for business apps, wrong for offline apps or 60-fps interactions.
- **You're inside the UI5 control set.** Everything UI5 ships (tables, forms, charts, dialogs, …) is available; a fully custom design system is not the target.
- **Read-heavy filtering of huge lists** is better served by OData bindings and Fiori Elements.

For the typical internal tool, prototype, or workflow UI — the everyday work of a CAP team — the trade is heavily in your favor. The [Why cap2UI5?](./why-cap2ui5) page makes that case in detail.

→ Next: [**Where cap2UI5 comes from**](./where-it-comes-from) — the abap2UI5 story, or jump straight to the [**Quickstart**](./getting-started).
