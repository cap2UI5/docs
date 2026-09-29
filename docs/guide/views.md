# Views

A view is **UI5 XML, as a string**, handed to `client.view_display()`.

```js
client.view_display(
  `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" displayBlock="true" height="100%">` +
  `<Shell><Page title="My app">` +
  `<Input value="${client._bind("name")}"/>` +
  `<Button text="Go" press="${client._event("GO")}" type="Emphasized"/>` +
  `</Page></Shell></mvc:View>`);
```

There is no control catalogue to wait for, and nothing between you and UI5:
anything you can write in a UI5 XML view, you can write here, including
controls the framework has never heard of. abap2UI5's own view builder is
there as well, for a view built the way an ABAP app builds one — see
[The view builder](#the-view-builder).

## The two holes you fill

| | |
|---|---|
| `${client._bind("field")}` | a binding path to one of your fields |
| `${client._event("NAME")}` | a handler expression; `client._event({ val: "NAME", t_arg: ["arg"] })` sends arguments with it |

Everything else is plain UI5. What `_event()` — and a `_bind()` with options —
returns is a placeholder that becomes the real expression after `main()`:
embed it as it is, and do not cut or rebuild it.

## The shape

- a **view** is an `mvc:View`, usually `<Shell><Page>…</Page></Shell>`;
- a **popup** is a `core:FragmentDefinition` — see [Popups](./popups);
- a **nested view** is an `mvc:View` again, rendered into a control of the main
  view.

Declare the namespaces you use on the root element. `xmlns="sap.m"` for the
common controls, `xmlns:mvc="sap.ui.core.mvc"`, plus whatever else you reach
for (`sap.ui.layout.form`, `sap.ui.table`, …).

## Template literals are the point

The view is a string, so composing it is ordinary JavaScript:

```js
const column = (t) => `<Column><Text text="${t}"/></Column>`;

client.view_display(
  `<Table items="${client._bind("books")}">` +
  `<columns>${["Title", "Author", "Price"].map(column).join("")}</columns>` +
  `<items><ColumnListItem><cells>` +
  `<Text text="{TITLE}"/><Text text="{AUTHOR}"/><ObjectNumber number="{PRICE}"/>` +
  `</cells></ColumnListItem></items></Table>`);
```

Row fields inside a table's template are **uppercase** — `{TITLE}` — and are
bound relative to the row, so they need no `client._bind()`.

::: warning Interpolating user input into markup is an injection
`${client._bind(…)}` and `${client._event(…)}` are framework-produced and
safe. A value a user typed is not:

```js
client.view_display(`<Text text="${this.name}"/>`);              // ❌ the user writes the markup
client.view_display(`<Text text="${client._bind("name")}"/>`);   // ✅ bound, escaped by UI5
```

Bind it. If you genuinely need a value in the markup rather than in the model,
escape it yourself first — or build the view with the view builder, whose
`a({ n, t })` renders a text literally.
:::

## When to re-render

- **changed bound data** → nothing to do. It is pushed to the view, and to an
  open popup, popover or nested view, on its own.
- **changed view structure** — a column appears, a button becomes visible → call
  `client.view_display()` again.

`client.view_model_update()` and the other `*_model_update()` methods are
declared obsolete in `z2ui5_if_client` and do nothing, here as in ABAP: an app
that calls one ports unchanged, and loses nothing by dropping the call.

## The view builder

abap2UI5's `z2ui5_cl_ui5_view_builder` is exported by the plugin, under its
own name and called as the client is — one positional argument, or the
parameters by name as one object:

```js
import { defineApp, z2ui5_cl_ui5_view_builder } from "@cap2ui5/cds-plugin";

