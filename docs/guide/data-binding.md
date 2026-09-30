# Data Binding

A field of your class becomes a model field when the app binds it.
`client._bind("name")` gives you the binding path to put in the view; from
then on the field is sent to the browser, the browser sends the value back,
and the framework applies it to the instance before your `main` runs. A field
the app never binds stays on the server — kept in the draft, never sent, never
overwritten by what a browser posts.

```js
defineApp("ZCL_HELLO", class {
  name = "";

  main(client) {
    if (client.check_on_navigated()) {
      client.view_display(`<Input value="${client._bind("name")}"/>`);
      return;
    }
    if (client.check_on_event("GO")) client.message_box_display(`Hello ${this.name}`);   // already applied
  }
});
```

No model, no manifest, no `setProperty`. Binding is two-way; there is no
separate "read-only bind".

## `client._bind` takes a field NAME

```js
client._bind("name")     // ✅
client._bind(this.name)  // ❌ — the value "", not a field
```

ABAP's `_bind( )` finds the attribute by reference, which a JavaScript value
cannot carry: two empty strings are indistinguishable. So the field is named. A
name that is not a field of the app throws and lists the ones that are:

```
client._bind( ): nmae is not a field of this app - in JavaScript the client takes a field's NAME, client._bind("name"), not its value. Known: name, count, books
```

A component of a structure is named as ABAP names it, with `-`:
`client._bind("order-customer-city")` is ABAP's `_bind( order-customer-city )`.

## Options, by name

`_bind`'s other parameters go by name, in one object with the ABAP names —
`client->_bind( val = t_tab path = abap_true )` is
`client._bind({ val: "t_tab", path: true })`:

| | |
|---|---|
| `path: true` | the bare path (`/NAME`) a composed binding needs, instead of `{/NAME}` |
| `tab`, `tab_index` | one cell of a table: `val` is then the column, `tab` the table field, `tab_index` the row, 1-based |
| `omit_initial`, `omit_initial_paths` | keep initial values out of the model |
| `json: true` | a string field spliced into the model as the JSON it holds |

```js
`<List items="{path: '${client._bind({ val: "rows", path: true })}', templateShareable: false}">`
`<Input value="${client._bind({ val: "title", tab: "rows", tab_index: 2 })}"/>`
`<Input value="${client._bind({ val: "sku", tab: "order-lines", tab_index: 1 })}"/>`
```

A component, a cell or an option makes the result a placeholder until `main`
returns — the framework registers it then. Embed it as it is.

## The types

A field's ABAP type comes from its **initial value**. The mapping is narrow on
purpose and refuses rather than guesses:

| you write | you get |
|---|---|
| `name = ""` | `string` |
| `count = 0` | integer (`I`) |
| `ratio = 1.5` | float (`F`) |
| `flag = false` | `abap_bool`, and the app sees `true`/`false` |
| `price = t.packed(9, 2)` | packed decimal — **declare this one** |
| `code = t.char(3)` | fixed-width character |
| `matnr = t.numc(10)` | `NUMC`: digits, kept with their leading zeros |
| `due = t.date()`, `at = t.time()` | `D` (`YYYYMMDD`) and `T` (`HHMMSS`), read and written as strings |
| `addr = { street: "", zip: 0 }` | a structure (`t.struct({ … })` says so explicitly) |
| `rows = t.table({ sku: "", qty: 0 })` | a table whose row is that structure |

`t.string()`, `t.int()`, `t.float()` and `t.bool()` declare the scalars without
an initial value. Numbers are the real ambiguity — ABAP has `I`, `P` and `F` and
they render with different decimals — so an integer becomes `I`, a fractional
literal `F`, and a decimal amount has to say so with `t.packed()`. Guessing
would produce views with the wrong number of decimals and nothing to point at.

## Tables

```js
defineApp("ZCL_BOOKS", class {
  books = t.table({ ID: 0, title: "", price: t.packed(9, 2) });

  async main(client) {
    if (client.check_on_navigated()) {
      client.view_display(
        `<Table items="${client._bind("books")}">` +
        `<columns><Column><Text text="Title"/></Column><Column><Text text="Price"/></Column></columns>` +
        `<items><ColumnListItem><cells>` +
        `<Text text="{TITLE}"/><ObjectNumber number="{PRICE}"/>` +
        `</cells></ColumnListItem></items></Table>`);
      return;
    }
    if (client.check_on_event("SEARCH")) {
      this.books = await SELECT.from(cds.entities("my.bookshop").Books);
    }
  }
});
```

Two things to note:

- **the model names are UPPERCASE in the view** — `{TITLE}`, `{PRICE}`, and a
  field `name` is `/NAME`. Component names are stored lowercase, as the
  transpiler does, and appear uppercase in the model;
- **assign the whole array.** `this.books = await SELECT…` replaces the table;
  the plugin rebuilds the rows. Pushing into the array you read back does not
  write through.

## Structures, and nesting

Structures nest, and tables nest inside them:

```js
order = {
  id: "",
  customer: { name: "", city: "" },
  lines: t.table({ sku: "", qty: 0, price: t.packed(9, 2) }),
};
```

The model carries `ORDER.CUSTOMER.CITY` and `ORDER.LINES[].PRICE`, decimals
included, through the draft and back. Bind a component by its ABAP name,
`client._bind("order-customer-city")`, and read the whole tree as plain values:

```js
const city = this.order.customer.city;
this.order = { ...this.order, customer: { name: "Ada", city: "London" } };
```

Assigning a structure is ABAP's `s = VALUE #( … )`: what the new value leaves out
is initial afterwards.

The depth limit is **8**, and it is a cycle guard rather than a judgement: an
object containing itself would otherwise recurse until the stack goes. A field
that cannot be typed is reported **by its path** and left out:

```
order.self.self.self.self.self.self.self.a is nested more than 8 levels deep.
```

## Fields with no type

`null`, `undefined` and `[]` carry no type. Such a field is left out of the
model and **named in a warning** rather than silently dropped:

```
[cap2ui5] - defineApp ZCL_ORDER: these fields are NOT part of the model —
  total has no ABAP type
  Give an initial value, or declare it with t.table(…) / t.struct(…) / t.packed(…) / t.char(…). The app runs without them.
```

Give it an initial value, or declare it with `t.table(…)` / `t.packed(…)`.

## Next

- [**Events**](./events) — `client._event` and its arguments
- [**View Builder**](./views) — what goes inside `client.view_display`
- [**Persistence**](./persistence) — what survives the roundtrip
- [**Client API**](../api/client) — every `_bind` option
