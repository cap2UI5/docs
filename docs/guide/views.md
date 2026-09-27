# Views

A view is **UI5 XML, as a string**, handed to `c.view()`.

```js
c.view(
  `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" displayBlock="true" height="100%">` +
  `<Shell><Page title="My app">` +
  `<Input value="${c.bind("name")}"/>` +
  `<Button text="Go" press="${c.event("GO")}" type="Emphasized"/>` +
  `</Page></Shell></mvc:View>`);
```

That is the whole API. There is no builder to learn, no control catalogue to
wait for, and nothing between you and UI5: anything you can write in a UI5 XML
view, you can write here, including controls the framework has never heard of.

## The two holes you fill

| | |
|---|---|
| `${c.bind("field")}` | a binding path to one of your fields |
| `${c.event("NAME")}` | a handler expression; `["arg"]` as a second parameter travels with it |

Everything else is plain UI5.

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

c.view(
  `<Table items="${c.bind("books")}">` +
  `<columns>${["Title", "Author", "Price"].map(column).join("")}</columns>` +
  `<items><ColumnListItem><cells>` +
  `<Text text="{TITLE}"/><Text text="{AUTHOR}"/><ObjectNumber number="{PRICE}"/>` +
  `</cells></ColumnListItem></items></Table>`);
```

Row fields inside a table's template are **uppercase** — `{TITLE}` — and are
bound relative to the row, so they need no `c.bind`.

::: warning Interpolating user input into markup is an injection
`${c.bind(…)}` and `${c.event(…)}` are framework-produced and safe. A value a
user typed is not:

```js
c.view(`<Text text="${this.name}"/>`);          // ❌ the user writes the markup
c.view(`<Text text="${c.bind("name")}"/>`);     // ✅ bound, escaped by UI5
```

Bind it. If you genuinely need a value in the markup rather than in the model,
escape it yourself first.
:::

## When to re-render

- **changed bound data** → nothing to do. It is pushed to the view, and to an
  open popup or nested view, on its own.
- **changed view structure** — a column appears, a button becomes visible → call
  `c.view()` again.

There is no `modelUpdate()`. It existed, called a framework method documented as
*obsolete and does nothing*, and now throws an error saying so.

## The ABAP view builder

abap2UI5 ships `z2ui5_cl_ui5_view_builder`, a fluent builder for the same XML.
It runs in the hosted runtime — the shipped `Z2UI5_CL_UI5_APP_HI_WORLD` is
built with it and works under cap2UI5. The facade does not expose it, and
`c.raw` does not reach it either: `z2ui5_if_client` has no reference to the
builder. In JavaScript a template literal is shorter and clearer than a builder
chain, so a JS app keeps `c.view` with `c.bind` and `c.event`.

If you want the builder, write the app in ABAP.

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

### From a JavaScript app

Reaching the transpiled class through the runtime's global,
`abap.Classes["Z2UI5_CL_UI5_VIEW_BUILDER"]`, or through the package's
`./output/*` export works, but it is awkward and unsupported: every call is
async, every result is dereferenced with `.get()`, and the app is coupled to
transpiler output.

::: warning `c.event()` does not survive the builder in cap2ui5 0.1.0
In the released cap2ui5 0.1.0, the placeholder `c.event()` returns does not
survive the builder's XML escaping: the response then carries a raw NUL and is
not valid JSON. With the builder, the event string has to come from `c.raw`
(`z2ui5_if_client$_event`). cap2UI5/cap2UI5#81 fixes it on `main`; no release
carries the fix yet.
:::

Keep template literals with `c.bind` and `c.event` in a JavaScript app.

## Next

- [**Data Binding**](./data-binding) — the types behind `c.bind`
- [**Events**](./events) — the handlers behind `c.event`
- [**Popups & Toasts**](./popups) — fragments and nested views
