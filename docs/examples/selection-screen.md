# Selection Screen

A filter form over a CDS entity: a few inputs, a Go button, a result table.
The classic internal-tool shape, and the one cap2UI5 is best at.

::: info Built from tested parts, assembled here
Every piece below — bound fields, `t.table`, `cds.ql`, the render branch — is
exercised in the repository's test suite. This particular assembly is
illustrative rather than a file you will find there; the shipped app it is
closest to is [`books.js`](./list).
:::

```js
// srv/apps/orders.js
const cds = require("@sap/cds");
const { SELECT } = cds.ql;
const { defineApp, t } = require("cap2ui5");

defineApp("ZCL_ORDERS", class {
  customer = "";
  minTotal = 0;
  onlyOpen = false;
  rows     = t.table({ ID: 0, customer: "", total: t.packed(11, 2), open: false });
  hits     = 0;

  async main(c) {
    if (c.eventName === "GO") {
      const { Orders } = cds.entities("my.shop");
      let q = SELECT.from(Orders);
      if (this.customer) q = q.where`customer like ${"%" + this.customer + "%"}`;
      if (this.minTotal) q = q.and`total >= ${this.minTotal}`;
      if (this.onlyOpen) q = q.and`open = ${true}`;

      this.rows = await q;
      this.hits = this.rows.length;
      c.messageToast(`${this.hits} orders`);
    }

    if (c.isDisplay) {
      c.view(
        `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:f="sap.ui.layout.form"` +
        ` displayBlock="true" height="100%">` +
        `<Shell><Page title="Orders">` +

        `<f:SimpleForm editable="true" layout="ResponsiveGridLayout">` +
        `<f:content>` +
        `<Label text="Customer"/><Input value="${c.bind("customer")}"/>` +
        `<Label text="Minimum total"/><Input value="${c.bind("minTotal")}"/>` +
        `<Label text="Open only"/><CheckBox selected="${c.bind("onlyOpen")}"/>` +
        `</f:content></f:SimpleForm>` +

        `<Button text="Go" type="Emphasized" press="${c.event("GO")}"/>` +
        `<Text text="${c.bind("hits")} hits"/>` +

        `<Table items="${c.bind("rows")}">` +
        `<columns><Column><Text text="Customer"/></Column>` +
        `<Column><Text text="Total"/></Column><Column><Text text="Open"/></Column></columns>` +
        `<items><ColumnListItem><cells>` +
        `<Text text="{CUSTOMER}"/><ObjectNumber number="{TOTAL}"/><CheckBox selected="{OPEN}" editable="false"/>` +
        `</cells></ColumnListItem></items></Table>` +

        `</Page></Shell></mvc:View>`);
    }
  }
});
```

## Why the event branch comes first

`GO` runs, *then* the render branch runs in the same roundtrip. The order
matters: the table the view binds is the one the query just produced. Writing
the render branch first with a `return` would show the user the previous result.

## The types the form needs

| field | declared as | why |
|---|---|---|
| `customer` | `""` | `string` |
| `minTotal` | `0` | integer. A decimal threshold would be `t.packed(11, 2)` |
| `onlyOpen` | `false` | `abap_bool`; your code still sees `true`/`false` |
| `rows` | `t.table({…})` | an empty array carries no type |

A `CheckBox` binds `selected`, an `Input` binds `value` — ordinary UI5.

## Building the query conditionally

`cds.ql` composes, so the filter is plain JavaScript: add a `where` only for the
fields the user filled. The `${…}` holes are **bound parameters**, so a customer
name containing a quote is a value and not a syntax error.

## Keeping the criteria

They persist for free. `customer`, `minTotal` and `onlyOpen` are declared
fields, so they are in the draft: come back to the app after a navigation and
the form is still filled in — including after a server restart.

## Next

- [**List & Detail**](./list) — the tested version of the table half
- [**Data Binding**](../guide/data-binding) — the type table in full
- [**Navigation**](../guide/navigation) — a value help for the customer field
