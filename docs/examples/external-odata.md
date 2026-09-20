# Calling an External Service

An app is a CAP handler in every way that matters, so calling a remote service
is CAP's job rather than cap2UI5's: import the service, declare it in
`cds.requires`, `cds.connect.to` it, and run a query.

::: warning Not exercised by this project's test suite
Everything here is standard CAP remote-service usage, and it works from an app
because an app is ordinary handler code with `cds` in scope. But there is no
test in the repository that calls a remote service, so treat this page as the
shape rather than as a measured recipe — unlike [Hello World](./hello-world)
and [List & Detail](./list), which are files the CI runs.
:::

## Import the service

Once, with CAP's own tooling:

```bash
cds import https://services.odata.org/V2/Northwind/Northwind.svc/\$metadata \
  --as cds --out srv/external
```

and declare it:

```json
{
  "cds": {
    "requires": {
      "Northwind": {
        "kind": "odata-v2",
        "model": "srv/external/Northwind",
        "credentials": { "url": "https://services.odata.org/V2/Northwind/Northwind.svc" }
      }
    }
  }
}
```

In production the `credentials` come from a destination binding instead — again,
plain CAP.

## The app

```js
// srv/apps/northwind.js
const cds = require("@sap/cds");
const { SELECT } = cds.ql;
const { defineApp, t } = require("cap2ui5");

defineApp("ZCL_NORTHWIND", class {
  country  = "";
  products = t.table({ ProductID: 0, ProductName: "", UnitPrice: t.packed(11, 2) });
  status   = "";

  async main(c) {
    if (c.eventName === "LOAD") {
      try {
        const nw = await cds.connect.to("Northwind");
        this.products = await nw.run(SELECT.from("Products").limit(20));
        this.status   = `${this.products.length} products`;
      } catch (e) {
        // a remote call fails in ways a local one does not
        this.status = "the service did not answer";
        c.messageBox(`Northwind unreachable: ${e.message}`);
      }
    }

    if (c.isDisplay) {
      c.view(
        `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" displayBlock="true" height="100%">` +
        `<Shell><Page title="Northwind">` +
        `<Button text="Load" press="${c.event("LOAD")}"/>` +
        `<Text text="${c.bind("status")}"/>` +
        `<Table items="${c.bind("products")}">` +
        `<columns><Column><Text text="Product"/></Column><Column><Text text="Price"/></Column></columns>` +
        `<items><ColumnListItem><cells>` +
        `<Text text="{PRODUCTNAME}"/><ObjectNumber number="{UNITPRICE}"/>` +
        `</cells></ColumnListItem></items></Table>` +
        `</Page></Shell></mvc:View>`);
    }
  }
});
```

## Three things a remote call needs that a local one does not

**Catch.** A remote service is down, slow or rate-limited in ways your own
database is not. An unhandled error answers `roundtrip failed (<id>)` and the
user sees nothing useful; catching it lets you say what happened.

**Expect a wait.** The call happens inside the roundtrip, so the user waits for
it. Fetch on an explicit event rather than in the render branch, and `limit`
generously.

**Watch the field names.** The row fields in the view are the **uppercased**
names of what the service returns — `{PRODUCTNAME}` for `ProductName`. Declare
the row with the names as they arrive (`ProductName`), and bind them uppercased.

## Where the data goes

Into a declared field, like any other state — so it is in the draft and survives
the roundtrip. Which also means you fetch **once** and the table stays filled
until you refresh it deliberately.

## Next

- [**List & Detail**](./list) — the same shape against your own entities, tested
- [**Data Binding**](../guide/data-binding) — declaring the row type
