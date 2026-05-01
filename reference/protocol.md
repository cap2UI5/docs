# HTTP-Protokoll

Das Wire-Format zwischen Frontend und cap2UI5-Backend ist **identisch** zu abap2UI5. Diese Seite dokumentiert es als Referenz — du musst es als App-Entwickler nicht kennen, aber wenn du debuggst oder das Frontend austauscht, hilfreich.

## Endpoints

| Methode | Pfad | Wirkung |
|---|---|---|
| `GET`  | `/rest/root/z2ui5` | Bootstrap-HTML (lädt UI5 + Component) |
| `HEAD` | `/rest/root/z2ui5` | CSRF-Token-Prefetch (`X-CSRF-Token: disabled`) |
| `POST` | `/rest/root/z2ui5` | Roundtrip — JSON-Body siehe unten |

Mounts:

- `GET`/`HEAD` werden in `srv/server.js` per `cds.on("bootstrap", ...)` registriert.
- `POST` wird automatisch von CAP exponiert, weil `cat-service.cds` die Action `z2ui5(value: object)` deklariert.

## Request-Body

Der Frontend-Treiber sendet immer `Content-Type: application/json`. Body-Struktur:

```json
{
  "value": {
    "S_FRONT": {
      "ID":            "<UUID der Vorgänger-App-Instanz oder leer>",
      "APP":           "<Klassenname der aktuell geladenen App>",
      "EVENT":         "<Event-Name oder leerer String>",
      "T_EVENT_ARG":   ["arg1", "arg2", ...],
      "R_EVENT_DATA":  { /* optionales Objekt-Payload */ },
      "ORIGIN":        "https://my-host.cf.eu10.hana.ondemand.com",
      "PATHNAME":      "/rest/root/z2ui5",
      "SEARCH":        "?app_start=...",
      "HASH":          "",
      "CONFIG":        { /* ComponentData */ }
    },
    "XX":    { /* Two-way-Bindings: User-Edits */ },
    "MODEL": { /* aktueller Modellstand des Frontends */ }
  }
}
```

CDS verlangt durch die Action-Signatur `z2ui5(value: object)`, dass der eigentliche oBody als `value` eingewickelt ist. Der `z2ui5_cl_http_handler` packt das wieder aus.

### `S_FRONT`-Felder

| Feld | Typ | Beschreibung |
|---|---|---|
| `ID` | `string` | UUID der zuletzt persistierten App-Instanz; leer beim ersten Roundtrip |
| `APP` | `string` | Klassenname der aktuellen App (informativ) |
| `EVENT` | `string` | Event-Name aus `_event(...)`. Leer beim Init-Aufruf. |
| `T_EVENT_ARG` | `string[]` | Event-Argumente aus `_event(name, args)` |
| `R_EVENT_DATA` | `any` | Optionaler Objekt-Payload aus `_event(name, args, ctrl, data)` |
| `ORIGIN` / `PATHNAME` / `SEARCH` / `HASH` | `string` | Browser-`location` |
| `CONFIG.ComponentData.startupParameters` | `object` | FLP-StartupParameters |

### `XX` (Two-way-Delta)

Plain JSON-Objekt mit den Feldern, die der User bearbeitet hat. Beispiel:

```json
"XX": {
  "username": "Alice",
  "preferences": { "language": "de" },
  "is_active": true
}
```

Die Engine wendet das per `main_json_to_attri` auf die deserialisierte App an.

## Response-Body

```json
{
  "S_FRONT": {
    "APP":   "<Klassenname>",
    "ID":    "<neue UUID>",
    "PARAMS": {
      "S_MSG_TOAST":         { "TEXT": "...", "AUTOCLOSE": "X", ... } | null,
      "S_MSG_BOX":           { "TEXT": "...", "TYPE": "warning", ... } | null,
      "S_VIEW":              { "XML": "<mvc:View>..." } | null,
      "S_VIEW_NEST":         { "XML": "...", "ID": "...", "METHOD_INSERT": "..." } | null,
      "S_VIEW_NEST2":        { ... } | null,
      "S_POPUP":             { "XML": "..." } | null,
      "S_POPOVER":           { "XML": "...", "OPEN_BY_ID": "..." } | null,
      "S_FOLLOW_UP_ACTION":  { "CUSTOM_JS": [".eF('OPEN_NEW_TAB','...')", ...] } | null,
      "SET_PUSH_STATE":      <any> | null,
      "SET_APP_STATE_ACTIVE":"X" | null,
      "SET_NAV_BACK":        "X" | null,
      "S_STATEFUL":          { "ACTIVE": true } | null
    }
  },
  "MODEL": {
    /* One-way-Bindings auf Top-Level */
    "users": [...],
    "title": "...",
    "XX": {
      /* Two-way-Bindings */
      "username": "...",
      ...
    }
  }
}
```

### `MODEL`-Aufbau

Die Engine baut `MODEL` aus dem `aBind`-Array auf:

```js
client.aBind = [
  { name: "users",    val: [...], type: "one_way" },
  { name: "username", val: "...", type: "two_way" },
  ...
];
```

One-way-Einträge landen direkt unter `MODEL`, Two-way-Einträge unter `MODEL.XX`. Der Frontend-JSONModel wird damit als Default-Modell der View gesetzt, woraus die Bindings (`{/...}` und `{/XX/...}`) auflösbar sind.

## Beispiel-Roundtrip

### Initialer Roundtrip (Init)

**Request:**
```json
{ "value": {
  "S_FRONT": { "ID": "", "EVENT": "", "ORIGIN": "...", "PATHNAME": "/rest/root/z2ui5", "SEARCH": "?app_start=hello_world" },
  "XX": {},
  "MODEL": {}
}}
```

**Response:**
```json
{
  "S_FRONT": {
    "APP": "hello_world",
    "ID": "abc-123",
    "PARAMS": {
      "S_VIEW": { "XML": "<mvc:View>...<Input value=\"{/XX/name}\"/>...</mvc:View>" }
    }
  },
  "MODEL": { "XX": { "name": "" } }
}
```

### Button-Click-Roundtrip

**Request:**
```json
{ "value": {
  "S_FRONT": { "ID": "abc-123", "EVENT": "BUTTON_POST", "T_EVENT_ARG": [] },
  "XX": { "name": "Alice" },
  "MODEL": {}
}}
```

**Response:**
```json
{
  "S_FRONT": {
    "APP": "hello_world",
    "ID": "def-456",
    "PARAMS": {
      "S_MSG_BOX": { "TEXT": "Your name is Alice", "TYPE": "information" }
    }
  },
  "MODEL": { "XX": { "name": "Alice" } }
}
```

## Frontend-Action-Strings (`eB`/`eF`)

Vom Server an den Frontend-Treiber wandern Action-Strings im UI5-Bindings-Slot (`press="..."`):

- **`eB(...)`** = "event Backend" → triggert einen Roundtrip
- **`eF(...)`** = "event Frontend" → läuft nur im Frontend

Format:

```
.eB([['EVENT_NAME', '', '', '']], 'arg1', 'arg2')
                  ↑    ↑    ↑   ↑
                  |    |    |   force_main_model (truthy)
                  |    |    bypass_busy (truthy)
                  |    reserved
                  event-name
```

`_event(name, args, ctrl)` baut das automatisch — du brauchst die Innereien nur, wenn du das Frontend selbst extendst.

→ Weiter mit dem [Datenbankmodell](./database).
