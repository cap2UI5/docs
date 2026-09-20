# Data Binding

A field of your class is a bound model field. `c.bind("name")` gives you the
binding path to put in the view; the browser sends the value back, and the
framework applies it to the instance before your `main` runs.

```js
defineApp("ZCL_HELLO", class {
  name = "";

  main(c) {
    if (c.isDisplay) {
      c.view(`<Input value="${c.bind("name")}"/>`);
      return;
    }
    if (c.eventName === "GO") c.messageBox(`Hello ${this.name}`);   // already applied
  }
});
```

No model, no manifest, no `setProperty`. Binding is two-way; there is no
separate "read-only bind".

## `c.bind` takes a field NAME

```js
c.bind("name")     // ✅
c.bind(this.name)  // ❌ — an empty string, and every field is one
```

A name is used rather than a value because a value cannot identify a field: two
empty strings are indistinguishable. A name that is not a bindable field throws
and lists the ones that are:

```
c.bind("nmae"): not a bindable field of this app — known: name, count, books
```

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
| `addr = { street: "", zip: 0 }` | a structure |
| `rows = t.table({ sku: "", qty: 0 })` | a table whose row is that structure |

Numbers are the real ambiguity — ABAP has `I`, `P` and `F` and they render with
different decimals — so an integer becomes `I`, a fractional literal `F`, and a
decimal amount has to say so with `t.packed()`. Guessing would produce views
with the wrong number of decimals and nothing to point at.

## Tables

```js
defineApp("ZCL_BOOKS", class {
  books = t.table({ ID: 0, title: "", price: t.packed(9, 2) });

  async main(c) {
    if (c.isDisplay) {
      c.view(
        `<Table items="${c.bind("books")}">` +
        `<columns><Column><Text text="Title"/></Column><Column><Text text="Price"/></Column></columns>` +
        `<items><ColumnListItem><cells>` +
        `<Text text="{TITLE}"/><ObjectNumber number="{PRICE}"/>` +
        `</cells></ColumnListItem></items></Table>`);
      return;
    }
    if (c.eventName === "SEARCH") {
      this.books = await SELECT.from(cds.entities("my.bookshop").Books);
    }
  }
});
```

Two things to note:

- **the row fields are UPPERCASE in the view** — `{TITLE}`, `{PRICE}`. Component
  names are stored lowercase, as the transpiler does, and appear uppercase in
  the model;
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
included, through the draft and back. Read the whole tree as plain values:

```js
const city = this.order.customer.city;
this.order = { ...this.order, customer: { name: "Ada", city: "London" } };
```

::: info This was documented as unsupported for a while. It was not.
Three pages said nested state could not be done. It could — the limitation was
one guard in the plugin's own type derivation, written when only scalars had
been tried. "Unsupported" must say whose limitation it is.
:::

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
[defineApp] ZCL_ORDER: these fields are NOT part of the model —
  total has no ABAP type: null, undefined and an empty array carry none.
```

Give it an initial value, or declare it with `t.table(…)` / `t.packed(…)`.

## Next

- [**Events**](./events) — `c.event` and its arguments
- [**View Builder**](./views) — what goes inside `c.view`
- [**Persistence**](./persistence) — what survives the roundtrip
