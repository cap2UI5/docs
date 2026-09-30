# Migrating from abap2UI5

If you know abap2UI5, you already know cap2UI5. Same pattern, same roundtrip,
same frontend, same framework — literally the same framework, since the plugin
runs upstream's own runtime. And the same client: what `main( client )`
receives is `z2ui5_if_client`, under its ABAP method names. What changes is
the **language your app is written in** and **where its state is stored**.

## The mental model does not change

Roundtrips, the draft chain, the app stack, value helps as apps, one class per
app — all identical, because it is the same code answering.

## What an app looks like on each side

```abap
" abap2UI5
CLASS zcl_my_app DEFINITION PUBLIC.
  PUBLIC SECTION.
    INTERFACES z2ui5_if_app.
    DATA name TYPE string.
ENDCLASS.

METHOD z2ui5_if_app~main.
  IF client->check_on_navigated( ).
    client->view_display( ... ).
  ELSEIF client->check_on_event( `GO` ).
    client->message_box_display( |Hello { name }| ).
  ENDIF.
ENDMETHOD.
```

```js
// cap2UI5
import { defineApp } from "@cap2ui5/cds-plugin";

defineApp("ZCL_MY_APP", class {
  name = "";

  main(client) {
    if (client.check_on_navigated()) {
      client.view_display(/* … */);
    } else if (client.check_on_event("GO")) {
      client.message_box_display(`Hello ${this.name}`);
    }
  }
});
```

