# API: `defineApp` and `t`

```js
const { defineApp, t } = require("cap2ui5");
```

Two exports. `defineApp` registers a class as an app; `t` declares the field
types that cannot be inferred from a literal.

## `defineApp(name, class, opts?)`

```js
defineApp("ZCL_HELLO", class {
  name = "";

  main(c) { /* … */ }
});
```

| | |
|---|---|
| `name` | the app's name **on the wire** — what `?app_start=` takes and `c.navTo()` resolves. Uppercased. The file name is irrelevant |
| `class` | a plain class with a `main(c)` method and its state as fields |
| `opts.interfaces` | rarely needed; defaults to `["Z2UI5_IF_APP", "IF_SERIALIZABLE_OBJECT"]` |

It returns the wrapped class and registers it, so `defineApp` may be called
more than once per file.

Without a `main`, it throws:

```
defineApp(ZCL_HELLO): the class needs a main( client ) method
```

### `main(c)` is synchronous

No `async`, no `await` for anything the framework offers. Make it `async` only
when **your app** does I/O:

```js
async main(c) {
  this.books = await SELECT.from(cds.entities("my.bookshop").Books);
}
```

The wrapper awaits it either way.

### State is the fields

Every field with an initial value becomes part of the model and survives the
roundtrip. A field the plugin cannot type is left out and **named in a
warning**, never silently dropped.

## `t` — the type declarations

A field's type comes from its initial value where that is unambiguous. Where it
is not, declare it:

| | |
|---|---|
| `t.string()` | `string` — same as `""` |
| `t.int()` | integer — same as `0` |
| `t.float()` | float — same as `1.5` |
| `t.bool()` | `abap_bool`; the app sees `true`/`false` — same as `false` |
| `t.char(len)` | fixed-width character |
| `t.packed(len, dec)` | **packed decimal.** Use this for money |
| `t.struct({…})` | a structure. A plain object literal is one implicitly |
| `t.table(row)` | a table; the argument is one **row** |

```js
price = t.packed(9, 2);
books = t.table({ ID: 0, title: "", price: t.packed(9, 2) });
addr  = { street: "", zip: 0 };            // t.struct is implicit here
```

Numbers are the ambiguity worth knowing: ABAP has `I`, `P` and `F` and they
render with different decimals, so an integer literal becomes `I`, a fractional
one `F`, and a decimal amount has to say so with `t.packed()`. Guessing would
produce a view with the wrong number of decimals and nothing to point at.

Structures and tables nest, to a depth of 8 — a cycle guard rather than a
judgement. See [Data Binding](../guide/data-binding).

## Next

- [**`c` — the client facade**](./client) — what `main` receives
- [**Data Binding**](../guide/data-binding) — the types in practice
