# External OData Service

cap2UI5 apps have full access to the CAP connection pool. You can consume any **external OData service** — the call goes _inside_ your `main()` via the normal `cds.connect.to(...)` API.

## Configuration

In `package.json`:

```json
{
  "cds": {
    "requires": {
      "northwind": {
        "kind": "odata-v2",
        "model": "srv/external/northwind",
        "credentials": {
          "url": "https://services.odata.org/V2/Northwind/Northwind.svc/"
        }
      }
    }
  }
}
```

The CSN model is generated as usual with `cds import https://services.odata.org/V2/Northwind/Northwind.svc/` and saved at `srv/external/northwind.csn`.

## App code

```js
// srv/samples/read_odata.js
const cds               = require("@sap/cds");
const z2ui5_if_app      = require("../z2ui5/02/z2ui5_if_app");
const z2ui5_cl_xml_view = require("../z2ui5/02/z2ui5_cl_xml_view");

class read_odata extends z2ui5_if_app {

  customers = [];

  async main(client) {

    if (client.check_on_init()) {
      const northwind = await cds.connect.to("northwind");
      this.customers  = await northwind.run(SELECT.from("Customers").limit(50));

      const view = z2ui5_cl_xml_view.factory();
      const page = view.Page({ title: "Northwind - Customers" });

      const tab = page.Table({ items: client._bind_edit(this.customers) });
      const cols = tab.columns();
      cols.Column().Text({ text: "CompanyName" });
      cols.Column().Text({ text: "ContactName" });
      cols.Column().Text({ text: "Country"     });

      tab.items().ColumnListItem().cells()
        .Input({ value: "{CompanyName}", enabled: true })
        .Input({ value: "{ContactName}", enabled: true })
        .Text({  text:  "{Country}"     });

      client.view_display(view.stringify());

    } else if (client.check_on_event("SAVE_BACK")) {
      const northwind = await cds.connect.to("northwind");
      // … this.customers contains the user edits thanks to two-way binding
      // … run an UPDATE on the service for each row
    }
  }
}

module.exports = read_odata;
```

## What's new here

### 1. CDS connection inline

```js
const northwind = await cds.connect.to("northwind");
this.customers  = await northwind.run(SELECT.from("Customers").limit(50));
```

The same code you would write in a `srv/cat-service.js` handler. **Anything Node.js allows is allowed inside `main()`** — fetch, OData, file system, Redis, MQ.

### 2. Two-way on a list

```js
.Table({ items: client._bind_edit(this.customers) })
.items().ColumnListItem().cells()
  .Input({ value: "{CompanyName}", enabled: true })
```

Because the array is two-way bound via `_bind_edit`, UI5 writes user edits **on every item property** back into the XX delta. On the next roundtrip `this.customers` holds the modified state.

### 3. Persistence caveat

The entire `this.customers` array is serialized and deserialized between roundtrips. With 50 rows: no problem. With 50,000 rows: noticeable. Rules of thumb:

- **Reload fresh in `check_on_init()`** instead of holding the array as long-lived app state.
- For **read-heavy** lists with sort/filter/paging: the `set_odata_model` pattern (see [Events](../guide/events#convenience-server-triggered-frontend-actions)) — then the array lives in the frontend driver, not the app instance.

Example with an OData-backed table:

```js
async main(client) {
  if (client.check_on_init()) {
    client.set_odata_model("/odata/v4/admin/NorthwindCustomers");

    const view = z2ui5_cl_xml_view.factory();
    view.Page({ title: "Customers (OData)" })
      .Table({ items: "{/NorthwindCustomers}" })
        // ↑ no _bind_edit, but a static OData path binding
        .columns().Column().Text({ text: "Company" });

    client.view_display(view.stringify());
  }
}
```

You then need your own CAP service action `NorthwindCustomers` in `cat-service.js`:

```js
srv.on("READ", "NorthwindCustomers", async (req) => {
  const northwind = await cds.connect.to("northwind");
  return northwind.run(req.query);
});
```

→ Continue with [**Static XML View**](./static-xml-view).
