# A View From a File

The view is a string, which means it does not have to be a template literal in
the middle of your logic. For a large screen, keep the XML in its own file and
read it once.

::: info Illustrative
`c.view()` taking any string is the tested part. Loading it from disk is
ordinary Node — shown here because it is the question that comes up as soon as a
view passes a screenful.
:::

## The view

```xml
<!-- srv/apps/views/orders.xml -->
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" displayBlock="true" height="100%">
  <Shell>
    <Page title="Orders">
      <Input value="{CUSTOMER_PATH}"/>
      <Button text="Go" press="{GO_HANDLER}"/>
      <Table items="{ROWS_PATH}">
        <columns><Column><Text text="Customer"/></Column></columns>
        <items><ColumnListItem><cells><Text text="{CUSTOMER}"/></cells></ColumnListItem></items>
      </Table>
    </Page>
  </Shell>
</mvc:View>
```

Two kinds of placeholder are in there, and the difference matters:

- `{CUSTOMER}` inside the table's template is a **UI5 row binding**. It is
  relative to the row, needs nothing from you, and must survive to the browser
  untouched.
- `{CUSTOMER_PATH}` and `{GO_HANDLER}` are **yours** — they stand where
  `c.bind()` and `c.event()` go.

## The app

```js
const fs   = require("node:fs");
const path = require("node:path");
const { defineApp, t } = require("cap2ui5");

// read once at load, not per roundtrip
const XML = fs.readFileSync(path.join(__dirname, "views", "orders.xml"), "utf8");

defineApp("ZCL_ORDERS_FILE", class {
  customer = "";
  rows     = t.table({ customer: "" });

  main(c) {
    if (c.isDisplay) {
      c.view(XML
        .replace("{CUSTOMER_PATH}", c.bind("customer"))
        .replace("{GO_HANDLER}",    c.event("GO")));
      return;
    }
    if (c.eventName === "GO") { /* … */ }
  }
});
```

`String.replace` with a string pattern replaces the **first** occurrence, which
is what you want for a placeholder that appears once. For one that repeats, use
`replaceAll` — and pick placeholder names that cannot collide with a UI5 binding
(`{GO_HANDLER}`, not `{GO}`).

## Why read it at load

`readFileSync` at module scope runs once, when the plugin imports the file.
Reading per roundtrip would put a synchronous disk read on every click for a
file that never changes.

While developing, `cds watch` restarts on a change to the `.js` — but **not** on
a change to the `.xml`, since nothing imports it. Touch the app file, or read
inside `main` until you are done.

## When to bother

| | |
|---|---|
| a screenful of XML | keep it inline. The template literal is easier to follow |
| a large form, or a view a designer edits | a file, with your editor's XML support |
| a view assembled from repeated pieces | neither — build it with functions, see [Views](../guide/views) |

## Next

- [**Views**](../guide/views) — composing XML in JavaScript
- [**Selection Screen**](./selection-screen) — a form inline