defineApp("HELLO_BUILDER", class {
  name = "";

  main(client) {
    if (client.check_on_navigated()) {
      const view = z2ui5_cl_ui5_view_builder.factory()
          .ele({ n: "View", ns: "mvc" })
              .a({ n: "xmlns", v: "sap.m" })
              .a({ n: "xmlns:mvc", v: "sap.ui.core.mvc" })
              .a({ n: "displayBlock", b: true })
              .ele("Shell")
                  .ele("Page")
                      .a({ n: "title", v: "Hello" })
                      .tag("Input")
                          .a({ n: "value", v: client._bind("name") })
                      .tag("Text")
                          .a({ n: "text", t: "{shown as typed}" })
                      .tag("Button")
                          .a({ n: "text", v: "Go" })
                          .a({ n: "press", v: client._event("GO") });
      client.view_display(view.stringify());
      return;
    }
    if (client.check_on_event("GO")) client.message_box_display(`Hello ${this.name}`);
  }
});
```

| | |
|---|---|
| `z2ui5_cl_ui5_view_builder.factory()` | an empty root; open the `mvc:View` and declare its `xmlns` yourself |
| `ele(n)`, `ele({ n, ns })` | add a child element and descend into it |
| `tag(n)`, `tag({ n, ns })` | add a child element and stay: the form for a leaf |
| `a({ n, v })`, `a({ n, b })`, `a({ n, t })` | an attribute on the child just added (or on the node itself while it has none): `v` as it is — bindings, events, constant text; `b` a boolean; `t` text rendered literally, so a `{` is shown rather than read as a binding |
| `end()` | ascend to the parent |
| `stringify()` | the XML — rendered after `main()`, so hand it to `view_display()` as it is |

The chain is recorded while `main()` runs and rendered after it by the
transpiled `z2ui5_cl_ui5_view_builder` the runtime carries. The XML, its
escaping and its refusals — an `end()` past the root, a duplicate attribute —
are exactly those of the same chain in an ABAP app, and `_bind()` and
`_event()` placeholders come through its escaping intact. `view_display()`,
`popup_display()`, `popover_display()` and the nested views take a builder's
`stringify()` as well as XML text. `ViewBuilder` is the same class under a
JavaScript name.

Template literal or builder is a matter of taste in a new app. The builder is
what an app ported from ABAP already has — and what
[`npx --no-install cap2ui5 abap2js`](./migration-from-abap2ui5#translate-it-cap2ui5-abap2js)
writes.

## The ABAP view builder

An app can also stay in ABAP: a `z2ui5_if_app` class, transpiled against the
runtime the plugin hosts, runs beside the JavaScript apps. That is the route
for a class you would rather not translate — the
[translation](./migration-from-abap2ui5#translate-it-cap2ui5-abap2js) is
the other one.

### An app in ABAP

A normal `z2ui5_if_app` class that uses `z2ui5_cl_ui5_view_builder`, transpiled
against the runtime the plugin hosts. The steps are the ones in the
`@abap2ui5/node-runtime` README, with three additions for a CAP project.

`abap/zcl_my_app.clas.abap` — an input and a button, built with the builder:

```abap
CLASS zcl_my_app DEFINITION PUBLIC FINAL CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES z2ui5_if_app.
    DATA name TYPE string.

  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.


CLASS zcl_my_app IMPLEMENTATION.

  METHOD z2ui5_if_app~main.
    DATA view TYPE REF TO z2ui5_cl_ui5_view_builder.

    IF client->check_on_init( ) IS NOT INITIAL.

      view = z2ui5_cl_ui5_view_builder=>factory(
          )->ele( n = `View` ns = `mvc`
              )->a( n = `xmlns`         v = `sap.m`
              )->a( n = `xmlns:mvc`     v = `sap.ui.core.mvc`
              )->a( n = `displayBlock`  v = `true`
              )->ele( `Page`
                  )->a( n = `title`  v = `My ABAP app`
                  )->tag( `Input`
                      )->a( n = `value`  v = client->_bind_edit( name )
                  )->tag( `Button`
                      )->a( n = `text`   v = `Post`
                      )->a( n = `press`  v = client->_event( `POST` ) ).

      client->view_display( view->stringify( ) ).

    ELSEIF client->check_on_event( `POST` ) IS NOT INITIAL.
      client->message_toast_display( |Hello { name }| ).
    ENDIF.

  ENDMETHOD.

ENDCLASS.
```

Install the transpiler at exactly the version the runtime was built with:

```bash
npm install --save-dev --save-exact @abaplint/transpiler-cli@$(node -p "require('@abap2ui5/node-runtime/package.json').abap2ui5.transpiler")
```

Without `--save-exact`, npm saves a caret range, and a later install can drift
away from the runtime.

`abap_transpile.json`, with your classes in `abap/`:

```json
{
  "input_folder": "abap",
  "output_folder": "output",
  "libs": [
    { "folder": "/node_modules/@abap2ui5/node-runtime/downport", "files": "/**/*.*" },
    { "url": "https://github.com/open-abap/open-abap-core", "folder": "/deps/open-abap-core" }
  ],
  "write_unit_tests": false,
  "options": { "ignoreSyntaxCheck": false, "addFilenames": true, "unknownTypes": "runtimeError" }
}
```

```bash
git clone --depth 1 https://github.com/open-abap/open-abap-core deps/open-abap-core
npx abap_transpile abap_transpile.json
mkdir -p srv/abap && cp output/zcl_my_app.clas.mjs srv/abap/
```

- **Clone open-abap-core once.** The transpiler uses `deps/open-abap-core`
  when the folder exists; otherwise it clones into a temporary folder on every
  run.
- **Copy only your own class.** `output/` also receives a full second copy of
  the framework and of open-abap-core. Your class file has no imports: it
  resolves everything through the runtime that is already running.
- **Put it under `srv/`.** `cds build --production` copies `srv/`, not a
  top-level `output/`. Never point `output_folder` at `srv/apps`.

Then load it with one app module, `srv/apps/abap-apps.mjs`. The plugin imports
app modules after the runtime has booted, which is when a transpiled class can
register itself:

```js
await import("../abap/zcl_my_app.clas.mjs");
```

`?app_start=ZCL_MY_APP` starts it (lowercase works too), and its state survives
roundtrips like any app's. The transpile type-checks against the framework, so
a misspelled builder method fails there rather than at runtime. The startup
lines list only the apps registered with `defineApp`, not ABAP apps.

## Next

- [**Data Binding**](./data-binding) — the types behind `client._bind()`
- [**Events**](./events) — the handlers behind `client._event()`
- [**Popups & Toasts**](./popups) — fragments and nested views
