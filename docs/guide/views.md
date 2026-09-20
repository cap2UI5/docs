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
It is in the runtime and ABAP apps use it — but the plugin's facade does not
expose it, because in JavaScript a template literal is shorter and clearer than
a builder chain. If you want it, it is reachable through `c.raw`.

## Next

- [**Data Binding**](./data-binding) — the types behind `c.bind`
- [**Events**](./events) — the handlers behind `c.event`
- [**Popups & Toasts**](./popups) — fragments and nested views
