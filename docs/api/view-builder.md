# API: View Builder

Views are built in JavaScript and rendered to UI5 XML. There is one builder:
`z2ui5_cl_ui5_view_builder`. It is generic — it knows XML elements and
attributes, not the UI5 control catalogue — which is why the transpiler
targets it and why every one of the
[bundled samples](../guide/samples) is written against it.

Source: [`core/srv/z2ui5/02/z2ui5_cl_ui5_view_builder.js`](https://github.com/cap2UI5/cap2UI5/blob/main/core/srv/z2ui5/02/z2ui5_cl_ui5_view_builder.js).

::: info A second builder used to ship here
Earlier versions also shipped a per-control builder (`view.Page({ title })`).
It was a port of a class upstream had already retired, and cap2UI5 stopped carrying upstream's frozen legacy package in
2026-08 — see [The Ecosystem](../guide/ecosystem). Everything it did, the
builder below does; the difference is that you name the control.
:::

## Getting started

```js
const z2ui5_cl_ui5_view_builder = require("abap2UI5/z2ui5_cl_ui5_view_builder");

const view = z2ui5_cl_ui5_view_builder.factory()
  .ele({ n: `View`, ns: `mvc` })
  .a({ n: `xmlns`,     v: `sap.m` })
  .a({ n: `xmlns:mvc`, v: `sap.ui.core.mvc` });

const page = view.ele(`Shell`).ele(`Page`).a({ n: `title`, v: `Hello` });

page.ele(`Button`)
  .a({ n: `text`,  v: `Press me` })
  .a({ n: `press`, v: client._event(`BUTTON_PRESS`) });

client.view_display(view.stringify());
```

```xml
<mvc:View xmlns="sap.m" xmlns:mvc="sap.ui.core.mvc">
  <Shell><Page title="Hello"><Button text="Press me" press="..."/></Page></Shell>
</mvc:View>
```

## Methods

| Method | Meaning |
|---|---|
| `factory()` | static — a new, empty tree |
| `.ele({n, ns})` | append a child element and **descend into it** (the return value is the child) |
| `.tag({n, ns})` | append a child element and **stay** on the current node (the return value is `this`) |
| `.a({n, v})` | set attribute `n` on the current node — or on the last child added with `.tag()` |
| `.a({n, b})` | same, for a boolean: `b` is rendered as `"true"` / `"false"` |
| `.end()` | go back up to the parent node |
| `.stringify()` | render the whole tree to an XML string |

Every method accepts its main argument positionally as well, so
`.ele("Page")` is the same as `.ele({ n: "Page" })` — the samples mix both.

## `.ele()` vs `.tag()`

This is the one thing worth internalising, because the two look
interchangeable and are not:

```js
page.ele(`Button`).a({ n: `text`, v: `A` });   // now positioned ON the button
page.tag(`Button`).a({ n: `text`, v: `B` });   // still positioned on the page
```

Use `.ele()` for containers you want to nest into (and `.end()` to come back
out), `.tag()` for leaves. A chain that has silently descended one level too
far is the usual cause of controls ending up nested inside their sibling.

## Namespaces are yours to declare {#namespaces}

The builder does not know which UI5 library a control belongs to, so **you**
declare the namespace and prefix the element. This is the single most common
way to break a view, and it breaks it hard: an unprefixed tag resolves against
the default `xmlns`, so `<SimpleForm>` under `xmlns="sap.m"` becomes a request
for `sap/m/SimpleForm.js` and the whole view fails to **load** — no partial
render, just a `ModuleError` in the console.

```js
const view = z2ui5_cl_ui5_view_builder.factory()
  .ele({ n: `View`, ns: `mvc` })
  .a({ n: `xmlns`,      v: `sap.m` })
  .a({ n: `xmlns:mvc`,  v: `sap.ui.core.mvc` })
  .a({ n: `xmlns:core`, v: `sap.ui.core` })
  .a({ n: `xmlns:form`, v: `sap.ui.layout.form` });

view.ele(`Shell`).ele(`Page`)
  .ele({ n: `SimpleForm`, ns: `form` })      // sap.ui.layout.form
  .ele({ n: `content`,    ns: `form` })      // …and so is its aggregation
  .tag({ n: `Title`,      ns: `core` })      // sap.ui.core
  .a({ n: `text`, v: `Hi` });
```

Aggregations take the namespace of the control that owns them — `content` on
a `form:SimpleForm` is `form:content`, `items` on a `List` is unprefixed like
the `List` itself.

## Popups

A popup is a fragment, not a view, so the root element differs:

```js
const view = z2ui5_cl_ui5_view_builder.factory()
  .ele({ n: `FragmentDefinition`, ns: `core` })
  .a({ n: `xmlns`,      v: `sap.m` })
  .a({ n: `xmlns:core`, v: `sap.ui.core` });

view.ele(`Dialog`).a({ n: `title`, v: `Confirm` });
client.popup_display(view.stringify());
```

## Custom controls

Custom controls live in the `z2ui5` namespace, declared as `z2ui5.cc`:

```js
view.a({ n: `xmlns:z2ui5`, v: `z2ui5.cc` });
view.tag({ n: `Info`, ns: `z2ui5` }).a({ n: `ui5_version`, v: client._bind(this.version) });
```

## Constraints

- `.a()` asserts that the attribute is not already set on the node — setting
  the same attribute twice throws rather than quietly winning last.
- `.a()` also asserts the node is a real element; attributes cannot be set on
  the tree root before the first `.ele()`.
- There are no `.content()` / `.items()` shorthands: an aggregation is an
  ordinary element you write yourself.
