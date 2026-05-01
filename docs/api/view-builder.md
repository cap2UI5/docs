# API: View Builder

The view builder generates UI5 XML views from JavaScript calls. Source: [`srv/z2ui5/02/z2ui5_cl_xml_view.js`](https://github.com/cap2UI5/dev/blob/main/cap2UI5/srv/z2ui5/02/z2ui5_cl_xml_view.js).

## Factories

```js
const z2ui5_cl_xml_view = require("../z2ui5/02/z2ui5_cl_xml_view");

z2ui5_cl_xml_view.factory();          // normal view
z2ui5_cl_xml_view.factory_popup();    // popup/dialog view
```

`factory()` returns a view instance. Each builder method emits the corresponding UI5 element and returns a builder instance that serves as the new node.

## Output

```js
view.stringify();   // → complete <mvc:View>...</mvc:View> XML string
```

You pass that to `client.view_display(...)`, `client.popup_display(...)` etc.

## Container methods (selection)

The builder methods map 1:1 to UI5 control names. A curated list:

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

> Full list: just grep for `cc(` or `_emit_method` inside `z2ui5_cl_xml_view.js` — the generator section lists all mapping methods.

## Aggregation methods (lowercase)

| Method | Slot |
|---|---|
| `.content()` | `<…:content>` |
| `.items()` | `<…:items>` |
| `.columns()` | `<…:columns>` |
| `.cells()` | `<…:cells>` |
| `.headerContent()` | Page header |
| `.subHeader()` | Page sub-header |
| `.footer()` | Page footer |
| `.beginButton()` / `.endButton()` | Dialog buttons |
| `.buttons()` | MessageBox buttons |
| `.suggestionItems()` | Input suggestions |
| `.dependents()` | Control dependents |
| `.tooltip()` | Tooltip slot |

## Navigation in the builder hierarchy

| Method | Returns |
|---|---|
| `.get()` | current control |
| `.get_parent()` | parent control |
| `.get_root()` | view root |

```js
view
  .Page()
    .Title({ text: "..." })
    .get_parent()       // ← back to Page
    .Button({ ... });   // ← sibling of Title
```

In most cases you don't need this — builder methods automatically place the next sibling at the "right" position.

## Custom controls (`z2ui5:` namespace)

Via `view._z2ui5()` you get the custom control decorator (see [`z2ui5_cl_xml_view_cc.js`](https://github.com/cap2UI5/dev/blob/main/cap2UI5/srv/z2ui5/02/z2ui5_cl_xml_view_cc.js)):

| Method | Custom control |
|---|---|
| `.approve_popover({...})` | Confirm popover pattern |
| `.binding_update({path, changed})` | Forced model update |
| `.bwip_js({bcid, text, scale, height})` | Barcode generator |
| `.camera_picture({...})` | Camera photo |
| `.camera_selector({...})` | Camera selector |
| `.chartjs({canvas_id, view, config, height, width, style})` | Chart.js |
| `.dirty({isdirty})` | Dirty flag |
| `.favicon({favicon})` | Favicon setter |
| `.file_uploader({...})` | File upload with direct-upload option |
| `.focus({setupdate, selectionstart, selectionend, focusid})` | Programmatic focus |
| `.geolocation({...})` | GPS |
| `.history({search})` | URL search trigger |
| `.info_frontend({...})` | UI5 version, device info |
| `.lp_title(title, fullwidth)` | FLP title setter |
| `.message_manager({items})` | MessageManager |
| `.messaging({items})` | Messaging container |
| `.multiinput_ext({...})` / `.smartmultiinput_ext({...})` | Extended MultiInputs |
| `.scrolling({setupdate, items})` | Scroll position |
| `.spreadsheet_export({...})` | Excel export button |
| `.storage({...})` | Browser storage wrapper |
| `.timer({delayms, finished, checkactive, checkrepeat})` | Timer trigger |
| `.title(title)` | Document title |
| `.tree({tree_id})` | Tree helper control |
| `.uitableext({tableid})` | UI Table extensions |
| `.websocket({value, path, received, checkactive, checkrepeat})` | WebSocket bridge |

## Helper methods

| Method | Description |
|---|---|
| `view.cc(name, props)` | Insert any control with `z2ui5:`/`m:`/`f:` namespace |
| `view.boolean_abap_2_json(val)` | Converts truthy → `"true"` / falsy → `"false"` (for boolean attributes) |
| `view.xml_load(xml)` | Embed raw XML fragment |
| `view.stringify()` | Produce final XML string |
| `view.factory_popup()` | static — popup variant |
| `view.factory()` | static — normal view |
