# Externer OData-Service

cap2UI5-Apps haben vollen Zugriff auf das CAP-Connection-Pool. Du kannst beliebige **externe OData-Services** konsumieren — der Aufruf wandert _innerhalb_ deines `main()` über die normale `cds.connect.to(...)`-API.

## Konfiguration

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

Das CSN-Modell wird normal mit `cds import https://services.odata.org/V2/Northwind/Northwind.svc/` erzeugt und unter `srv/external/northwind.csn` abgelegt.

## App-Code

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
      // … this.customers enthält die User-Edits dank Two-way-Binding
      // … pro Row UPDATE auf den Service ausführen
    }
  }
}

module.exports = read_odata;
```

## Was hier neu ist

### 1. CDS-Connection inline

```js
const northwind = await cds.connect.to("northwind");
this.customers  = await northwind.run(SELECT.from("Customers").limit(50));
```

Der gleiche Code, den du in einem `srv/cat-service.js`-Handler schreiben würdest. **In `main()` ist alles erlaubt, was Node.js erlaubt** — fetch, OData, file system, Redis, MQ.

### 2. Two-way auf eine Liste

```js
.Table({ items: client._bind_edit(this.customers) })
.items().ColumnListItem().cells()
  .Input({ value: "{CompanyName}", enabled: true })
```

Da das Array per `_bind_edit` two-way gebunden ist, schreibt UI5 User-Edits **auf jedem Item-Property** zurück in das XX-Delta. Im nächsten Roundtrip ist `this.customers` der modifizierte Stand.

### 3. Persistenz-Caveat

Das gesamte `this.customers`-Array wird zwischen Roundtrips serialisiert und wieder deserialisiert. Bei 50 Rows: kein Problem. Bei 50.000 Rows: spürbar. Faustregeln:

- **Lade frisch in `check_on_init()`** statt das Array dauerhaft als App-State zu halten.
- Für **read-heavy** Listen mit Sort/Filter/Paging: das `set_odata_model`-Pattern (siehe [Events](../guide/events#convenience-server-getriggerte-frontend-actions)) — dann lebt das Array im Frontend-Treiber, nicht in der App-Instanz.

Beispiel mit OData-Backed-Table:

```js
async main(client) {
  if (client.check_on_init()) {
    client.set_odata_model("/odata/v4/admin/NorthwindCustomers");

    const view = z2ui5_cl_xml_view.factory();
    view.Page({ title: "Customers (OData)" })
      .Table({ items: "{/NorthwindCustomers}" })
        // ↑ kein _bind_edit, sondern statisches OData-Pfad-Binding
        .columns().Column().Text({ text: "Company" });

    client.view_display(view.stringify());
  }
}
```

Du brauchst dann eine eigene CAP-Service-Action `NorthwindCustomers` in `cat-service.js`:

```js
srv.on("READ", "NorthwindCustomers", async (req) => {
  const northwind = await cds.connect.to("northwind");
  return northwind.run(req.query);
});
```

→ Weiter mit [**Statisches XML View**](./static-xml-view).
