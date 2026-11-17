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
| `client.get_event_arg(v)` | the *v*-th event argument, **1-based**, `1` by default, and `""` past the last one, as in ABAP. Up to 0.4.0 only the first 8 could be read |
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
| `client.view_display({ val, transition, transition_back })` | … with a page transition — see [Transitions](#transitions) |
| `client.view_display({ val, switch_default_model_path, switch_default_model_anno_uri })` | `view_display( )`'s other two options, as in ABAP: an OData V2 service as the view's default model |
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

### Transitions

Since plugin 0.4.0 — the first whose runtime has them — `view_display( )` can
bring the new main view in with a page transition:

```js
if (client.check_on_navigated()) {
  client.view_display({ val: view, transition: client.cs_transition.slide });
}
```

| `client.cs_transition` | |
|---|---|
| `slide` | the new page comes in from the right |
| `base_slide` | the classic full-width slide. UI5 1.74 and newer; an older release plays `slide` |
| `fade` | the pages cross-fade |
| `flip` | the page turns over |
| `show` | no animation, but the old page stays up until the new one is built |

They are the names `sap.m.NavContainer.to( )` takes, and abap2UI5's rules
apply as they are:

- Without `transition` the view is swapped with no animation, as before.
- Pass it where the **screen** changes — the `check_on_navigated()` branch —
  not on every re-render.
- Going back, the page being left runs the transition it arrived with in
  reverse, whatever is passed.
- `transition_back: true` plays the change as a way **back**, for an app that
  steps back between its own screens — a wizard's Previous button. It is not
  needed after `nav_app_leave()` or the browser's Back button.

`cs_transition` is read from the runtime, like the other constants. On a
runtime from before transitions existed — the one plugin 0.3.x pins —
`client.cs_transition` is `undefined` and a `view_display( )` that sets
`transition` throws, naming the runtime, instead of silently doing nothing.

## The windowed table

Since plugin 0.6.0, whose runtime — `@abap2ui5/node-runtime` `1.149.0` — is
the first that has it. On an older runtime (an `overrides` to the one before,
say) the client does not have the two methods. A call throws, naming the
runtime in use, and the app's roundtrip fails with a 500:

```
client.window_bind_tab( ): z2ui5_if_client has no window_bind_tab in the abap2UI5 runtime this project runs on (@abap2ui5/node-runtime <version>) - it came with a later release
```

::: info What is measured here
With plugin 0.6.0 and the example app in cap2UI5
(`examples/bookshop/srv/apps/window.js` — 300 rows, a window of 50), on the
wire and in a headless browser: the first answer with 50 rows and the window's
state; the next window without `main( )` running; sorting and filtering from
the list and from the app; `window_get_row( )`; an edit in a sorted window
landing in its own row; a table inside a structure; the refusals; and the
error above on the older runtime. In the browser a growing `sap.m.Table` was
used — a scrolling `sap.ui.table.Table` was not run. One thing looked off
there: after the app's own filter cut the total from 300 to 100, the list's
counter still read `[ 100 / 300 ]`, though the server had answered a `TOTAL`
of 100. Whether that is the frontend or stale text was not followed up.
:::

They are abap2UI5's windowed table: a **large** table bound to a list control
goes to the browser a window of rows at a time instead of whole.

| | |
|---|---|
| `client.window_bind_tab(name)` | the binding of a table field for a list control's `items` or `rows`, as `_bind( )` answers it |
| `client.window_bind_tab({ val, window, t_sort, t_filter })` | with its options. `window` is the rows the browser gets at a time, 100 unless set. `t_sort` is `[{ path, descending }]`, `t_filter` is `[{ group, path, operator, value1, value2 }]` — `path` a column of the table |
| `client.window_get_row({ val, row })` | which row of the table a row of the browser shows. `row` is the position there, **counted from 1** — the index of a binding path an event hands over, plus 1. Answers the row of the table, counted from 1, and `0` past the rows the filter lets through |

- The control asks the framework for the next rows itself as it grows or
  scrolls — a roundtrip that does **not** run `main( )`.
- Sorting and filtering happen on the server, over all rows. The window's
  state is in the model beside the rows, under `/__WINDOW/<path>/` — `TOTAL`,
  `COUNT` and `SIZE`.
- `t_sort` and `t_filter` take effect when they differ from the ones the
  previous `window_bind_tab( )` of that table passed; an empty array clears.
  The conditions of one filter `group` are ORed, the groups ANDed.
- An unknown component, a `path` that is no column of the table and a value of
  the wrong kind are refused.
- `window_get_row( )` answers for the order the roundtrip **started** with —
  the one the browser shows. After a `window_bind_tab( )` that passed another
  sort or filter in the same `main( )`, it is refused: ask before binding the
  table anew.
- For a table that is a component of a structure, the binding is a placeholder
  until `main( )` returns, as with `_bind( )`.

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
and `client.cs_transition` are the interface's constant structures, read from
the runtime — a constant upstream adds is one the client has. The same are
exported as
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
const first = (await client.raw.z2ui5_if_client$get_event_arg({ v: 1, result: 1 })).get();
```

An app should not need it: since 0.5.0 `client.get_event_arg(v)` answers every
argument itself.

## Obsolete and unsupported

| | |
|---|---|
| `view_model_update()`, `popup_model_update()`, `popover_model_update()`, `nest_view_model_update()`, `nest2_view_model_update()` | obsolete in `z2ui5_if_client`; they **do nothing**, here as there. Changed bound data is pushed on its own |
| `_bind_edit()` | obsolete — `_bind()` under another name |
| `_event_client()` | obsolete — the embedded `follow_up_action()` under another name |
| `set_session_stateful()` | **not supported in a JavaScript app**, throws. The app's state is in its fields, which are in the draft. A *transpiled ABAP* app can call it: since 0.5.0 its session is kept per CAP user, in the process — a restart or a second instance without sticky routing loses it. See [Deployment](../reference/deployment#scaling) |

The names of cap2UI5 0.1.0 (`c.isDisplay`, `c.bind()`, `c.navTo()` …) throw
an error naming the method that replaces each, rather than answering
`undefined`. The full mapping is in the plugin's
[CHANGELOG](https://github.com/cap2UI5/cap2UI5/blob/main/plugin/CHANGELOG.md), under 0.2.0.

## Next

- [**App Interface**](./app-interface) — `defineApp`, `t` and `defineExit`
- [**App Lifecycle**](../guide/lifecycle) — when each branch runs
