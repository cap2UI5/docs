# View Builder

Instead of maintaining UI5 views as XML files, you assemble them in JavaScript — with a **fluent builder** that produces the XML in the background. The output is always a `<mvc:View>` XML string that goes to the frontend.

## The simplest case

```js
const z2ui5_cl_xml_view = require("../z2ui5/02/z2ui5_cl_xml_view");

const view = z2ui5_cl_xml_view.factory()
  .Shell()
  .Page({ title: "Hello" })
  .Input({ value: "world" });

client.view_display(view.stringify());
```

`factory()` returns a new view. Each method creates a UI5 control under the current node and returns **the new node** — that's how you naturally chain the tree:

```js
view
  .Page()                  // ← new node
    .Input()               // ← child of Page, new node
    .Button();             // ← child of Page (siblings via auto-insertion)
```

Most builder methods set the target to the **just-created control** _as a container_. When you explicitly need an aggregation slot (e.g. `content`, `items`, `cells`), there are methods with a lowercase initial:

```js
view
  .SimpleForm({ editable: true })
    .content()                       // ← opens the <SimpleForm.content> aggregation
      .Label({ text: "Name" })
      .Input({ value: "..." });
```

## Important aggregation methods

| Method | Aggregation slot |
|---|---|
| `.content()` | `<…:content>` (Page, SimpleForm, Panel, …) |
| `.items()`   | `<…:items>` (Table, List, ComboBox, …) |
| `.columns()` | `<…:columns>` (Table) |
| `.cells()`   | `<…:cells>` (ColumnListItem) |
| `.headerContent()` | Page toolbar |
| `.footer()`  | Page footer |
| `.endButton()` | Dialog |

They are lowercase to distinguish them from the control methods (`PascalCase`).

## Common controls

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

Practically everything UI5 provides in `sap.m` / `sap.ui.layout` / `sap.tnt` is covered — methods map 1:1 to control names, properties to attributes. Boolean values are converted automatically to `"true"`/`"false"`.

## Values: raw, bound, or expression

```js
view.Input({ value: "Hello" });                            // literal string
view.Input({ value: client._bind_edit(this.name) });       // two-way bind: {/XX/name}
view.Input({ value: client._bind(this.name) });            // one-way bind: {/name}
view.Input({ value: `{= ${client._bind(this.name)} }` });  // expression binding
view.Input({ value: `{path: '/name', formatter: '.fmt'}` });// classical binding
```

Whatever you pass as a string lands 1:1 in the XML attribute. The bind helpers are pure string builders.

## Custom controls (z2ui5 namespace)

Via `view._z2ui5()` you get the custom control decorator (see `z2ui5_cl_xml_view_cc.js`):

```js
view.Page()
  ._z2ui5().geolocation({
    finished:  client._event("GEO_DONE"),
    longitude: client._bind_edit(this.lng),
    latitude:  client._bind_edit(this.lat),
  });
```

Available custom controls (selection):

- `camera_picture`, `camera_selector` — camera access
- `chartjs` — Chart.js integration
- `file_uploader` — file upload
- `geolocation` — GPS
- `bwip_js` — barcode generator
- `info_frontend` — UI5 version, device info
- `scrolling`, `timer`, `websocket`, `storage`
- `spreadsheet_export` — Excel export
- `multiinput_ext`, `smartmultiinput_ext` — extended MultiInputs

All docs: [`srv/z2ui5/02/z2ui5_cl_xml_view_cc.js`](https://github.com/cap2UI5/dev/blob/main/cap2UI5/srv/z2ui5/02/z2ui5_cl_xml_view_cc.js).

## Embedding static XML

If you **already have a view as XML** (e.g. exported from a designer), simply bypass the builder:

```js
const fs = require("fs");
const path = require("path");

const xml = fs.readFileSync(path.join(__dirname, "MyView.view.xml"), "utf8");
client.view_display(xml);
```

The roundtrip works exactly the same way — the frontend renderer doesn't care _how_ the XML was produced.

→ Example: [Static XML View](../examples/static-xml-view).

## Factories for special views

```js
z2ui5_cl_xml_view.factory();          // normal view (with Shell+Page)
z2ui5_cl_xml_view.factory_popup();    // view for dialog/popup
```

Popups go through `client.popup_display(view.stringify())` instead of `view_display(...)`. → More in [Popups & Toasts](./popups).

## Two nested views (master-detail)

A pattern for classic master-detail layouts:

```js
client.view_display(masterView.stringify());
client.nest_view_display(detailView.stringify(), "containerId", "addItem");
```

`nest_view_display` injects a second view via JS insert into a specific container of the main view. There are two nesting levels (`nest_view_display`, `nest2_view_display`) for deeper layouts.

→ Continue with [**Data Binding**](./data-binding).
