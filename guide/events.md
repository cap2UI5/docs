# Events

Events sind **die einzige Art, wie das Frontend dem Server etwas mitteilt** (außer dem stillen XX-Delta für Two-way-Bindings). Wenn der User klickt, swiped, eine Auswahl trifft oder Enter drückt, schickt das Frontend ein Event-Objekt im Roundtrip an den Server.

## Backend-Events: `_event(name)`

```js
view.Button({
  text:  "Speichern",
  press: client._event("SAVE")
});
```

Server-Side bekommst du das Event in der nächsten `main()`-Runde:

```js
if (client.check_on_event("SAVE")) {
  /* ... */
}
```

`_event(name)` baut intern einen UI5-Bindings-String der Form:

```
.eB([['SAVE','','','']],...)
```

Der Frontend-Handler `eB` (= "event Backend") ruft den Roundtrip-Endpoint mit dem Event-Namen und optionalen Argumenten auf.

## Event-Argumente

```js
.Button({ press: client._event("ITEM_DELETE", [item.id, item.kind]) })
```

Server-Side:

```js
if (client.check_on_event("ITEM_DELETE")) {
  const id   = client.get().T_EVENT_ARG[0];
  const kind = client.get().T_EVENT_ARG[1];
}
```

Oder (falls du das ABAP-Pattern bevorzugst):

```js
const id   = client.get_event_arg(1);   // 1-based wie ABAP
const kind = client.get_event_arg(2);
```

Argumente sind **immer Strings** auf der Wire — die Frontend-/Backend-Engine nimmt sie nicht typsicher auseinander.

## Event-Control-Flags

Optional kannst du Steuerflags mitgeben:

```js
client._event("SAVE", [], {
  bypass_busy:      true,    // Event auch dispatchen, wenn die App busy ist
  force_main_model: true     // Force-binding auf das Main-View-Modell
});
```

## Event-Daten (Objekt-Payload)

Manchmal brauchst du **mehr als nur Strings**. Mit dem 4. Argument von `_event` kannst du beliebige Daten anhängen:

```js
client._event("SUBMIT", [], {}, { complex: { payload: [1, 2, 3] } });
```

Server-Side:

```js
const data = client.get().R_EVENT_DATA;
```

## Frontend-only Events: `_event_client(name, args)`

Manche Events sollen **gar nicht** den Server erreichen — z.B. "öffne diese URL in einem neuen Tab", "kopiere diesen Wert in die Zwischenablage". Dafür gibt es `_event_client`:

```js
.Button({
  text:  "Open SAP",
  press: client._event_client(client.cs_event.OPEN_NEW_TAB, ["https://sap.com"])
});
```

Dispatched ein Frontend-Action-Handler, kein Roundtrip.

### Verfügbare `cs_event`-Konstanten

Aus `z2ui5_cl_core_client.js`:

| Konstante | Wirkung |
|---|---|
| `OPEN_NEW_TAB` | URL in neuem Tab öffnen |
| `LOCATION_RELOAD` | Page neu laden auf URL |
| `HISTORY_BACK` | `history.back()` |
| `CLIPBOARD_COPY` | Text in Clipboard kopieren |
| `CLIPBOARD_APP_STATE` | Deep-Link der aktuellen App in Clipboard |
| `DOWNLOAD_B64_FILE` | Base64-Data-URL als Datei downloaden |
| `SYSTEM_LOGOUT` | Logout (FLP / URL-Redirect) |
| `STORE_DATA` | Wert in Browser-Storage |
| `SET_ODATA_MODEL` | Default-OData-Modell der View setzen |
| `SET_SIZE_LIMIT` | JSONModel.setSizeLimit |
| `URLHELPER` | URLHelper.redirect / triggerEmail / triggerSms / triggerTel |
| `NAV_CONTAINER_TO` | NavContainer-Ziel ändern |
| `POPUP_CLOSE`, `POPOVER_CLOSE` | aktuelles Popup/Popover schließen |
| `IMAGE_EDITOR_POPUP_CLOSE` | Image-Editor schließen |

## Convenience: Server-getriggerte Frontend-Actions

Manchmal willst du **als Nebenwirkung deines Server-Codes** eine Frontend-Action auslösen — nicht als Reaktion auf einen Klick, sondern z.B. nach erfolgreichem Speichern:

```js
if (client.check_on_event("SAVE")) {
  await this.persist();
  client.clipboard_copy_app_state();    // ← legt Deep-Link in Clipboard
  client.message_toast_display("Gespeichert + Link kopiert");
}
```

Diese Methoden auf `client` sind die Server-Pendants zu `_event_client`:

| Methode | Was passiert |
|---|---|
| `clipboard_copy(text)` | Text kopieren |
| `clipboard_copy_app_state()` | aktuelle Deep-Link-URL kopieren |
| `file_download(b64, filename)` | Datei downloaden |
| `open_new_tab(url)` | neuen Tab öffnen |
| `location_reload(url)` | Reload auf URL |
| `history_back()` | History-Back |
| `system_logout(url?)` | Logout |
| `popup_close()`, `popover_close()` | Aktuelle Popups schließen |
| `cross_app_nav_to_prev_app()` | FLP: zurück |
| `cross_app_nav_to_ext(target, params, mode?)` | FLP: extern |
| `storage_set(type, prefix, key, value)` | Browser-Storage Set |
| `storage_remove(type, prefix, key)` | Browser-Storage Remove |
| `set_odata_model(url, name?, anno?)` | OData-Modell setzen |
| `set_size_limit(view, limit)` / `reset_size_limit(view)` | Size-Limit |
| `url_helper_redirect(url, new_window?)` | URLHelper.redirect |
| `url_helper_email({email, subject, body, cc, bcc, new_window?})` | mailto: |
| `url_helper_sms({telephone, message})` | SMS-Link |
| `url_helper_tel(telephone)` | Tel-Link |

Diese werden alle in `S_FOLLOW_UP_ACTION` der Response gesammelt und der Frontend-Treiber führt sie der Reihe nach aus.

## Spezial-Event: Nav-App-Leave

Für den Page-Back-Button gibt es eine Convenience:

```js
view.Page({
  navButtonPress: client._event_nav_app_leave(),
  showNavButton:  client.check_app_prev_stack()
});
```

Das Event wird vom Framework **abgefangen**, bevor `main()` läuft — deine App sieht es nicht. Stattdessen führt der Handler ein `nav_app_leave()` aus, springt also auf die vorherige App im Stack. → Mehr in [Navigation](./navigation).

→ Weiter mit [**Navigation**](./navigation).
