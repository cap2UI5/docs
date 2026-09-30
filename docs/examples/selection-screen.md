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
import cds from "@sap/cds";
import { defineApp, t } from "@cap2ui5/cds-plugin";
const { SELECT } = cds.ql;

defineApp("ZCL_ORDERS", class {
  customer = "";
  min_total = 0;
  only_open = false;
  rows     = t.table({ ID: 0, customer: "", total: t.packed(11, 2), open: false });
  hits     = 0;

  async main(client) {
    if (client.check_on_navigated()) {
      client.view_display(
        `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:f="sap.ui.layout.form"` +
        ` displayBlock="true" height="100%">` +
        `<Shell><Page title="Orders">` +

        `<f:SimpleForm editable="true" layout="ResponsiveGridLayout">` +
        `<f:content>` +
        `<Label text="Customer"/><Input value="${client._bind("customer")}"/>` +
        `<Label text="Minimum total"/><Input value="${client._bind("min_total")}"/>` +
        `<Label text="Open only"/><CheckBox selected="${client._bind("only_open")}"/>` +
        `</f:content></f:SimpleForm>` +

        `<Button text="Go" type="Emphasized" press="${client._event("GO")}"/>` +
        `<Text text="${client._bind("hits")} hits"/>` +

        `<Table items="${client._bind("rows")}">` +
        `<columns><Column><Text text="Customer"/></Column>` +
        `<Column><Text text="Total"/></Column><Column><Text text="Open"/></Column></columns>` +
        `<items><ColumnListItem><cells>` +
        `<Text text="{CUSTOMER}"/><ObjectNumber number="{TOTAL}"/><CheckBox selected="{OPEN}" editable="false"/>` +
        `</cells></ColumnListItem></items></Table>` +

        `</Page></Shell></mvc:View>`);
      return;
    }

    if (client.check_on_event("GO")) {
      const { Orders } = cds.entities("my.shop");
      let q = SELECT.from(Orders).where`customer like ${"%" + this.customer + "%"}`;
      if (this.min_total) q = q.and`total >= ${this.min_total}`;
      if (this.only_open) q = q.and`open = ${true}`;

      this.rows = await q;
      this.hits = this.rows.length;
      client.message_toast_display(`${this.hits} orders`);
    }
  }
});
```

## Why `GO` does not render

`client.check_on_navigated()` is true on the first roundtrip and when the app
gets the screen back — not on the `GO` roundtrip. The view stays as it is, and
the new `rows` and `hits` are pushed into it on their own: changed bound data
needs no `client.view_display()`. Render again only when the view's
*structure* changes.

## The types the form needs

| field | declared as | why |
|---|---|---|
| `customer` | `""` | `string` |
| `min_total` | `0` | integer. A decimal threshold would be `t.packed(11, 2)` |
| `only_open` | `false` | `abap_bool`; your code still sees `true`/`false` |
| `rows` | `t.table({…})` | an empty array carries no type |

A `CheckBox` binds `selected`, an `Input` binds `value` — ordinary UI5.

## Building the query conditionally

`cds.ql` composes, so the filter is plain JavaScript: the customer condition is
always there (an empty one is `like '%%'`, which matches every row), and an
`and` is added only for the other fields the user filled. The `${…}` holes are **bound parameters**, so a customer
name containing a quote is a value and not a syntax error.

## Keeping the criteria

They persist for free. `customer`, `min_total` and `only_open` are declared
fields, so they are in the draft: come back to the app after a navigation and
the form is still filled in — including after a server restart.

## Next

- [**List & Detail**](./list) — the tested version of the table half
- [**Data Binding**](../guide/data-binding) — the type table in full
- [**Navigation**](../guide/navigation) — a value help for the customer field
