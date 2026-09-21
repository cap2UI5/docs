# Hello World

The smallest complete cap2UI5 app. This is
[`examples/bookshop/srv/apps/hello.js`](https://github.com/cap2UI5/cap2UI5/blob/main/examples/bookshop/srv/apps/hello.js)
verbatim — it is exercised by the wire tests, the cold-restart test and the
browser test on every CI run.

```js
// srv/apps/hello.js
const { defineApp } = require("cap2ui5");

defineApp("ZCL_JS_HELLO", class {
  name = "";

  main(c) {
    if (c.isDisplay) {
      c.view(
        `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" displayBlock="true" height="100%">` +
        `<Shell><Page title="cap2UI5 - JS app">` +
        `<Input value="${c.bind("name")}"/>` +
        `<Button text="Go" press="${c.event("GO")}"/>` +
        `</Page></Shell></mvc:View>`);
      return;
    }
    if (c.eventName === "GO") c.messageBox(`Hello ${this.name}`);
  }
});
```

Run it:

```
http://localhost:4004/rest/root/z2ui5?app_start=ZCL_JS_HELLO
```

## Line by line

| | |
|---|---|
| `require("cap2ui5")` | the plugin's whole export surface: `defineApp`, `t`, and `defineExit` for the [user exit](../guide/user-exit) |
| `defineApp("ZCL_JS_HELLO", …)` | the first argument is the name **on the wire** — what `?app_start=` takes. The file name does not matter |
| `name = ""` | app state. An empty string types it as `string`, and it survives the roundtrip because the instance is written to `cap2ui5.Drafts` |
| `main(c)` | synchronous — no `async`, no `await` |
| `c.isDisplay` | the render branch. True on the first roundtrip **and** whenever the app gets the screen back |
| `c.bind("name")` | the binding path — two-way, so what the user types arrives on `this.name` |
| `c.event("GO")` | the handler expression; the next roundtrip has `c.eventName === "GO"` |
| `c.messageBox(…)` | a dialog with an OK button |

## What happens when you click

1. the browser POSTs `{ID, APP, EVENT: "GO", MODEL: {NAME: "Ada"}}`;
2. the server loads the draft, rebuilds the instance, applies `MODEL` — so
   `this.name` is `"Ada"` **before** `main` runs;
3. `main` takes the `GO` branch and queues a message box;
4. the response carries the action and a **new** draft id.

No controller, no manifest, no model code, no OData service.

## Adding state

```js
defineApp("ZCL_JS_HELLO", class {
  name  = "";
  count = 0;

  main(c) {
    if (c.isDisplay) {
      c.view(
        `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" displayBlock="true" height="100%">` +
        `<Shell><Page title="Hello">` +
        `<Input value="${c.bind("name")}"/>` +
        `<Text text="clicks: ${c.bind("count")}"/>` +
        `<Button text="Go" press="${c.event("GO")}"/>` +
        `</Page></Shell></mvc:View>`);
      return;
    }
    if (c.eventName === "GO") {
      this.count++;
      c.messageToast(`Hello ${this.name}, click ${this.count}`);
    }
  }
});
```

`count` needs no re-render: changed **bound data** is pushed to the view on its
own. You call `c.view()` again only when the view's *structure* changes.

The counter also survives a server restart — the state is a row in your
database, not memory. See [Persistence](../guide/persistence).

## Next

- [**List & Detail**](./list) — a table filled from your own CDS entity
- [**App Lifecycle**](../guide/lifecycle) — `isDisplay` vs. `isFirstRun`
- [**Data Binding**](../guide/data-binding) — the types
