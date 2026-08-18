# API: `client`

The `client` object is the only interface your app has to the outside world during a roundtrip. It is passed as the sole argument to `main(client)`.

> Source: [`core/srv/z2ui5/01/02/z2ui5_cl_ui5_client.js`](https://github.com/cap2UI5/cap2UI5/blob/main/core/srv/z2ui5/01/02/z2ui5_cl_ui5_client.js)

## Lifecycle checks

| Method | Returns | Description |
|---|---|---|
| `check_on_init()` | `boolean` | `true` on the first `main()` of a fresh app instance |
| `check_on_event(name?)` | `boolean` | `true` if the given event is current (or, without an argument, whether _any_ event is present) |
| `check_on_navigated()` | `boolean` | `true` directly after `nav_app_call`/`nav_app_leave` |
| `check_app_prev_stack()` | `boolean` | `true` when the nav stack is not empty |

## Data binding

| Method | Returns | Description |
|---|---|---|
| `_bind(value, opts?)` | `string` | One-way binding → `{/PATH}` |
| `_bind_edit(value, opts?)` | `string` | Two-way binding → `{/XX/PATH}` |
| `_bind_local(value)` | `string` | Local binding without an app property → `{/__local_N}` |

Paths are uppercased (`this.user_name` → `/XX/USER_NAME`) and mapped back onto the real property case-insensitively when the delta returns.

::: info The two are one method upstream — but not here
On the framework release cap2UI5 pins (**1.142.0**, `z2ui5_if_app.version`) these are genuinely two bindings: `_bind` writes into the model root and is read-only on the frontend, `_bind_edit` writes into the `XX` namespace the frontend can write back through. That is what `z2ui5_cl_ui5_srv_bind` does in the shipped code, and what this documentation describes throughout.

abap2UI5 resolved the split in **1.143.0**: there `_bind_edit` is an alias of `_bind`, and the reverse-formatter options are accepted but ignored. If you are reading upstream material, that is the difference you are looking at. → [cap2UI5 vs. abap2UI5](../guide/vs-abap2ui5)
:::

**`opts`** for `_bind` / `_bind_edit`:
- `path: true` → returns the bare path without `{...}`
- `path: "name"` → explicit path, no reference lookup
- `name: "s_screen-city"` → resolve a member inside a bound structure by name
- `custom_mapper: ".fmt"` → formatter function name
- `custom_mapper_back: ".fmtBack"` → reverse formatter (only `_bind_edit`)
- `custom_filter: ".f"` / `custom_filter_back: ".fb"` → aliases
- `view: "POPUP"` → target view (rarely needed)

## Events

| Method | Returns | Description |
|---|---|---|
| `_event(name, args?, ctrl?, data?)` | `string` | Backend event (roundtrip) |
| `_event_client(name, args?)` | `string` | Frontend-only event |
| `_event_nav_app_leave()` | `string` | Special event for the page back button |

`ctrl` options: `{ bypass_busy, force_main_model }`.

`get_event_arg(n)` reads 1-based like ABAP — JS-style goes via `client.get().T_EVENT_ARG[index]`.

## Request context

| Method | Description |
|---|---|
| `get()` | returns `{ EVENT, T_EVENT_ARG, S_CONFIG, S_DRAFT, CHECK_LAUNCHPAD_ACTIVE, CHECK_ON_NAVIGATED, _S_NAV, R_EVENT_DATA }` |
| `get_event_arg(n)` | n-th event arg (1-based) |
| `get_frontend_data()` | raw `S_FRONT` object |
| `get_app(id?)` | current app instance (or `null` with an ID) |
| `get_app_prev()` | previous app (before nav-leave) |

## View slots

| Method | Description |
|---|---|
| `view_display(xml, anno?, modelPath?)` | Render main view |
| `view_model_update()` | Render only the model delta |
| `view_destroy()` | Remove main view |
| `nest_view_display(xml, id, m_ins, m_dest?)` | Nested view 1 |
| `nest_view_model_update()` / `nest_view_destroy()` | ditto |
| `nest2_view_display(...)` / ... | Nested view 2 |
| `popup_display(xml)` | Open popup |
| `popup_model_update()` / `popup_destroy()` | ditto |
| `popover_display(xml, byId)` | Show popover |
| `popover_model_update()` / `popover_destroy()` | ditto |

## Messages

| Method | Description |
|---|---|
| `message_toast_display(text, opts?)` | Short toast |
| `message_box_display(text, type?, title?, ...)` | Modal MessageBox |

`opts` for toast: `duration, width, my, at, of, offset, collision, animation_duration, animation_timing_function, onclose, autoclose, closeonbrowsernavigation, class`.

`message_box_display` arguments in order: `text, type, title, styleclass, onclose, actions, emphasizedaction, initialfocus, textdirection, icon, details, closeonnavigation`.

## Navigation

| Method | Description |
|---|---|
| `nav_app_call(app)` | Forward — push `app` onto the stack |
| `nav_app_leave(app?)` | Back — stack top or explicit app |
| `nav_app_home()` | Back to startup |
| `nav_app_back()` | Identical to `nav_app_leave()` but explicitly marked as "back" |

## State setters

| Method | Description |
|---|---|
| `set_session_stateful(bool)` | Activate sticky session |
| `set_app_state_active(bool)` | Activate app state on the frontend |
| `set_nav_back(bool)` | Browser back-button behavior |
| `set_push_state(value)` | Browser history push |
| `follow_up_action(rawString)` | Queue arbitrary `eF` action |

## Frontend convenience methods

All queue `eF` calls into `_follow_up_actions[]`. They are sent in the response as `S_FOLLOW_UP_ACTION.CUSTOM_JS`, and the frontend driver runs them sequentially.

| Method | Effect |
|---|---|
| `clipboard_copy(text)` | Copy text |
| `clipboard_copy_app_state()` | Copy current deep-link URL |
| `file_download(b64Url, filename)` | Download file |
| `open_new_tab(url)` | Open tab |
| `location_reload(url)` | Page reload to URL |
| `history_back()` | `history.back()` |
| `system_logout(url?)` | Logout via FLP / URL |
| `popup_close()`, `popover_close()` | Close current popup/popover |
| `cross_app_nav_to_prev_app()` | FLP: back |
| `cross_app_nav_to_ext(target, params, mode?)` | FLP: external |
| `storage_set(type, prefix, key, value)` | Browser storage set |
| `storage_remove(type, prefix, key)` | Browser storage remove |
| `set_odata_model(url, name?, anno?)` | Set OData model |
| `set_size_limit(view, limit)` / `reset_size_limit(view)` | Size limit |
| `url_helper_redirect(url, new_window?)` | URLHelper.redirect |
| `url_helper_email({email, subject?, body?, cc?, bcc?, new_window?})` | mailto: |
| `url_helper_sms({telephone, message?})` | SMS link |
| `url_helper_tel(telephone)` | Tel link |

## Constants

| | Value |
|---|---|
| `client.cs_event` (instance getter) | `CS_EVENT` (see [Events](../guide/events#event-client)) |
| `client.cs_view` | `{ MAIN, NESTED, NESTED2, POPUP, POPOVER }` |
| Static `z2ui5_cl_ui5_client.CS_BIND_TYPE` | `{ one_way, two_way }` |
| Static `z2ui5_cl_ui5_client.EVENT_NAV_APP_LEAVE` | Reserved event name |
