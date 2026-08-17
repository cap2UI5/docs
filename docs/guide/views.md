# View Builder

Instead of maintaining UI5 views as XML files, you assemble them in JavaScript with a fluent builder that produces the XML in the background. The output is always an XML string that goes to the frontend.

There is one builder, `z2ui5_cl_ui5_view_builder`. It is deliberately generic: it knows XML elements and attributes, not the UI5 control catalogue. You name the control, it builds the tree. That is why the transpiler targets it, and why every bundled sample is written against it.

## The simplest case

```js
const z2ui5_cl_ui5_view_builder = require("abap2UI5/z2ui5_cl_ui5_view_builder");

const view = z2ui5_cl_ui5_view_builder.factory()
  .ele({ n: `View`, ns: `mvc` })
  .a({ n: `xmlns`,     v: `sap.m` })
  .a({ n: `xmlns:mvc`, v: `sap.ui.core.mvc` });

view.ele(`Shell`).ele(`Page`).a({ n: `title`, v: `Hello` })
  .tag(`Input`).a({ n: `value`, v: `world` });

client.view_display(view.stringify());
```

```xml
<mvc:View xmlns="sap.m" xmlns:mvc="sap.ui.core.mvc">
  <Shell><Page title="Hello"><Input value="world"/></Page></Shell>
</mvc:View>
```

## Four methods

| Method | What it does |
|---|---|
| `.ele({n, ns})` | add a child element and **move into it** |
| `.tag({n, ns})` | add a child element and **stay where you are** |
| `.a({n, v})` | set an attribute (`{n, b}` for a boolean) |
| `.end()` | move back up to the parent |

`.ele()` and `.tag()` are the pair worth internalising, because they look interchangeable and are not:

```js
page.ele(`Button`).a({ n: `text`, v: `A` });   // now positioned ON the button
page.tag(`Button`).a({ n: `text`, v: `B` });   // still positioned on the page
```

Containers you want to nest into get `.ele()`; leaves get `.tag()`. A chain that silently descended one level too far is the usual reason a control ends up inside its sibling instead of next to it.

Each method also takes its main argument positionally, so `.ele("Page")` and `.ele({ n: "Page" })` are the same thing — the samples mix both freely.

## Aggregations are ordinary elements

There is no `.content()` or `.items()` shorthand. An aggregation is an element like any other, which means you write it yourself — **and give it the namespace of the control that owns it**:

```js
const content = view.ele(`Shell`).ele(`Page`)
  .ele({ n: `SimpleForm`, ns: `form` })   // sap.ui.layout.form
  .a({ n: `editable`, b: true })
  .ele({ n: `content`, ns: `form` });     // …and so is its aggregation

content.tag(`Label`).a({ n: `text`, v: `Name` });
content.tag(`Input`).a({ n: `value`, v: client._bind_edit(this.name) });
```

::: warning Namespaces are the one thing that fails hard
An element in the wrong XML namespace does not render wrong — the view fails to **load**. UI5 resolves an unprefixed tag against the default `xmlns`, so `<SimpleForm>` under `xmlns="sap.m"` becomes a request for `sap/m/SimpleForm.js` and the whole view dies with a `ModuleError`, with nothing rendered and nothing useful in the message.

Declare every namespace you use on the root, and prefix every element that is not in the default one:

```js
.a({ n: `xmlns`,      v: `sap.m` })
.a({ n: `xmlns:mvc`,  v: `sap.ui.core.mvc` })
.a({ n: `xmlns:core`, v: `sap.ui.core` })          // Title, Icon, …
.a({ n: `xmlns:form`, v: `sap.ui.layout.form` })   // SimpleForm + its content
.a({ n: `xmlns:z2ui5`, v: `z2ui5.cc` })            // custom controls
```
:::

## Values: raw, bound, or expression

```js
.a({ n: `value`, v: `Hello` })                                  // literal string
.a({ n: `value`, v: client._bind_edit(this.name) })             // two-way: {/XX/NAME}
.a({ n: `value`, v: client._bind(this.name) })                  // one-way: {/NAME}
.a({ n: `value`, v: `{= ${client._bind(this.name)} }` })        // expression binding
.a({ n: `value`, v: `{path: '/NAME', formatter: '.fmt'}` })     // classical binding
```

Whatever you pass as a string lands 1:1 in the XML attribute — the bind helpers are pure string builders. Booleans have their own form, `.a({ n: "editable", b: true })`, which renders `"true"` / `"false"`.

## Custom controls

Custom controls live in the `z2ui5.cc` namespace:

```js
view.a({ n: `xmlns:z2ui5`, v: `z2ui5.cc` });

page.tag({ n: `Geolocation`, ns: `z2ui5` })
  .a({ n: `finished`,  v: client._event(`GEO_DONE`) })
  .a({ n: `longitude`, v: client._bind_edit(this.lng) })
  .a({ n: `latitude`,  v: client._bind_edit(this.lat) });
```

Available custom controls (selection): camera picture/selector, Chart.js, file uploader, geolocation, barcode generator, frontend info, scrolling, timer, websocket, storage, spreadsheet export, extended MultiInputs. They are implemented in the webapp under [`app/z2ui5/webapp/cc/`](https://github.com/cap2UI5/cap2UI5/tree/main/app/z2ui5/webapp/cc).

## Popups

A popup is a fragment, not a view, so the root element differs — everything else is the same:

```js
const view = z2ui5_cl_ui5_view_builder.factory()
  .ele({ n: `FragmentDefinition`, ns: `core` })
  .a({ n: `xmlns`,      v: `sap.m` })
  .a({ n: `xmlns:core`, v: `sap.ui.core` });

view.ele(`Dialog`).a({ n: `title`, v: `Confirm` });
client.popup_display(view.stringify());
```

→ More in [Popups & Toasts](./popups).

## Embedding static XML

If you already have a view as XML (exported from a designer, say), bypass the builder entirely:

```js
const fs = require("fs");
const path = require("path");

const xml = fs.readFileSync(path.join(__dirname, "MyView.view.xml"), "utf8");
client.view_display(xml);
```

The roundtrip works the same way — the frontend renderer does not care how the XML was produced.

→ Example: [Static XML View](../examples/static-xml-view).

## Two nested views (master-detail)

```js
client.view_display(masterView.stringify());
client.nest_view_display(detailView.stringify(), "containerId", "addItem");
```

`nest_view_display` injects a second view into a specific container of the main view. There are two nesting levels (`nest_view_display`, `nest2_view_display`) for deeper layouts.

→ Full method list: [View Builder API](../api/view-builder). Continue with [**Data Binding**](./data-binding).
