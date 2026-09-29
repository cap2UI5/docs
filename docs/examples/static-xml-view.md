# A View From a File

The view is a string, which means it does not have to be a template literal in
the middle of your logic. For a large screen, keep the XML in its own file and
read it once.

::: info Illustrative
`client.view_display()` taking any string is the tested part. Loading it from disk is
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
  `client._bind()` and `client._event()` go.

## The app

```js
import fs from "node:fs";
import { defineApp, t } from "@cap2ui5/cds-plugin";

// read once at load, not per roundtrip; the path is relative to this file
const XML = fs.readFileSync(new URL("./views/orders.xml", import.meta.url), "utf8");

defineApp("ZCL_ORDERS_FILE", class {
  customer = "";
  rows     = t.table({ customer: "" });

  main(client) {
    if (client.check_on_navigated()) {
      client.view_display(XML
        .replace("{CUSTOMER_PATH}", client._bind("customer"))
        .replace("{GO_HANDLER}",    client._event("GO")));
      return;
    }
    if (client.check_on_event("GO")) { /* … */ }
  }
});
```

`String.replace` with a string pattern replaces the **first** occurrence, which
is what you want for a placeholder that appears once. For one that repeats, use
`replaceAll` — and pick placeholder names that cannot collide with a UI5 binding
(`{GO_HANDLER}`, not `{GO}`).

What `client._event("GO")` returns is a placeholder that becomes the event's
wire after `main()` returns. Putting it into the string unchanged, as here, is
what it is for; parsing or comparing it is not.

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
| a view assembled from repeated pieces | neither — build it with `z2ui5_cl_ui5_view_builder`, or with functions, see [Views](../guide/views) |

## Next

- [**Views**](../guide/views) — composing XML in JavaScript, and the view builder
- [**Selection Screen**](./selection-screen) — a form inline
