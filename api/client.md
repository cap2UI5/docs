# API: `client`

Das `client`-Objekt ist die einzige Schnittstelle, die deine App während eines Roundtrips zur Welt hat. Es wird als einziges Argument an `main(client)` übergeben.

> Quelle: [`srv/z2ui5/02/z2ui5_cl_core_client.js`](https://github.com/cap2UI5/dev/blob/main/cap2UI5/srv/z2ui5/01/02/z2ui5_cl_core_client.js)

## Lifecycle-Checks

| Methode | Returns | Beschreibung |
|---|---|---|
| `check_on_init()` | `boolean` | `true` beim ersten `main()` einer frischen App-Instanz |
| `check_on_event(name?)` | `boolean` | `true` wenn das übergebene Event aktuell ist (oder, ohne Argument, ob _irgendein_ Event vorliegt) |
| `check_on_navigated()` | `boolean` | `true` direkt nach `nav_app_call`/`nav_app_leave` |
| `check_app_prev_stack()` | `boolean` | `true` wenn der Nav-Stack nicht leer ist |

## Data Binding

| Methode | Returns | Beschreibung |
|---|---|---|
| `_bind(value, opts?)` | `string` | One-way-Binding → `{/path}` |
| `_bind_edit(value, opts?)` | `string` | Two-way-Binding → `{/XX/path}` |
| `_bind_local(value)` | `string` | Lokales Binding ohne App-Property |

**`opts`** für `_bind` / `_bind_edit`:
- `path: true` → liefert nackten Pfad ohne `{...}`
- `path: "name"` → expliziter Pfad, kein Reference-Lookup
- `custom_mapper: ".fmt"` → Formatter-Funktionsname
- `custom_mapper_back: ".fmtBack"` → Reverse-Formatter (only `_bind_edit`)
- `custom_filter: ".f"` / `custom_filter_back: ".fb"` → Aliase
- `view: "POPUP"` → Ziel-View (selten nötig)

## Events

| Methode | Returns | Beschreibung |
|---|---|---|
| `_event(name, args?, ctrl?, data?)` | `string` | Backend-Event (Roundtrip) |
| `_event_client(name, args?)` | `string` | Frontend-Only-Event |
| `_event_nav_app_leave()` | `string` | Spezial-Event für Page-Back-Button |

`ctrl` Optionen: `{ bypass_busy, force_main_model }`.

`get_event_arg(n)` liest 1-basiert wie ABAP — JS-Style geht über `client.get().T_EVENT_ARG[index]`.

## Request-Context

| Methode | Beschreibung |
|---|---|
| `get()` | liefert `{ EVENT, T_EVENT_ARG, S_CONFIG, S_DRAFT, CHECK_LAUNCHPAD_ACTIVE, CHECK_ON_NAVIGATED, _S_NAV, R_EVENT_DATA }` |
| `get_event_arg(n)` | n-tes Event-Arg (1-basiert) |
| `get_frontend_data()` | rohes `S_FRONT`-Objekt |
| `get_app(id?)` | aktuelle App-Instanz (oder `null` mit ID) |
| `get_app_prev()` | vorherige App (vor Nav-Leave) |

## View-Slots

| Methode | Beschreibung |
|---|---|
| `view_display(xml, anno?, modelPath?)` | Hauptview rendern |
| `view_model_update()` | nur Modell-Delta rendern |
| `view_destroy()` | Hauptview löschen |
| `nest_view_display(xml, id, m_ins, m_dest?)` | Nested-View 1 |
| `nest_view_model_update()` / `nest_view_destroy()` | dito |
| `nest2_view_display(...)` / ... | Nested-View 2 |
| `popup_display(xml)` | Popup öffnen |
| `popup_model_update()` / `popup_destroy()` | dito |
| `popover_display(xml, byId)` | Popover anzeigen |
| `popover_model_update()` / `popover_destroy()` | dito |

## Messages

| Methode | Beschreibung |
|---|---|
| `message_toast_display(text, opts?)` | kurzer Toast |
| `message_box_display(text, type?, title?, ...)` | modales MessageBox |

`opts` für Toast: `duration, width, my, at, of, offset, collision, animation_duration, animation_timing_function, onclose, autoclose, closeonbrowsernavigation, class`.

`message_box_display`-Argumente in Reihenfolge: `text, type, title, styleclass, onclose, actions, emphasizedaction, initialfocus, textdirection, icon, details, closeonnavigation`.

## Navigation

| Methode | Beschreibung |
|---|---|
| `nav_app_call(app)` | forward — `app` auf Stack pushen |
| `nav_app_leave(app?)` | back — Stack-Top oder explizite App |
| `nav_app_home()` | zurück zum Startup |
| `nav_app_back()` | identisch zu `nav_app_leave()`, aber explizit als "Back" markiert |

## State-Setter

| Methode | Beschreibung |
|---|---|
| `set_session_stateful(bool)` | sticky-Session aktivieren |
| `set_app_state_active(bool)` | App-State im Frontend aktivieren |
| `set_nav_back(bool)` | Browser-Back-Button-Verhalten |
| `set_push_state(value)` | Browser-History-Push |
| `follow_up_action(rawString)` | beliebige `eF`-Action queuen |

## Frontend-Convenience-Methoden

Alle queuen `eF`-Calls in `_follow_up_actions[]`. Werden in der Response als `S_FOLLOW_UP_ACTION.CUSTOM_JS` gesendet, der Frontend-Treiber führt sie sequentiell aus.

| Methode | Wirkung |
|---|---|
| `clipboard_copy(text)` | Text kopieren |
| `clipboard_copy_app_state()` | aktuelle Deep-Link-URL kopieren |
| `file_download(b64Url, filename)` | Datei downloaden |
| `open_new_tab(url)` | Tab öffnen |
| `location_reload(url)` | Page-Reload auf URL |
| `history_back()` | `history.back()` |
| `system_logout(url?)` | Logout über FLP / URL |
| `popup_close()`, `popover_close()` | aktuelles Popup/Popover schließen |
| `cross_app_nav_to_prev_app()` | FLP: zurück |
| `cross_app_nav_to_ext(target, params, mode?)` | FLP: extern |
| `storage_set(type, prefix, key, value)` | Browser-Storage Set |
| `storage_remove(type, prefix, key)` | Browser-Storage Remove |
| `set_odata_model(url, name?, anno?)` | OData-Modell setzen |
| `set_size_limit(view, limit)` / `reset_size_limit(view)` | Size-Limit |
| `url_helper_redirect(url, new_window?)` | URLHelper.redirect |
| `url_helper_email({email, subject?, body?, cc?, bcc?, new_window?})` | mailto: |
| `url_helper_sms({telephone, message?})` | SMS-Link |
| `url_helper_tel(telephone)` | Tel-Link |

## Konstanten

| | Wert |
|---|---|
| `client.cs_event` (Instance-Getter) | `CS_EVENT` (siehe [Events](../guide/events#frontend-only-events-_event_client-name-args)) |
| `client.cs_view` | `{ MAIN, NESTED, NESTED2, POPUP, POPOVER }` |
| Static `z2ui5_cl_core_client.CS_BIND_TYPE` | `{ one_way, two_way }` |
| Static `z2ui5_cl_core_client.EVENT_NAV_APP_LEAVE` | Reserved Event-Name |
