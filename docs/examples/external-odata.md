# Calling an External Service

An app is a CAP handler in every way that matters, so calling a remote service
is CAP's job rather than cap2UI5's: import the service, declare it in
`cds.requires`, `cds.connect.to` it, and run a query.

::: tip Runnable and tested: cap2UI5/samples-stack
[cap2UI5/samples-stack](https://github.com/cap2UI5/samples-stack) has this page
as a project you can run. Its sample
[`Z2UI5_CL_CAPS_APP_001`](https://github.com/cap2UI5/samples-stack/blob/main/srv/apps/z2ui5_cl_caps_app_001.js)
reads SAP S/4HANA's OData service `API_BUSINESS_PARTNER` the way this page
shows — `cds.connect.to`, then `cds.ql` — and runs without the system: while no
credentials are configured, `cds watch` mocks the service. Its tests drive the
app against that mock and through a real OData V2 request. The Northwind code
below has the same shape, but no test runs it — the sample is the measured
recipe.
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
import cds from "@sap/cds";
import { defineApp, t } from "@cap2ui5/cds-plugin";
const { SELECT } = cds.ql;

defineApp("ZCL_NORTHWIND", class {
  country  = "";
  products = t.table({ ProductID: 0, ProductName: "", UnitPrice: t.packed(11, 2) });
  status   = "";

  async main(client) {
    if (client.check_on_event("LOAD")) {
      try {
        const nw = await cds.connect.to("Northwind");
        this.products = await nw.run(SELECT.from("Products").limit(20));
        this.status   = `${this.products.length} products`;
      } catch (e) {
        // a remote call fails in ways a local one does not
        this.status = "the service did not answer";
        client.message_box_display({ text: `Northwind unreachable: ${e.message}`, type: "error" });
      }
    }

    if (client.check_on_navigated()) {
      client.view_display(
        `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" displayBlock="true" height="100%">` +
        `<Shell><Page title="Northwind">` +
        `<Button text="Load" press="${client._event("LOAD")}"/>` +
        `<Text text="${client._bind("status")}"/>` +
        `<Table items="${client._bind("products")}">` +
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
- [**cap2UI5/samples-stack**](https://github.com/cap2UI5/samples-stack) — this
  page against SAP S/4HANA, and a function module in an SAP system called over
  RFC with `@sap/cds-rfc`
  ([`Z2UI5_CL_CAPS_APP_002`](https://github.com/cap2UI5/samples-stack/blob/main/srv/apps/z2ui5_cl_caps_app_002.js))
  — both runnable without the system, both tested
- [**Data Binding**](../guide/data-binding) — declaring the row type
