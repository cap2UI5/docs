# API: View Builder

Der View Builder erzeugt UI5-XML-Views aus JavaScript-Aufrufen. Quelle: [`srv/z2ui5/02/z2ui5_cl_xml_view.js`](https://github.com/cap2UI5/dev/blob/main/cap2UI5/srv/z2ui5/02/z2ui5_cl_xml_view.js).

## Factories

```js
const z2ui5_cl_xml_view = require("../z2ui5/02/z2ui5_cl_xml_view");

z2ui5_cl_xml_view.factory();          // normale View
z2ui5_cl_xml_view.factory_popup();    // Popup-/Dialog-View
```

`factory()` liefert eine View-Instanz. Jede Builder-Methode emit das jeweilige UI5-Element und gibt eine Builder-Instanz zurück, die als neuer Knoten dient.

## Output

```js
view.stringify();   // → kompletter <mvc:View>...</mvc:View>-XML-String
```

Den gibst du an `client.view_display(...)`, `client.popup_display(...)` etc. weiter.

## Container-Methoden (Auswahl)

Die Builder-Methoden mappen 1:1 auf UI5-Control-Namen. Eine kuratierte Liste:

### sap.m

`Page`, `Title`, `Label`, `Text`, `Link`, `Input`, `TextArea`, `Button`, `MenuButton`, `Toolbar`, `OverflowToolbar`, `ToolbarSpacer`, `CheckBox`, `Switch`, `Select`, `ComboBox`, `MultiComboBox`, `MultiInput`, `SearchField`, `Slider`, `RangeSlider`, `RatingIndicator`, `StepInput`, `DatePicker`, `DateTimePicker`, `TimePicker`, `DateRangeSelection`, `MessageStrip`, `ObjectStatus`, `ObjectAttribute`, `ObjectIdentifier`, `Avatar`, `Image`, `Icon`, `BusyDialog`, `BusyIndicator`, `Dialog`, `Popover`, `ResponsivePopover`, `IconTabBar`, `IconTabFilter`, `Wizard`, `WizardStep`, `Table`, `Column`, `ColumnListItem`, `List`, `StandardListItem`, `CustomListItem`, `FacetFilter`, `FacetFilterList`, `FacetFilterItem`, `Tile`, `GenericTile`, `TileContent`, `NumericContent`, `FlexBox`, `HBox`, `VBox`, `Panel`, `ScrollContainer`, `Bar`, `App`, `Shell`, `SplitContainer`, `NavContainer`, `BlockLayout`, `BlockLayoutRow`, `BlockLayoutCell`, `OverflowToolbarButton`, `Token`, `SegmentedButton`, `SegmentedButtonItem`, `ProgressIndicator`, `Carousel`, `Page`, `MessagePopover`, `MessageView`, `MessageItem`, `UploadCollection`, `UploadCollectionItem`, …

### sap.ui.layout

`Grid`, `GridData`, `HorizontalLayout`, `VerticalLayout`, `SimpleForm`, `Form`, `FormContainer`, `FormElement`, `Splitter`, `SplitterLayoutData`, `BlockLayout`, `DynamicSideContent`, `FixFlex`, `ResponsiveSplitter`, …

### sap.tnt

`InfoLabel`, `NavigationList`, `NavigationListItem`, `ToolHeader`, `ToolPage`, `SideNavigation`, …

### sap.ui.table

`Table` (Grid Table), `Column`, `RowAction`, `RowActionItem`, `AnalyticalTable`, `TreeTable`, …

### sap.ui.unified

`Calendar`, `Menu`, `MenuItem`, `MenuTextFieldItem`, `Shell`, `ShellOverlay`, `FileUploader`, …

> Komplette Liste: einfach in `z2ui5_cl_xml_view.js` nach `cc(` oder `_emit_method` greppen — die Generator-Sektion listet alle Mapping-Methoden auf.

## Aggregations-Methoden (kleingeschrieben)

| Methode | Slot |
|---|---|
| `.content()` | `<…:content>` |
| `.items()` | `<…:items>` |
| `.columns()` | `<…:columns>` |
| `.cells()` | `<…:cells>` |
| `.headerContent()` | Page-Header |
| `.subHeader()` | Page-SubHeader |
| `.footer()` | Page-Footer |
| `.beginButton()` / `.endButton()` | Dialog-Buttons |
| `.buttons()` | MessageBox-Buttons |
| `.suggestionItems()` | Input-Suggestions |
| `.dependents()` | Control-Dependents |
| `.tooltip()` | Tooltip-Slot |

## Navigation in der Builder-Hierarchie

| Methode | Returns |
|---|---|
| `.get()` | aktuelles Control |
| `.get_parent()` | Eltern-Control |
| `.get_root()` | View-Root |

```js
view
  .Page()
    .Title({ text: "..." })
    .get_parent()       // ← zurück zu Page
    .Button({ ... });   // ← Sibling zum Title
```

In den meisten Fällen brauchst du das nicht — die Builder-Methoden geben die "richtige" Position für das nächste Sibling automatisch.

## Custom-Controls (`z2ui5:`-Namespace)

Über `view._z2ui5()` bekommst du den Custom-Control-Decorator (siehe [`z2ui5_cl_xml_view_cc.js`](https://github.com/cap2UI5/dev/blob/main/cap2UI5/srv/z2ui5/02/z2ui5_cl_xml_view_cc.js)):

| Methode | Custom-Control |
|---|---|
| `.approve_popover({...})` | Confirm-Popover-Pattern |
| `.binding_update({path, changed})` | erzwungenes Modell-Update |
| `.bwip_js({bcid, text, scale, height})` | Barcode-Generator |
| `.camera_picture({...})` | Kamera-Foto |
| `.camera_selector({...})` | Kamera-Selector |
| `.chartjs({canvas_id, view, config, height, width, style})` | Chart.js |
| `.dirty({isdirty})` | Dirty-Flag |
| `.favicon({favicon})` | Favicon-Setzer |
| `.file_uploader({...})` | File-Upload mit Direct-Upload-Option |
| `.focus({setupdate, selectionstart, selectionend, focusid})` | Programmatic Focus |
| `.geolocation({...})` | GPS |
| `.history({search})` | URL-Search-Trigger |
| `.info_frontend({...})` | UI5-Version, Device-Info |
| `.lp_title(title, fullwidth)` | FLP-Title-Setter |
| `.message_manager({items})` | MessageManager |
| `.messaging({items})` | Messaging-Container |
| `.multiinput_ext({...})` / `.smartmultiinput_ext({...})` | Erweiterte MultiInputs |
| `.scrolling({setupdate, items})` | Scroll-Position |
| `.spreadsheet_export({...})` | Excel-Export-Button |
| `.storage({...})` | Browser-Storage-Wrapper |
| `.timer({delayms, finished, checkactive, checkrepeat})` | Timer-Trigger |
| `.title(title)` | Document-Title |
| `.tree({tree_id})` | Tree-Hilfs-Control |
| `.uitableext({tableid})` | UI Table-Extensions |
| `.websocket({value, path, received, checkactive, checkrepeat})` | WebSocket-Bridge |

## Hilfsmethoden

| Methode | Beschreibung |
|---|---|
| `view.cc(name, props)` | beliebiges Control mit `z2ui5:`/`m:`/`f:`-Namespace einfügen |
| `view.boolean_abap_2_json(val)` | konvertiert truthy → `"true"` / falsy → `"false"` (für Boolean-Attribute) |
| `view.xml_load(xml)` | rohes XML-Fragment einbetten |
| `view.stringify()` | finalen XML-String erzeugen |
| `view.factory_popup()` | static — Popup-Variante |
| `view.factory()` | static — normale View |
