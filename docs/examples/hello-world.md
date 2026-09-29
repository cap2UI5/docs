# Hello World

The smallest complete cap2UI5 app. This is
[`examples/bookshop/srv/apps/hello.js`](https://github.com/cap2UI5/cap2UI5/blob/main/examples/bookshop/srv/apps/hello.js)
in ES-module form, without its comments. The bookshop is a CommonJS project, so
the file itself starts with `require("@cap2ui5/cds-plugin")`; a project from
`cds init --nodejs` is an ES module project and `import`s the same names. The
app is exercised by the wire tests, the cold-restart test and the browser test
on every CI run.

```js
// srv/apps/hello.js
import { defineApp } from "@cap2ui5/cds-plugin";

defineApp("ZCL_JS_HELLO", class {
  name = "";

  main(client) {
    if (client.check_on_navigated()) {
      client.view_display(
        `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" displayBlock="true" height="100%">` +
        `<Shell><Page title="cap2UI5 - JS app">` +
        `<Input value="${client._bind("name")}"/>` +
        `<Button text="Go" press="${client._event("GO")}"/>` +
        `</Page></Shell></mvc:View>`);
      return;
    }
    if (client.check_on_event("GO")) client.message_box_display(`Hello ${this.name}`);
  }
});
```

Run it — `cds watch` prints the address, and the user to log in as:

```
http://localhost:4004/sap/bc/z2ui5?app_start=ZCL_JS_HELLO
```

## Line by line

| | |
|---|---|
| `import { … } from "@cap2ui5/cds-plugin"` | what the plugin exports: `defineApp`, `t`, the view builder `z2ui5_cl_ui5_view_builder`, the `z2ui5_if_client` constants, `defineExit` for the [user exit](../guide/user-exit), and `abap2js` |
| `defineApp("ZCL_JS_HELLO", …)` | the first argument is the name **on the wire** — what `?app_start=` takes. The file name does not matter |
| `name = ""` | app state. An empty string types it as `string`, and it survives the roundtrip because the instance is written to `cap2ui5.Drafts` |
| `main(client)` | synchronous — no `async`, no `await`. `client` is abap2UI5's `z2ui5_if_client`, by its ABAP method names |
| `client.check_on_navigated()` | the render branch. True on the first roundtrip **and** whenever the app gets the screen back |
| `client._bind("name")` | the binding path — two-way, so what the user types arrives on `this.name` |
| `client._event("GO")` | the handler expression; on the next roundtrip `client.check_on_event("GO")` is true |
| `client.message_box_display(…)` | a dialog with an OK button |

The ABAP app it corresponds to calls `client->check_on_navigated( )`,
`client->_bind( name )`, ``client->_event( `GO` )`` and
`client->message_box_display( … )` — the same methods. The full list is the
[client API](../api/client).

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

  main(client) {
    if (client.check_on_navigated()) {
      client.view_display(
        `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" displayBlock="true" height="100%">` +
        `<Shell><Page title="Hello">` +
        `<Input value="${client._bind("name")}"/>` +
        `<Text text="clicks: ${client._bind("count")}"/>` +
        `<Button text="Go" press="${client._event("GO")}"/>` +
        `</Page></Shell></mvc:View>`);
      return;
    }
    if (client.check_on_event("GO")) {
      this.count++;
      client.message_toast_display(`Hello ${this.name}, click ${this.count}`);
    }
  }
});
```

`count` needs no re-render: changed **bound data** is pushed to the view on its
own. You call `client.view_display()` again only when the view's *structure*
changes.

The counter also survives a server restart — the state is a row in your
database, not memory. See [Persistence](../guide/persistence).

## Next

- [**List & Detail**](./list) — a table filled from your own CDS entity
- [**App Lifecycle**](../guide/lifecycle) — `check_on_navigated()` vs. `check_on_init()`
- [**Data Binding**](../guide/data-binding) — the types
