# API: `client` — `z2ui5_if_client`

The single argument `main` receives. It is abap2UI5's `z2ui5_if_client`, by
its own method names: `client->check_app_prev_stack( )` is
`client.check_app_prev_stack()`. [abap2UI5's documentation](https://abap2ui5.github.io/docs/)
of a method is therefore the documentation of the JavaScript one; this page
lists them and says where JavaScript differs.

```js
defineApp("ZCL_X", class {
  main(client) { /* client is this page */ }
});
```

Two rules for every method:

- **Parameters.** A method's preferred parameter is its one positional
  argument; parameters by name are **one object** with the ABAP names.
  ``client->_event( val = `GO` t_arg = … )`` is
  `client._event({ val: "GO", t_arg: [ … ] })`. A second positional argument,
  or a name the method does not have, throws and lists the parameters.
- **Synchronous.** Queries are resolved before `main` runs; commands are
  recorded and carried out **in the order you called them** after it returns.
  No `await` for anything the client offers.

## Lifecycle and queries

| | |
|---|---|
| `client.check_on_init()` | `true` on the first roundtrip of **this app instance**, and only that one. Seed state here |
| `client.check_on_navigated()` | `true` on the first roundtrip **and** every time this app gets the screen back — a called app leaving, a value help closing, a bookmark restored. **Render here** |
| `client.check_on_event(val)` | whether this roundtrip answers the event `val`; without `val`, whether it answers any event |
| `client.check_app_prev_stack()` | `true` if there is an app to return to — for a Page's `showNavButton` |
| `client.get_event()` | the event this roundtrip answers; `""` on an app start |
| `client.get_event_arg(v)` | the *v*-th event argument, **1-based**, `1` by default. The first 8 are resolved up front; beyond that, `client.raw` |
| `client.get()` | what the frontend sent with this roundtrip, as plain values under the ABAP component names: `event`, the draft ids (`s_draft`), the browser location (`s_config`), device, focus and scroll information, and `r_event_data` — what a returning app handed over |
| `client.get_app_prev()` | the app on the other side of the last navigation — inside a called app its caller, back in the caller the app that just returned. A `defineApp` app as its fields' plain values, an ABAP app as the instance |
| `client.get_app()` | without an id, the running app itself |
| `client.get_app(id)` | the app behind a draft id. It is read from the draft store **after** `main`, so its fields can be written, not read; hand it to `nav_app_leave()` or `nav_app_call()` |
| `client.app_state_get_href()` | the absolute link to this app's current state |

`check_on_init()` implies `check_on_navigated()`. See [App Lifecycle](../guide/lifecycle)
for why rendering only on `check_on_init()` produces a screen that silently
does not refresh.

## Binding

| | |
|---|---|
| `client._bind(name)` | the binding of a field for a view attribute: `{/NAME}`. Takes the field's **name**, since a JavaScript value cannot carry a reference. Throws, listing the known fields, if it is not one |
| `client._bind("s_order-customer")` | a component of a structure field, named as ABAP names it (`.` works too) |
| `client._bind({ val, path: true })` | the bare path `/NAME`, for a composed binding |
| `client._bind({ val: column, tab, tab_index })` | one cell of a table field; `tab_index` is the row, 1-based |
| `client._bind({ val, omit_initial, omit_initial_paths, json, switch_default_model })` | `_bind( )`'s options, as in ABAP |
| `client._bind_path(name)` | the same as `_bind({ val: name, path: true })` |

```js
`<Input value="${client._bind("name")}"/>`
`<List items="{path: '${client._bind({ val: "rows", path: true })}', templateShareable: false}">`
`<Input value="${client._bind({ val: "title", tab: "rows", tab_index: 2 })}"/>`
```

A plain `_bind(name)` answers the binding itself. A component, a cell or an
option is registered by the framework after `main` returns, so it answers a
**placeholder** — embed it as it is, do not parse or compare it. See
[Data Binding](../guide/data-binding).

## Events and front-end actions

| | |
|---|---|
| `client._event(val)` | the handler of an event, for a view attribute |
| `client._event({ val, t_arg, arg, s_ctrl })` | with arguments: `t_arg` come back as `get_event_arg(1..n)`, `arg` is one more behind them. `s_ctrl` is `ty_s_event_control` by component name: `check_prevent_default`, `prevent_default_expr`, `check_arg_literal`, `check_queue_last`, `check_no_busy` |
| `client._event_nav_app_leave()` | the handler that leaves this app — a Page's `navButtonPress`, with no branch in `main` |
| `client.follow_up_action({ val, t_arg, view })` | a front-end action: `val` a `cs_event` constant, `view` the `cs_view` slot its control ids are meant in. **Embedded** in a view attribute it is a handler that runs in the browser, no roundtrip; **called on its own** it runs when this roundtrip's answer lands |

```js
`<Button text="red" press="${client._event({ val: "TAKE", t_arg: ["red"] })}"/>`
`<Button text="Focus" press="${client.follow_up_action({
    val: z2ui5_if_client.cs_event.set_focus, t_arg: ["search"] })}"/>`

