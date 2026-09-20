# Migrating from abap2UI5

If you know abap2UI5, you already know cap2UI5. Same pattern, same roundtrip,
same frontend, same framework — literally the same framework, since the plugin
runs upstream's own runtime. What changes is the **language your app is written
in** and **where its state is stored**.

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
  IF client->check_on_init( ).
    client->view_display( ... ).
    RETURN.
  ENDIF.
  IF client->get( )-event = 'GO'.
    client->message_box_display( |Hello { name }| ).
  ENDIF.
ENDMETHOD.
```

```js
// cap2UI5
const { defineApp } = require("cap2ui5");

defineApp("ZCL_MY_APP", class {
  name = "";

  main(c) {
    if (c.isDisplay) {
      c.view(/* … */);
      return;
    }
    if (c.eventName === "GO") c.messageBox(`Hello ${this.name}`);
  }
});
```

## The translation table

| abap2UI5 | cap2UI5 |
|---|---|
| `CLASS … INTERFACES z2ui5_if_app` | `defineApp("NAME", class { … })` |
| `DATA name TYPE string` | `name = ""` |
| `DATA amount TYPE p LENGTH 9 DECIMALS 2` | `amount = t.packed(9, 2)` |
| `DATA rows TYPE ty_t_row` | `rows = t.table({ … })` |
| `z2ui5_if_app~main` | `main(c)` |
| `client->check_on_init( )` | `c.isFirstRun` |
| `client->check_on_navigated( )` | `c.isDisplay` ← **render on this one** |
| `client->get( )-event` | `c.eventName` |
| `client->get_event_arg( 1 )` | `c.eventArg(1)` |
| `client->_bind( name )` | `c.bind("name")` — a **name**, not a value |
| `client->_bind_edit( name )` | `c.bind("name")` — binding is two-way; there is no separate variant |
| `client->_event( 'GO' )` | `c.event("GO")` |
| `client->view_display( xml )` | `c.view(xml)` |
| `client->popup_display( xml )` | `c.popup(xml)` |
| `client->message_box_display( t )` | `c.messageBox(t)` |
| `client->message_toast_display( t )` | `c.messageToast(t)` |
| `client->nav_app_call( app )` | `c.navTo(app)` |
| `client->nav_app_leave( )` | `c.navBack({ event, data })` |
| `client->get_app_prev( )` | `c.prevApp` |
| anything else on `z2ui5_if_client` | `c.raw.z2ui5_if_client$<method>( … )`, async |

## The three differences that actually bite

**`_bind` takes a name, not a value.** In ABAP, `client->_bind( name )` passes
the attribute and the framework matches it by reference. JavaScript cannot do
that — two empty strings are indistinguishable — so the facade takes the field
name and resolves the binding for you.

**Render on `isDisplay`, not `isFirstRun`.** The same trap as in ABAP, with
clearer names: `check_on_init( )` is this instance's first roundtrip only, and
`check_on_navigated( )` is also every return from a navigation. The JS facade
renames them to say which is which.

**Views are XML strings.** abap2UI5's fluent builder exists in the runtime, but
the facade does not expose it: in JavaScript a template literal is shorter than
a chain. See [Views](./views).

```abap
client->view_display( z2ui5_cl_ui5_view_builder=>factory(
  )->ele( `Page` )->tag( `Input` )->a( ... )->stringify( ) ).
```

```js
c.view(`<Page><Input value="${c.bind("name")}"/></Page>`);
```

## What is genuinely different

| | abap2UI5 | cap2UI5 |
|---|---|---|
| state lives in | `Z2UI5_T_01`, an ABAP table | `cap2ui5.Drafts`, a CDS entity in **your** database |
| identity | `sy-uname` | `cds.context.user.id` |
| data access | Open SQL | `cds.ql` — and CAP's remote services |
| deployment | abapGit into a system | `npm i` into a CAP project |

## Porting an existing app

There is no automatic converter, and the honest reason is that the interesting
part — Open SQL to `cds.ql`, ABAP types to declared fields — is exactly the part
a converter would get wrong. The table above covers the framework calls; the
rest is your business logic, which you are better placed to translate.

Start with the smallest app you have. The structure carries over almost
untouched, and the first one takes an afternoon.

## Next

- [**App Lifecycle**](./lifecycle) — the predicates, in detail
- [**Data Binding**](./data-binding) — the type declarations
- [**cap2UI5 vs. abap2UI5**](./vs-abap2ui5) — when to use which
