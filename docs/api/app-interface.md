# API: `defineApp` and `t`

```js
import { defineApp, defineExit, t } from "@cap2ui5/cds-plugin";
```

`defineApp` registers a class as an app; `t` declares the field types that
cannot be inferred from a literal; `defineExit` registers the one user exit —
it has [a page of its own](../guide/user-exit).

The package also exports `z2ui5_cl_ui5_view_builder` — abap2UI5's view
builder, see [Views](../guide/views) — and `z2ui5_if_client`, the client's
constants as an ABAP app reads them (`z2ui5_if_client.cs_event.set_title`).

## `defineApp(name, class, opts?)`

```js
defineApp("ZCL_HELLO", class {
  name = "";

  main(client) { /* … */ }
});
```

| | |
|---|---|
| `name` | the app's name **on the wire** — what `?app_start=` takes and `client.nav_app_call()` resolves. Uppercased. The file name is irrelevant |
| `class` | a plain class with a `main(client)` method and its state as fields |
| `opts.interfaces` | rarely needed; defaults to `["Z2UI5_IF_APP", "IF_SERIALIZABLE_OBJECT"]` |

It returns the wrapped class and registers it, so `defineApp` may be called
more than once per file.

Without a `main`, it throws:

```
defineApp(ZCL_HELLO): the class needs a main( client ) method
```

`client` is abap2UI5's `z2ui5_if_client`, by its own method names — see
[`client`](./client).

### `main(client)` is synchronous

No `async`, no `await` for anything the framework offers. Make it `async` only
when **your app** does I/O:

```js
async main(client) {
  this.books = await SELECT.from(cds.entities("my.bookshop").Books);
}
```

The wrapper awaits it either way.

### State is the fields

Every field with an initial value is kept in the draft and survives the
roundtrip. It reaches the browser only once the app **binds** it —
`_bind()`, `_bind_edit()`, `_bind_path()`, a component or a cell — and from
then on it stays bound, as the framework does for an ABAP app. So a field no
view shows is neither sent to the browser nor taken back from it; there is no
`PROTECTED SECTION` to hide it, and none is needed. A field the plugin cannot
type is left out and **named in a warning**, never silently dropped.

Three names `defineApp` refuses, each with a message that says what to write
instead:

- **a camelCase field** — `isAdmin = false`. A field is an ABAP attribute, and
  the runtime reads it by its lower-case name; write `is_admin`. Components of
  a structure and the class's methods may be camelCase.
- **a `#private` member** used in `main()` or a method it calls. They run on a
  proxy of the instance, which a private name does not reach. Use a plain
  field — it is not sent to the browser unless bound — or a module-level
  function.
- **an app name the runtime already has a class of** — the framework's own,
  one of its apps, the plugin's. `defineApp("Z2UI5_CL_UTIL", …)` would replace
  what every roundtrip runs.

Inside `main` and inside any method it calls, fields read and write as plain
values. A helper method that needs the client gets it as an ABAP app does —
`this.client = client` in `main`. Assigned there rather than declared as a
field, it is not part of the model or the draft:

```js
defineApp("ZCL_HELLO", class {
  name = "";

  view_display() {
    this.client.view_display(`<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m">` +
      `<Page title="Hello"><Input value="${this.client._bind("name")}"/></Page></mvc:View>`);
  }

  main(client) {
    this.client = client;
    if (client.check_on_navigated()) this.view_display();
  }
});
```

### Types in the editor

The package ships TypeScript declarations. In a JavaScript app, annotate the
client for completion and checked field names:

```js
/** @param {import("@cap2ui5/cds-plugin").Client<{ search: string }>} client */
main(client) { /* with type checking on, client._bind("serach") is an error */ }
```

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
| `t.numc(len)` | ABAP's `N`: digits, kept with their leading zeros. A string |
| `t.date()` | ABAP's `D`, `YYYYMMDD`. A string |
| `t.time()` | ABAP's `T`, `HHMMSS`. A string |
| `t.struct({…})` | a structure. A plain object literal is one implicitly |
| `t.table(row)` | a table; the argument is one **row**, the initial value is empty |

```js
price = t.packed(9, 2);
books = t.table({ ID: 0, title: "", price: t.packed(9, 2) });
addr  = { street: "", zip: 0 };            // t.struct is implicit here
cfg   = t.struct({ mode: "list", items: [{ key: "x" }] });
```

Numbers are the ambiguity worth knowing: ABAP has `I`, `P` and `F` and they
render with different decimals, so an integer literal becomes `I`, a fractional
one `F`, and a decimal amount has to say so with `t.packed()`. Guessing would
produce a view with the wrong number of decimals and nothing to point at.

Rows in a field initializer are its initial value — `rows = [{ id: 1, title: "first" }]`
is a table typed from its first row, starting with those rows.

Structures and tables nest, to a depth of 8 — a cycle guard rather than a
judgement. Component names are UPPERCASE in the model. See
[Data Binding](../guide/data-binding).

## `defineExit(exit)`

The framework's configuration hook — the CSP, the security headers, the UI5
bootstrap URL, the theme, the draft expiry, the CSRF gate. One per project,
registered from a file in the apps directory:

```js
defineExit({
  onPage(cfg, ctx) { /* the bootstrap page */ },
  onRoundtrip(cfg, ctx) { /* every roundtrip */ },
});
```

Both hooks are optional, `cfg` arrives with the framework's defaults, and only
what you change is written back. The fields, the defaults and why the exit is
registered rather than discovered: [The User Exit](../guide/user-exit).

## Next

- [**`client` — `z2ui5_if_client`**](./client) — what `main` receives
- [**Data Binding**](../guide/data-binding) — the types in practice
- [**The User Exit**](../guide/user-exit) — `defineExit` in full
