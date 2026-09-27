# Quickstart

From an empty directory to a clickable cap2UI5 app, with the commands exactly
as they run. cap2UI5 is a **CAP plugin**: you add it to a CAP project you
already have, or to a brand new one. There is no cap2UI5 project to clone.

## Prerequisites

- **Node.js ≥ 22** — `@abap2ui5/node-runtime`, which the plugin depends on,
  requires it (`cap2ui5` itself says ≥ 20)
- **`@sap/cds-dk`** installed globally, for the `cds` command
- Internet access — the page loads SAPUI5 from the SAP CDN

No database setup: CAP starts SQLite for you.

## 1. A CAP project and the plugin

Skip `cds init` if you already have a CAP project and run the `npm install cap2ui5`
line in it.

```bash
npm i -g @sap/cds-dk
cds init my-cap2ui5-app --nodejs --add tiny-sample
cd my-cap2ui5-app
npm install
npm install cap2ui5
```

Two things about `cds init` that cost time when missed. Without `--nodejs`,
`cds init` (cds-dk 10) writes no `package.json` at all, and there is nothing
to install the plugin into. And it fails in a folder whose name contains a
space.

`npm install cap2ui5` is the whole installation. It brings two packages from
npm — `cap2ui5` and the `@abap2ui5/node-runtime` release it pins — and on the
next `cds watch` these exist that did not before:

| | |
|---|---|
| the roundtrip route | `/sap/bc/z2ui5` and `/rest/root/z2ui5` — a GET on it answers with the page that embeds the whole UI5 frontend |
| `cap2ui5.Drafts` | a CDS entity for session state, created by `cds deploy` next to your own |

Your own `server.js`, if you have one, is not touched. Nothing is generated
into your repository, and there are no frontend files to serve.

## 2. Your first app

One file in `srv/apps/` — the directory the plugin scans:

```js
// srv/apps/hello.js
import { defineApp } from "cap2ui5";

defineApp("HELLO", class {
  name  = "";
  count = 0;

  main(c) {
    if (c.isDisplay) {
      c.view(
        `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" displayBlock="true" height="100%">` +
        `<Shell><Page title="My first cap2UI5 app">` +
        `<Input value="${c.bind("name")}"/>` +
        `<Text text="clicks: ${c.bind("count")}"/>` +
        `<Button text="Say hello" press="${c.event("GO")}" type="Emphasized"/>` +
        `</Page></Shell></mvc:View>`);
      return;
    }

    if (c.eventName === "GO") {
      this.count++;
      c.messageToast(`Hi, ${this.name}! You clicked ${this.count}x.`);
    }
  }
});
```

::: warning `import`, not `require` — in this project
`cds init --nodejs` creates an **ES module** project (`"type": "module"` in
`package.json`), so a `.js` file there must `import`. A `require("cap2ui5")`
in it does not fail on its own line: it fails the **whole runtime boot** —
the log says `[cap2ui5] runtime failed to boot: ReferenceError: require is not
defined in ES module scope`, and every roundtrip, for every app, answers 500
"roundtrip failed".

In a CommonJS project (no `"type": "module"`), or in a file ending in `.cjs`,
`const { defineApp } = require("cap2ui5")` is correct and works the same way.
The examples on this site use `import`, because that is what `cds init` gives
you.
:::

Four things worth knowing, and each of them is a rule rather than a style:

- **`main` is synchronous.** No `async`, no `await`. Make it `async` only when
  *your app* does I/O — reading your own entities with `await SELECT.from(Books)`.
- **`c.isDisplay` is the render branch, not `c.isFirstRun`.** `isDisplay` is
  also true every time the app gets the screen back from a navigation or a
  value help. An app that renders only on `isFirstRun` works perfectly until
  something navigates back into it, and then leaves the previous screen
  standing with no error anywhere. `isFirstRun` is for seeding state once.
- **State is ordinary fields.** `name = ""` and `count = 0` are the app's
  model; `c.bind("name")` binds one into the view. They survive the roundtrip
  because the plugin stores the instance in `cap2ui5.Drafts`.
- **The first argument of `defineApp` is the app's name on the wire** — it is
  what `?app_start=` takes. The file name does not matter.

## 3. Run it

```bash
cds watch
```

Once the server listens, the plugin prints every app with the address that
starts it, and the user to log in as:

```
[cap2ui5] HELLO  http://localhost:4004/sap/bc/z2ui5?app_start=HELLO
[cap2ui5] development login: alice (empty password)
```

Open that address. Those lines are the entry point: CAP's index page at
`http://localhost:4004/` lists the HTML files under `app/` and your CDS
services, not this route.

The address is the **roundtrip route**, not a static page: the framework
answers a GET on it with a page that embeds the whole UI5 component — every
module, view and stylesheet — and starts the app named in `app_start`.
`/rest/root/z2ui5?app_start=HELLO` is the same door under its other name.

You are asked to log in because the plugin requires an authenticated user by
default, and `cds watch` uses CAP's mocked auth. See
[Configuration](../reference/configuration) to open the route to anonymous
callers — and what that costs.

::: tip After you edit a file, reload the tab
`cds watch` restarts on every change, with a fresh in-memory database. A tab
that was open before the restart then answers
`NO_DRAFT_ENTRY_OF_PREVIOUS_REQUEST_FOUND` on its next click — its session was
a row in the database that no longer exists. Reload the page to start a new
one.
:::

## What you just built

A **stateful UI5 app** in one file that

- binds `name` two-way — you type, the server receives it;
- keeps `count` across roundtrips, because the state is a row in your
  database (`cap2ui5.Drafts`) rather than server memory;
- needed no OData service, no manifest, no controller, no frontend build.

## Reading your own data

The point of running inside CAP. `main` may be `async` when the app does I/O,
and `cds.ql` works exactly as it does in a handler:

```js
import cds from "@sap/cds";
import { defineApp, t } from "cap2ui5";
const { SELECT } = cds.ql;

defineApp("ZCL_BOOKS", class {
  search = "";
  books  = t.table({ ID: 0, title: "", price: t.packed(9, 2) });

  async main(c) {
    if (c.isDisplay) { c.view(/* … a Table bound to c.bind("books") … */); return; }

    if (c.eventName === "SEARCH") {
      const { Books } = cds.entities("my.bookshop");
      this.books = await SELECT.from(Books).where`title like ${"%" + this.search + "%"}`;
    }
  }
});
```

`t.table({…})` declares the row type; `t.packed(9, 2)` a decimal. The whole
tree — structures, tables, nested ones — goes through the draft and comes back
as plain values.

## Next steps

- [**Project Structure**](./project-structure) — what the plugin adds, and what stays yours
- [**App Lifecycle**](./lifecycle) — `isFirstRun` vs. `isDisplay`, events, navigation
- [**Data Binding**](./data-binding) — `c.bind`, tables, structures
- [**Persistence**](./persistence) — `cap2ui5.Drafts` and the owner binding
- [**Configuration**](../reference/configuration) — routes, the auth default, the apps directory
