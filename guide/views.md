# View Builder

Statt UI5-Views als XML-Dateien zu pflegen, baust du sie in JavaScript zusammen — mit einem **Fluent Builder**, der das XML im Hintergrund erzeugt. Output ist immer ein `<mvc:View>`-XML-String, der zum Frontend wandert.

## Der einfachste Fall

```js
const z2ui5_cl_xml_view = require("../z2ui5/02/z2ui5_cl_xml_view");

const view = z2ui5_cl_xml_view.factory()
  .Shell()
  .Page({ title: "Hello" })
  .Input({ value: "world" });

client.view_display(view.stringify());
```

`factory()` liefert eine neue View. Jede Methode erzeugt ein UI5-Control unter dem aktuellen Knoten und gibt **den neuen Knoten** zurück — damit verkettest du den Tree natürlich:

```js
view
  .Page()                  // ← neuer Knoten
    .Input()               // ← Kind von Page, neuer Knoten
    .Button();             // ← Kind von Page (siblings via Auto-Insertion)
```

Die meisten Builder-Methoden setzen das Ziel auf das **gerade erzeugte Control** _als Container_. Wenn du explizit einen Aggregations-Slot brauchst (z.B. `content`, `items`, `cells`), gibt es Methoden mit kleinem Anfangsbuchstaben:

```js
view
  .SimpleForm({ editable: true })
    .content()                       // ← öffnet die <SimpleForm.content>-Aggregation
      .Label({ text: "Name" })
      .Input({ value: "..." });
```

## Wichtige Aggregations-Methoden

| Methode | Aggregations-Slot |
|---|---|
| `.content()` | `<…:content>` (Page, SimpleForm, Panel, …) |
| `.items()`   | `<…:items>` (Table, List, ComboBox, …) |
| `.columns()` | `<…:columns>` (Table) |
| `.cells()`   | `<…:cells>` (ColumnListItem) |
| `.headerContent()` | Page-Toolbar |
| `.footer()`  | Page-Footer |
| `.endButton()` | Dialog |

Sie sind kleingeschrieben, um sie von den Control-Methoden (`PascalCase`) zu unterscheiden.

## Häufige Controls

```js
view.Page({ title: "..." });
view.Title({ text: "..." });
view.Label({ text: "..." });
view.Input({ value: "..." });
view.Button({ text: "...", press: client._event("EVT") });
view.Text({ text: "..." });
view.CheckBox({ selected: ..., text: "..." });
view.ComboBox({ selectedKey: ..., items: ... });
view.DatePicker({ value: ... });
view.DateTimePicker({ value: ... });
view.TimePicker({ value: ... });
view.Switch({ state: ... });

view.Table({ items: ... }).columns().Column().Text({ text: "Col" });
view.List({ items: ... }).StandardListItem({ title: "...", description: "..." });
view.SimpleForm({ editable: true });
view.Grid({ defaultSpan: "L6 M12 S12" });
view.HBox({ ... });
view.VBox({ ... });

view.MessageStrip({ text: "...", type: "Information" });
view.IconTabBar({ ... });
view.Wizard({ ... });
```

Praktisch alles, was UI5 in `sap.m` / `sap.ui.layout` / `sap.tnt` kennt, ist abgedeckt — die Methoden mappen 1:1 auf Control-Namen, Properties auf Attribute. Boolean-Werte werden automatisch in `"true"`/`"false"` konvertiert.

## Werte: roh, gebunden, oder Expression

```js
view.Input({ value: "Hello" });                            // Literal-String
view.Input({ value: client._bind_edit(this.name) });       // Two-way-Bind: {/XX/name}
view.Input({ value: client._bind(this.name) });            // One-way-Bind: {/name}
view.Input({ value: `{= ${client._bind(this.name)} }` });  // Expression-Binding
view.Input({ value: `{path: '/name', formatter: '.fmt'}` });// klassisches Binding
```

Alles, was du als String reingibst, wandert 1:1 ins XML-Attribut. Die Bind-Helpers sind reine String-Builder.

## Custom Controls (z2ui5-Namespace)

Über `view._z2ui5()` bekommst du den Custom-Control-Decorator (siehe `z2ui5_cl_xml_view_cc.js`):

```js
view.Page()
  ._z2ui5().geolocation({
    finished:  client._event("GEO_DONE"),
    longitude: client._bind_edit(this.lng),
    latitude:  client._bind_edit(this.lat),
  });
```

Verfügbare Custom-Controls (Auswahl):

- `camera_picture`, `camera_selector` — Kamera-Zugriff
- `chartjs` — Chart.js-Integration
- `file_uploader` — File-Upload
- `geolocation` — GPS
- `bwip_js` — Barcode-Generator
- `info_frontend` — UI5-Version, Device-Info
- `scrolling`, `timer`, `websocket`, `storage`
- `spreadsheet_export` — Excel-Export
- `multiinput_ext`, `smartmultiinput_ext` — erweiterte MultiInputs

Alle docs: [`srv/z2ui5/02/z2ui5_cl_xml_view_cc.js`](https://github.com/cap2UI5/dev/blob/main/cap2UI5/srv/z2ui5/02/z2ui5_cl_xml_view_cc.js).

## Statisches XML einbinden

Wenn du eine View **schon als XML hast** (z.B. aus einem Designer exportiert), umgeh den Builder einfach:

```js
const fs = require("fs");
const path = require("path");

const xml = fs.readFileSync(path.join(__dirname, "MyView.view.xml"), "utf8");
client.view_display(xml);
```

Der Roundtrip funktioniert genauso — das Frontend-Renderer interessiert nicht, _wie_ das XML entstanden ist.

→ Beispiel: [Statisches XML View](../examples/static-xml-view).

## Faktorien für Sonder-Views

```js
z2ui5_cl_xml_view.factory();          // normale View (mit Shell+Page)
z2ui5_cl_xml_view.factory_popup();    // View für Dialog/Popup
```

Popups laufen über `client.popup_display(view.stringify())` statt `view_display(...)`. → Mehr in [Popups & Toasts](./popups).

## Zwei verschachtelte Views (Master-Detail)

Ein Pattern für klassische Master-Detail-Layouts:

```js
client.view_display(masterView.stringify());
client.nest_view_display(detailView.stringify(), "containerId", "addItem");
```

`nest_view_display` injectet eine zweite View per JS-Insert in einen bestimmten Container der Hauptview. Es gibt zwei Nesting-Stufen (`nest_view_display`, `nest2_view_display`) für tiefere Layouts.

→ Weiter mit [**Data Binding**](./data-binding).
