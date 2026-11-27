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

::: info 0.8.0 is not released yet
What this page marks "since 0.8.0" — and what it says was removed with 0.8.0 —
is `@cap2ui5/cds-plugin` 0.8.0 on runtime `1.151.0`, which is on cap2UI5's
`main` but **not released yet**. The newest release on npm is 0.7.0; see
[Configuration](../reference/configuration#the-runtime).
:::

## Lifecycle and queries

| | |
|---|---|
| `client.check_on_init()` | `true` on the first roundtrip of **this app instance**, and only that one. Seed state here |
| `client.check_on_navigated()` | `true` on the first roundtrip **and** every time this app gets the screen back — a called app leaving, a value help closing, a bookmark restored. **Render here** |
| `client.check_on_event(val)` | whether this roundtrip answers the event `val`; without `val`, whether it answers any event |
| `client.check_app_prev_stack()` | `true` if there is an app to return to — for a Page's `showNavButton` |
| `client.check_on_nav_back()` | since 0.8.0. `true` on the one roundtrip on which this app gets the screen **back** from an app it called |
| `client.get_nav_tag()` | since 0.8.0. The `tag` this app gave its last `nav_app_call({ app, tag })`, on the roundtrip the called app comes back on |
| `client.check_nav_pending()` | since 0.8.0. Whether this `main( )` has already called `nav_app_call()` or `nav_app_leave()` |
| `client.get_start_param(name)` | since 0.8.0. One start parameter of the page, by name — the URL query, the launchpad's startupParameters or the intent's query; `""` when there is none |
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
| `client._bind("mr_tab->*")` | since 0.7.0: the data behind a [`t.ref( )`](./app-interface#a-data-reference) field, bound dereferenced as ABAP's `_bind( mr_tab->* )` — it answers `{/MR_TAB/*}` |

```js
`<Input value="${client._bind("name")}"/>`
`<List items="{path: '${client._bind({ val: "rows", path: true })}', templateShareable: false}">`
`<Input value="${client._bind({ val: "title", tab: "rows", tab_index: 2 })}"/>`
```

A plain `_bind(name)` answers the binding itself. A component, a cell or an
option is registered by the framework after `main` returns, so it answers a
**placeholder** — embed it as it is, do not parse or compare it. See
[Data Binding](../guide/data-binding).

`_bind( )` is the one binding, and it is two-way. `_bind_edit( )`, which was
`_bind( )` under another name, left `z2ui5_if_client` with abap2UI5 `1.151.0`
and so left the client with plugin 0.8.0 — see
[Removed with 0.8.0](#removed-with-0-8-0).

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

`window_bind_tab( )` binds a **large** result to a list control that the
**app** loads a window of rows at a time — the way an OData service answers
`$skip`, `$top`, `$orderby` and `$filter`.

::: warning Redesigned with 0.8.0 — not released yet
This section describes plugin 0.8.0 on runtime `1.151.0`, which is **not
released yet**. In 0.6.0 and 0.7.0 (runtime 1.149.0) the windowed table was
the framework's: `window_bind_tab({ val, window, t_sort, t_filter })` sorted,
filtered and counted on the server, the next window came without `main( )`
running, and `window_get_row( )` mapped a row of the browser to a row of the
table. With 0.8.0 that is a breaking change: `t_sort` and `t_filter` are no
parameters any more, `total` and `event` are required, and
`window_get_row( )` is gone.
:::

| | |
|---|---|
| `client.window_bind_tab({ val, total, event, window })` | the binding of a table field for a list control's `items` or `rows`, as `_bind( )` answers it |

| parameter | |
|---|---|
| `val` | the **name** of the table field that holds the rows loaded so far, in the order the browser shows them. A [`t.ref( )`](./app-interface#a-data-reference) to a table is named `"mr_tab->*"` |
| `total` | how many rows there are in all: a number, or the **name** of a number field — the framework then reads the field anew for every response |
| `event` | the app's event the list binding's requests arrive as |
| `window` | the rows the browser asks for at a time, 100 unless set |

When the list needs more rows, or one of its columns is sorted or filtered,
`main( )` runs with the event the bind named and the request in
`client.get().r_event_data`:

| `r_event_data` | |
|---|---|
| `path` | the model path of the table, `/ROWS` |
| `reason` | a `client.cs_window_reason` value: `more`, `sort` or `filter` (`MORE`, `SORT`, `FILTER`) |
| `skip` | the rows the browser holds — for `MORE`, where to go on; `0` otherwise |
| `top` | the rows the browser wants now |
| `t_sort` | `[{ path, descending }]` — the first sorter that tells two rows apart decides |
| `t_filter` | `[{ group, path, operator, value1, value2 }]` — the conditions of one `group` are ORed, the groups ANDed. `operator` is a `sap.ui.model.FilterOperator` name |

`path` in a sorter or a condition is the column as the model spells it, upper
case.

```js
rows  = t.table({ id: 0, name: "", price: t.packed(9, 2) });   // the rows loaded so far
total = 0;                                                     // how many there are in all

async main(client) {
  if (client.check_on_event("ROWS")) {
    const { reason, skip, top, t_sort } = client.get().r_event_data;
    const more = await SELECT.from(Books).orderBy(…t_sort).limit(top, skip);
    this.rows = reason === client.cs_window_reason.more ? [...this.rows, ...more] : more;
  } else if (client.check_on_event("PRESS")) {
    // the rows ARE what the browser shows: "/ROWS/5" is this.rows[5]
    const row = this.rows[Number(client.get_event_arg(1).split("/").pop())];
    …
  } else if (client.check_on_navigated()) {
    client.view_display(`… <Table growing="true"
      items="${client.window_bind_tab({ val: "rows", total: "total", event: "ROWS", window: 50 })}"> …`);
  }
}
```

A complete app, with a sort and a filter answered from an array, is
`examples/bookshop/srv/apps/window.js` in cap2UI5.

- **The framework neither sorts nor filters nor counts.** The app answers a
  request as a `SELECT` with `ORDER BY`, `WHERE`, an offset and a limit would,
  and keeps the sort and the filter in force itself — a `MORE` request
  carries none.
- **No view is rendered for a window request.** The event sets the rows — and
  `total`, where it is a field's name — and returns; the model carries the
  new window.
- **A position is the array index.** The rows are what the browser shows, so
  the index of a binding path an event hands over — `/ROWS/5` — is the index
  of the row. That is what `window_get_row( )` was for, and why it is gone.
- **`total` by name.** ABAP passes the attribute, `total = mv_total`, and the
  framework reads it anew for every response. A JavaScript value cannot carry
  that reference, so the field goes by its name, as for `_bind( )`. A number
  is the value of this render, as `total = lines( lt_all )` is in ABAP.
- The window's state is in the model beside the rows, under
  `/__WINDOW/<PATH>` — `TOTAL`, `COUNT` (the rows loaded), `SIZE` and `EVENT`.
- For a table that is a component of a structure, the binding is a placeholder
  until `main( )` returns, as with `_bind( )`.
- A `val` that is no table field, a `total` that is neither a number nor the
  name of a number field, an empty `event`, a `window` that is no number and
  a parameter the method no longer has (`t_sort`) are refused, naming the
  choices.

::: info What is measured here
With cap2UI5 at 0.8.0, before its release, on the published `@abap2ui5/node-runtime`
`1.151.0`, on the wire only: the first answer of the example app carried 50
of its 300 rows, `items="{/ROWS}"` and
`"__WINDOW": { "ROWS": { "COUNT": 50, "EVENT": "ROWS", "SIZE": 50, "TOTAL": 300 } }`,
and the example's `window.test.mjs` passed — more rows, a sort and a filter
from the list, an edit in a sorted window, a table inside a structure and the
refusals. **Not run for this page: a browser.** The measurements this box held
for 0.6.0 — a growing `sap.m.Table` in a headless browser — were of the old,
framework-driven table and do not carry over.
:::

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
| `client.nav_app_call({ app, tag, keep_messages })` | since 0.8.0, by name: `tag` says why this app calls — it reads it back with `get_nav_tag()` on the roundtrip the called app returns, which `check_on_nav_back()` tells. `keep_messages: true` shows the toasts and boxes queued in this roundtrip after the called app has rendered, instead of dropping them |
| `client.nav_app_leave()` | hand the screen back to the caller |
| `client.nav_app_leave({ app, event, r_data, keep_messages })` | … or to `app`. `event` is what the caller finds in `get_event()`, `r_data` what it finds in `get().r_event_data` — typed, object keys lowercase. `keep_messages` since 0.8.0, as above |

Both are scheduled for the end of the roundtrip, so they are usually the last
thing a branch does. See [Navigation](../guide/navigation).

## Timer

Since 0.8.0.

| | |
|---|---|
| `client.timer_set({ event, delay_ms, no_busy })` | **declare** the repeating timer of this app: the event `event` is raised every `delay_ms` milliseconds for as long as the app has the screen — the framework keeps it running. `no_busy: true` leaves the busy indicator alone |
| `client.timer_stop()` | end it |

Measured on the wire only: the answer to a roundtrip that calls `timer_set( )`
declares the event and the delay to the browser, and the one that calls
`timer_stop( )` does not. A ticking browser was not run for this page.

## Hash and app state

| | |
|---|---|
| `client.hash_set(val)` | push a hash onto the browser history — see below |
| `client.hash_replace(val)` | rewrite the hash without a history entry — see below |
| `client.app_state_set_active(val = true)` | keep this app's state id in the URL |
| `client.app_state_get_href()` | the link to this state — see [Lifecycle and queries](#lifecycle-and-queries) |

With 0.8.0 `hash_set( )` and `hash_replace( )` write the URL **only for an app
that owns the hash**: one whose view registered a listener with
`client.cs_event.hash_attach_changed`. That is abap2UI5 `1.151.0`'s decision;
without the listener nothing is written. On the wire the request still goes
out — as `S_FRONT.NAV`, measured — and whether the URL changes is decided in
the browser, which was not run for this page.

## Constants

`client.cs_event`, `client.cs_view`, `client.cs_nav_mode`, `client.cs_device`,
`client.cs_transition` and — since 0.8.0 — `client.cs_window_reason` are the interface's constant structures, read from
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
| `_event_client()` | obsolete — the embedded `follow_up_action()` under another name |
| `set_session_stateful()` | **not supported in a JavaScript app**, throws. The app's state is in its fields, which are in the draft. A *transpiled ABAP* app can call it: since 0.5.0 its session is kept per CAP user, in the process — a restart or a second instance without sticky routing loses it. See [Deployment](../reference/deployment#scaling) |

### Removed with 0.8.0 {#removed-with-0-8-0}

The client has exactly the methods the hosted runtime's `z2ui5_if_client`
has. abap2UI5 `1.151.0` took these away, so with plugin 0.8.0 a call fails
("is not a function"), as it fails to compile in ABAP:

| | write instead |
|---|---|
| `_bind_edit()` | `_bind()`, with the same parameters — it was `_bind()` under another name |
| `view_model_update()`, `popup_model_update()`, `popover_model_update()`, `nest_view_model_update()`, `nest2_view_model_update()` | nothing: delete the call. They did nothing; changed bound data is pushed on its own |
| `window_get_row()` | the array index — see [The windowed table](#the-windowed-table) |

The names of cap2UI5 0.1.0 (`c.isDisplay`, `c.bind()`, `c.navTo()` …) throw
an error naming the method that replaces each, rather than answering
`undefined`. The full mapping is in the plugin's
[CHANGELOG](https://github.com/cap2UI5/cap2UI5/blob/main/plugin/CHANGELOG.md), under 0.2.0.

## Next

- [**App Interface**](./app-interface) — `defineApp`, `t` and `defineExit`
- [**App Lifecycle**](../guide/lifecycle) — when each branch runs