Line for line. `client->method( )` is `client.method()`; a method's preferred
parameter is its one positional argument, and parameters by name are one
object with the ABAP names. [abap2UI5's documentation](https://abap2ui5.github.io/docs/)
of a method is therefore the documentation of the JavaScript one; the
[Client API](../api/client) lists them all.

## The translation table

| abap2UI5 | cap2UI5 |
|---|---|
| `CLASS … INTERFACES z2ui5_if_app` | `defineApp("NAME", class { … })` |
| `DATA name TYPE string` | `name = ""` |
| `DATA amount TYPE p LENGTH 9 DECIMALS 2` | `amount = t.packed(9, 2)` |
| `TYPE n`, `d`, `t` | `t.numc(n)`, `t.date()`, `t.time()` |
| `DATA rows TYPE ty_t_row` | `rows = t.table({ … })` |
| `z2ui5_if_app~main` | `main(client)` |
| `client->check_on_init( )` | `client.check_on_init()` |
| `client->check_on_navigated( )` | `client.check_on_navigated()` ← **render on this one** |
| ``client->check_on_event( `GO` )`` | `client.check_on_event("GO")` |
| `client->get_event_arg( 1 )` | `client.get_event_arg(1)` |
| `client->_bind( name )`, `_bind( s_order-customer )` | `client._bind("name")`, `client._bind("s_order-customer")` — a **name**, not a value |
| `client->_bind( val = t_tab path = abap_true )` | `client._bind({ val: "t_tab", path: true })` |
| ``client->_event( val = `GO` t_arg = VALUE #( ( `x` ) ) )`` | `client._event({ val: "GO", t_arg: ["x"] })` |
| `client->follow_up_action( val = z2ui5_if_client=>cs_event-set_title t_arg = … )` | `client.follow_up_action({ val: z2ui5_if_client.cs_event.set_title, t_arg: [ … ] })` |
| `client->view_display( view->stringify( ) )` | `client.view_display(view.stringify())` |
| ``client->message_box_display( text = … type = `error` )`` | `client.message_box_display({ text: …, type: "error" })` |
| `client->nav_app_call( NEW zcl_other( ) )` | `client.nav_app_call("ZCL_OTHER")` |
| `client->nav_app_leave( event = … r_data = … )` | `client.nav_app_leave({ event, r_data })` |
| `client->get( )-r_event_data` | `client.get().r_event_data` |
| `z2ui5_cl_ui5_view_builder=>factory( )->ele( … )` | `z2ui5_cl_ui5_view_builder.factory().ele(…)` |

Every method of the interface is there under its name — the plugin's tests
hold the client to the interface, so none is missing and none is invented.
`z2ui5_if_client` and `z2ui5_cl_ui5_view_builder` are imported from
`@cap2ui5/cds-plugin`.

## What is JavaScript's own

**`_bind` takes a name, not a value.** In ABAP, `client->_bind( name )` passes
the attribute and the framework matches it by reference. A JavaScript value
cannot carry one — two empty strings are indistinguishable — so the field is
named: `client._bind("name")`. A cell of a table is
`{ val: column, tab: "t_tab", tab_index: 2 }`.

**Some answers come after `main()`.** What `_event()`, a `_bind()` with
options and `follow_up_action()` in a view attribute return is a placeholder
that becomes the wire after `main()` returns — embed it as it is. `main()`
stays synchronous; make it `async` only for your own I/O.

**`client.get_app( id )`** answers the app behind a draft id as a handle whose
fields can be written — `app.backend_event = "…"`, then
`client.nav_app_leave(app)` — but not read. Reading the other app is
`client.get_app_prev()`, as plain values.

**`client.nav_app_call( app, fields )`** presets the called app's fields —
what an ABAP app does between `NEW` and `nav_app_call( )`.

**A bound field is model.** Every field with an initial value is kept in the
draft, and one the app binds is sent to the browser and written back — as
abap2UI5 does for an ABAP app's attributes. There is no `PROTECTED SECTION`,
and none is needed to keep a field out of the browser: don't bind it. Fields
are named in snake_case, as ABAP attributes are — `defineApp` refuses a
camelCase one. A helper method that needs the client gets
it as in ABAP, `this.client = client` in `main()`, without declaring it as a
field.

**What is not there.** `client.set_session_stateful()` throws — the app's
state is in its fields, which are in the draft. The obsolete
`*_model_update()` do nothing, as they do in ABAP, and `_bind_edit()` is
`_bind()`. `client.raw` is the transpiled `z2ui5_if_client` itself,
asynchronous, for what an app should never need.

**Render on `check_on_navigated()`, not `check_on_init()`.** The same trap as
in ABAP: `check_on_init()` is this instance's first roundtrip only, and
`check_on_navigated()` is also every return from a navigation.

## What is genuinely different

| | abap2UI5 | cap2UI5 |
|---|---|---|
| state lives in | `Z2UI5_T_01`, an ABAP table | `cap2ui5.Drafts`, a CDS entity in **your** database |
| identity | `sy-uname` | `cds.context.user.id` |
| data access | Open SQL | `cds.ql` — and CAP's remote services |
| deployment | abapGit into a system | `npm i` into a CAP project |

## Translate it: `cap2ui5 abap2js`

Because the client and the view builder are abap2UI5's own, an app class
translates line for line — and the plugin does it:

```bash
npm add -D @abaplint/core      # once: the ABAP parser it reads with
npx --no-install cap2ui5 abap2js src/zcl_my_app.clas.abap --out srv/apps
```

It needs `@cap2ui5/cds-plugin` installed in the project: `--no-install` makes
npx run the `cap2ui5` of the project's `@cap2ui5/cds-plugin` or fail — never
download one. In a `package.json` script the command is
`cap2ui5 abap2js …`, which runs the installed one as well.

`zcl_my_app.clas.abap` becomes `srv/apps/zcl_my_app.js`, registered as
`ZCL_MY_APP`, so `?app_start=` is the same on both sides. A view chain keeps
one call per line, `VALUE #( )` one row per line, and comments and texts come
along untouched. A directory translates every class in it; `--check` writes
nothing and fails when a module is missing or would change, for CI.

It knows the part of ABAP an abap2UI5 app is written in — attributes and
`TYPES`, `VALUE #( )`, `COND`/`SWITCH`, string templates, `IF`/`CASE`/`DO`,
the client's and the view builder's calls — and **refuses everything else**
with file, row and column rather than guess:

```
refused: z2ui5_cl_x.clas.abap:41:7 - LOOP AT ... ASSIGNING / REFERENCE INTO writes through the row - not supported yet
```

What it refuses is typically your business logic — Open SQL to `cds.ql`, a
field-symbol, a `sy-` field — and that part you are better placed to
translate. The options and the details of the translation are in the
plugin's [README](https://github.com/cap2UI5/cap2UI5/tree/main/plugin#an-abap-app-translated-cap2ui5-abap2js).

How far "line for line" goes is measured, not claimed: the
[`@cap2ui5/samples`](https://github.com/cap2UI5/samples) package is 71 of
abap2UI5's samples as cap2UI5 apps — 69 of them written by `abap2js`, two
ported by hand — and a differential test serves each beside its transpiled
ABAP original and compares every roundtrip. Add it with
`npm add -D @cap2ui5/samples`, and each sample starts under its ABAP class
name.

## Next

- [**App Lifecycle**](./lifecycle) — the predicates, in detail
- [**Data Binding**](./data-binding) — the type declarations
- [**Client API**](../api/client) — every method of `z2ui5_if_client`
- [**cap2UI5 vs. abap2UI5**](./vs-abap2ui5) — when to use which
