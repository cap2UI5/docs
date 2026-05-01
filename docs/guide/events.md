# Events

Events are **the only way for the frontend to tell the server something** (besides the silent XX delta for two-way bindings). When the user clicks, swipes, makes a selection, or hits Enter, the frontend sends an event object to the server in the roundtrip.

## Backend events: `_event(name)`

```js
view.Button({
  text:  "Save",
  press: client._event("SAVE")
});
```

On the server side you receive the event in the next `main()` round:

```js
if (client.check_on_event("SAVE")) {
  /* ... */
}
```

`_event(name)` internally builds a UI5 binding string of the form:

```
.eB([['SAVE','','','']],...)
```

The frontend handler `eB` (= "event Backend") calls the roundtrip endpoint with the event name and optional arguments.

## Event arguments

```js
.Button({ press: client._event("ITEM_DELETE", [item.id, item.kind]) })
```

Server side:

```js
if (client.check_on_event("ITEM_DELETE")) {
  const id   = client.get().T_EVENT_ARG[0];
  const kind = client.get().T_EVENT_ARG[1];
}
```

Or (if you prefer the ABAP pattern):

```js
const id   = client.get_event_arg(1);   // 1-based like ABAP
const kind = client.get_event_arg(2);
```

Arguments are **always strings** on the wire — the frontend/backend engine doesn't take them apart in a type-safe way.

## Event control flags

Optionally you can pass control flags:

```js
client._event("SAVE", [], {
  bypass_busy:      true,    // dispatch event even when the app is busy
  force_main_model: true     // force binding on the main view model
});
```

## Event data (object payload)

Sometimes you need **more than just strings**. With the 4th argument of `_event` you can attach arbitrary data:

```js
client._event("SUBMIT", [], {}, { complex: { payload: [1, 2, 3] } });
```

Server side:

```js
const data = client.get().R_EVENT_DATA;
```

## Frontend-only events: `_event_client(name, args)`

Some events should **never** reach the server — e.g. "open this URL in a new tab", "copy this value to the clipboard". For those there is `_event_client`:

```js
.Button({
  text:  "Open SAP",
  press: client._event_client(client.cs_event.OPEN_NEW_TAB, ["https://sap.com"])
});
```

A frontend action handler dispatches it, no roundtrip.

### Available `cs_event` constants

From `z2ui5_cl_core_client.js`:

| Constant | Effect |
|---|---|
| `OPEN_NEW_TAB` | Open URL in a new tab |
| `LOCATION_RELOAD` | Reload page on URL |
| `HISTORY_BACK` | `history.back()` |
| `CLIPBOARD_COPY` | Copy text to clipboard |
| `CLIPBOARD_APP_STATE` | Deep link of the current app to clipboard |
| `DOWNLOAD_B64_FILE` | Download a base64 data URL as a file |
| `SYSTEM_LOGOUT` | Logout (FLP / URL redirect) |
| `STORE_DATA` | Value to browser storage |
| `SET_ODATA_MODEL` | Set the view's default OData model |
| `SET_SIZE_LIMIT` | JSONModel.setSizeLimit |
| `URLHELPER` | URLHelper.redirect / triggerEmail / triggerSms / triggerTel |
| `NAV_CONTAINER_TO` | Change NavContainer destination |
| `POPUP_CLOSE`, `POPOVER_CLOSE` | Close current popup/popover |
| `IMAGE_EDITOR_POPUP_CLOSE` | Close image editor |

## Convenience: server-triggered frontend actions

Sometimes you want to trigger a frontend action **as a side effect of your server code** — not in response to a click but, for example, after a successful save:

```js
if (client.check_on_event("SAVE")) {
  await this.persist();
  client.clipboard_copy_app_state();    // ← puts deep link in the clipboard
  client.message_toast_display("Saved + link copied");
}
```

These methods on `client` are the server-side counterparts of `_event_client`:

| Method | What happens |
|---|---|
| `clipboard_copy(text)` | Copy text |
| `clipboard_copy_app_state()` | Copy current deep-link URL |
| `file_download(b64, filename)` | Download file |
| `open_new_tab(url)` | Open new tab |
| `location_reload(url)` | Reload to URL |
| `history_back()` | History back |
| `system_logout(url?)` | Logout |
| `popup_close()`, `popover_close()` | Close current popups |
| `cross_app_nav_to_prev_app()` | FLP: back |
| `cross_app_nav_to_ext(target, params, mode?)` | FLP: external |
| `storage_set(type, prefix, key, value)` | Browser storage set |
| `storage_remove(type, prefix, key)` | Browser storage remove |
| `set_odata_model(url, name?, anno?)` | Set OData model |
| `set_size_limit(view, limit)` / `reset_size_limit(view)` | Size limit |
| `url_helper_redirect(url, new_window?)` | URLHelper.redirect |
| `url_helper_email({email, subject, body, cc, bcc, new_window?})` | mailto: |
| `url_helper_sms({telephone, message})` | SMS link |
| `url_helper_tel(telephone)` | Tel link |

These all collect into `S_FOLLOW_UP_ACTION` of the response and the frontend driver runs them sequentially.

## Special event: nav-app-leave

For the page back button there is a convenience helper:

```js
view.Page({
  navButtonPress: client._event_nav_app_leave(),
  showNavButton:  client.check_app_prev_stack()
});
```

The event is **intercepted** by the framework before `main()` runs — your app never sees it. Instead the handler executes a `nav_app_leave()`, jumping to the previous app on the stack. → More in [Navigation](./navigation).

→ Continue with [**Navigation**](./navigation).
