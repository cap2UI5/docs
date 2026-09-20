# List & Detail

A table filled from your own CDS entity, and a row that can be written back.
This is [`examples/bookshop/srv/apps/books.js`](https://github.com/cap2UI5/cap2UI5/blob/main/examples/bookshop/srv/apps/books.js)
— the app the coexistence test drives, so both directions below are measured
rather than sketched.

```js
// srv/apps/books.js
const cds = require("@sap/cds");
const { SELECT, INSERT } = cds.ql;
const { defineApp, t } = require("cap2ui5");

defineApp("ZCL_JS_BOOKS", class {
  search = "";
  hits   = 0;
  books  = t.table({ ID: 0, title: "", author: "", price: t.packed(9, 2) });

  async main(c) {
    if (c.isDisplay) {
      c.view(
        `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" displayBlock="true" height="100%">` +
        `<Shell><Page title="cap2UI5 - Books">` +
        `<SearchField value="${c.bind("search")}" search="${c.event("SEARCH")}"/>` +
        `<Table items="${c.bind("books")}">` +
        `<columns><Column><Text text="Title"/></Column><Column><Text text="Author"/></Column>` +
        `<Column><Text text="Price"/></Column></columns>` +
        `<items><ColumnListItem><cells><Text text="{TITLE}"/><Text text="{AUTHOR}"/>` +
        `<ObjectNumber number="{PRICE}"/></cells></ColumnListItem></items></Table>` +
        `<Text text="${c.bind("hits")} hits"/>` +
        `<Button text="Add" press="${c.event("ADD")}"/>` +
        `</Page></Shell></mvc:View>`);
      return;
    }

    if (c.eventName === "SEARCH") {
      const { Books } = cds.entities("my.bookshop");
      this.books = await SELECT.from(Books).where`title like ${"%" + this.search + "%"}`;
      this.hits  = this.books.length;
      c.messageToast(`${this.hits} found`);
    }

    if (c.eventName === "ADD") {
      const { Books } = cds.entities("my.bookshop");
      const max = await SELECT.one.from(Books).columns("max(ID) as m");
      await INSERT.into(Books).entries({
        ID: (max?.m ?? 0) + 1, title: this.search, author: "the app", stock: 1, price: 1.0,
      });
      c.messageToast(`added ${this.search}`);
    }
  }
});
```

## The three things worth copying

**`main` is `async` here** — because the *app* does I/O. The framework calls
still need no `await`; `SELECT` does.

**The table is declared, not inferred.** `t.table({…})` names the row, and
`t.packed(9, 2)` makes `price` a decimal. An empty array carries no type, so a
bare `books = []` would be left out of the model and named in a warning.

**Assign the whole array.** `this.books = await SELECT…` replaces the table and
the plugin rebuilds the rows. Mutating the array you read back does not write
through.

## Row fields are uppercase

Inside the table's template the cells bind `{TITLE}`, `{AUTHOR}`, `{PRICE}` —
uppercase, and relative to the row, so they take no `c.bind`. Component names
are stored lowercase, as the transpiler does, and appear uppercase in the model.

## `cds.ql` is the whole data layer

There is no cap2UI5 data API. You use exactly what a CAP handler uses, with the
same tagged templates and therefore the same parameterization:

```js
await SELECT.from(Books).where`title like ${"%" + this.search + "%"}`
```

The `${…}` is a bound parameter, not string concatenation.

## Both directions, measured

`coexistence.test.mjs` drives an ordinary OData service beside this app and
asserts:

- a row the app writes through `INSERT` is there for the OData client **at
  once** — same transaction, same database;
- a row POSTed through OData is found by the app's next `SEARCH`;
- `cap2ui5.Drafts` is **not** reachable through that service — 404, and absent
  from `$metadata`.

That last one is asserted rather than assumed: session state reachable through
somebody's OData service would be the worst kind of surprise.

## A detail screen

For a second screen with its own state, call another app rather than growing
this one — see [Navigation](../guide/navigation). The callee's result comes back
through `c.prevApp`.

## Next

- [**Selection Screen**](./selection-screen) — a filter form
- [**Data Binding**](../guide/data-binding) — tables, structures, nesting
- [**Navigation**](../guide/navigation) — the detail screen