client.follow_up_action({ val: client.cs_event.set_title, t_arg: [this.title] });
```

What `_event()`, `_event_nav_app_leave()` and an embedded `follow_up_action()`
return is a placeholder, replaced by the wire after `main` — embed it, do not
parse or compare it. A `cs_event` or `cs_view` value the runtime does not have
is refused with the list. See [Events](../guide/events).

## Views, popups, popovers, nested views

A view is XML text, a [`z2ui5_cl_ui5_view_builder`](../guide/views) chain, or
what its `stringify()` answered.

| | |
|---|---|
| `client.view_display(val)` | render the main view. An `mvc:View` |
| `client.view_destroy()` | remove it |
| `client.popup_display(val)` | a dialog on top. A `core:FragmentDefinition` |
| `client.popup_destroy()` | close it |
| `client.popover_display({ xml, by_id })` | a popover anchored to the control whose id is `by_id` |
| `client.popover_destroy()` | close it |
| `client.nest_view_display({ val, id, method_insert, method_destroy })` | render a view **into** the control `id` of the main view, which stays as it is. `method_insert` (e.g. `addContent`) is required; `method_destroy` (e.g. `removeAllContent`) clears what was there first — without it, every call adds one more |
| `client.nest_view_destroy()` | clear the nested slot |
| `client.nest2_view_display({ … })`, `client.nest2_view_destroy()` | the second nested slot, with the same contract |

```js
client.nest_view_display({
  val: `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"><VBox>…</VBox></mvc:View>`,
  id: "slot",
  method_insert: "addContent",
  method_destroy: "removeAllContent",
});
```

See [Views](../guide/views) and [Popups](../guide/popups).

## Messages

| | |
|---|---|
| `client.message_box_display(text)` | a dialog with an OK button. `text` may be data — an object, an array — laid out as for an ABAP structure or table |
| `client.message_box_display({ text, type, title, styleclass, onclose, actions, emphasizedaction, initialfocus, details })` | with its options; an object with a `text` key is the parameters by name |
| `client.message_toast_display(text)` | a transient toast |
| `client.message_toast_display({ text, duration, onclose })` | with its options |

## Navigation

| | |
|---|---|
| `client.nav_app_call(app)` | show another app on top of this one. `app` is a registered name, a `defineApp` class, an instance, or what `get_app(id)` answered |
| `client.nav_app_call(app, fields)` | cap2UI5's own: preset fields of the called app — what an ABAP app does between `NEW` and `nav_app_call( )`. An unknown field throws |
| `client.nav_app_leave()` | hand the screen back to the caller |
| `client.nav_app_leave({ app, event, r_data })` | … or to `app`. `event` is what the caller finds in `get_event()`, `r_data` what it finds in `get().r_event_data` — typed, object keys lowercase |

Both are scheduled for the end of the roundtrip, so they are usually the last
thing a branch does. See [Navigation](../guide/navigation).

## Hash and app state

| | |
|---|---|
| `client.hash_set(val)` | push a hash onto the browser history |
| `client.hash_replace(val)` | rewrite the hash without a history entry |
| `client.app_state_set_active(val = true)` | keep this app's state id in the URL |
| `client.app_state_get_href()` | the link to this state — see [Lifecycle and queries](#lifecycle-and-queries) |

## Constants

`client.cs_event`, `client.cs_view`, `client.cs_nav_mode`, `client.cs_device`
are the interface's constant structures. The same are exported as
`z2ui5_if_client`, as an ABAP app reads them:

```js
import { z2ui5_if_client } from "@cap2ui5/cds-plugin";

client.follow_up_action({ val: z2ui5_if_client.cs_event.location_reload });
```

## Escape hatch

| | |
|---|---|
| `client.raw` | the transpiled `z2ui5_if_client` itself. **Async** — every call needs `await` |

Its methods are the ABAP ones with `~` written as `$`, and they answer ABAP
values:

```js
const ninth = (await client.raw.z2ui5_if_client$get_event_arg({ v: 9, result: 1 })).get();
```

## Obsolete and unsupported

| | |
|---|---|
| `view_model_update()`, `popup_model_update()`, `popover_model_update()`, `nest_view_model_update()`, `nest2_view_model_update()` | obsolete in `z2ui5_if_client`; they **do nothing**, here as there. Changed bound data is pushed on its own |
| `_bind_edit()` | obsolete — `_bind()` under another name |
| `_event_client()` | obsolete — the embedded `follow_up_action()` under another name |
| `set_session_stateful()` | **not supported**, throws. The app's state is in its fields, which are in the draft |

The names of cap2UI5 0.1.0 (`c.isDisplay`, `c.bind()`, `c.navTo()` …) throw
an error naming the method that replaces each, rather than answering
`undefined`. The full mapping is in the plugin's
[CHANGELOG](https://github.com/cap2UI5/cap2UI5/blob/main/plugin/CHANGELOG.md), under 0.2.0.

## Next

- [**App Interface**](./app-interface) — `defineApp`, `t` and `defineExit`
- [**App Lifecycle**](../guide/lifecycle) — when each branch runs
