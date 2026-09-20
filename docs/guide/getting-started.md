# Quickstart

From an empty directory to a clickable cap2UI5 app. cap2UI5 is a **CAP plugin**:
you add it to a CAP project you already have, or to a brand new one. There is
no cap2UI5 project to clone.

## Prerequisites

- **Node.js ≥ 22**
- A CAP project (`cds init` makes one in seconds)
- Internet access — the frontend loads SAPUI5 from the SAP CDN

No database setup: CAP starts SQLite for you. No global installs.

## 1. A CAP project

Skip this if you already have one.

```bash
npm init -y && npm add @sap/cds @cap-js/sqlite
npx cds init
```

## 2. Add the plugin

```bash
npm add cap2ui5
```

That is the whole installation. On the next `cds watch` three things exist that
did not before:

| | |
|---|---|
| the roundtrip route | `/sap/bc/z2ui5` and `/rest/root/z2ui5` |
| the UI5 shell | `/z2ui5/webapp/` — served from the runtime package, not copied into your project |
| `cap2ui5.Drafts` | a CDS entity for session state, created by `cds deploy` next to your own |

Your own `server.js`, if you have one, is not touched. Nothing is generated
into your repository.

::: danger Neither package is on npm yet — the one step that does not work as written
`npm add cap2ui5` answers **404** today, and so would `@abap2ui5/runtime`, which
the plugin depends on. Both are published from a release that has not been cut
yet. Verified while writing this page, so that the line above is what you *will*
run and not what you can run now.

Until then, work from the repository — `examples/bookshop` in it is a complete
CAP project using the plugin:

```bash
git clone https://github.com/cap2UI5/cap2UI5 && cd cap2UI5

# fill runtime/ from an upstream build (once, ~3 minutes)
git clone https://github.com/abap2UI5/abap2UI5 /tmp/ref
(cd /tmp/ref && npm ci && npm run deps && npm run auto_downport && npm run auto_transpile)
scripts/assemble-runtime.sh /tmp/ref

npm install && npm start
```

The workspace links `plugin/` into the example, so `require("cap2ui5")` resolves
exactly as it will from npm. Everything below this box is accurate today — only
the `npm add` line waits on the release.
:::

## 3. Your first app

One file in `srv/apps/` — the directory the plugin scans:

```js
// srv/apps/hello.js
const { defineApp } = require("cap2ui5");

defineApp("ZCL_HELLO", class {
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

## 4. Run it

```bash
npx cds watch
```

Then open:

```
http://localhost:4004/rest/root/z2ui5?app_start=ZCL_HELLO
```

That is the **roundtrip route**, not a static page: the framework answers a GET
on it with the composed HTML that boots UI5 and starts the app named in
`app_start` — measured at 346 KB against 950 bytes for the shell's own
`index.html`, which is why the distinction matters. `/sap/bc/z2ui5?app_start=…`
is the same door under its ABAP-side name; `/z2ui5/webapp/` serves the shell's
assets and is not an entry point.

You will be asked to log in: the plugin requires an authenticated user by
default, and `cds watch` uses CAP's mocked auth, so any configured user works
(`alice` with an empty password in a stock project). See
[Configuration](../reference/configuration) to open the route to anonymous
callers — and what that costs.

## What you just built

A **stateful UI5 app** in one file that

- binds `name` two-way — you type, the server receives it;
- keeps `count` across roundtrips, and across a server restart, because the
  state is a row in your database rather than memory;
- needed no OData service, no manifest, no controller, no frontend build.

## Reading your own data

The point of running inside CAP. `main` may be `async` when the app does I/O,
and `cds.ql` works exactly as it does in a handler:

```js
const cds = require("@sap/cds");
const { SELECT } = cds.ql;
const { defineApp, t } = require("cap2ui5");

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
