# HTTP Protocol

The wire format between the frontend and the cap2UI5 backend is **identical** to abap2UI5. This page documents it for reference — you don't need to know it as an app developer, but it's helpful when debugging or when swapping out the frontend.

## Endpoints

| Method | Path | Effect |
|---|---|---|
| `GET`  | `/rest/root/z2ui5` | Bootstrap HTML (loads UI5 + Component) |
| `HEAD` | `/rest/root/z2ui5` | CSRF token prefetch (`X-CSRF-Token: disabled`) |
| `POST` | `/rest/root/z2ui5` | Roundtrip — JSON body see below |

Mounts:

- `GET`/`HEAD` are registered in `srv/server.js` via `cds.on("bootstrap", ...)`.
- `POST` is automatically exposed by CAP because `cat-service.cds` declares the action `z2ui5(value: object)`.

## Request body

The frontend driver always sends `Content-Type: application/json`. Body structure:

```json
{
  "value": {
    "S_FRONT": {
      "ID":            "<UUID of the predecessor app instance, or empty>",
      "APP":           "<class name of the currently loaded app>",
      "EVENT":         "<event name or empty string>",
      "T_EVENT_ARG":   ["arg1", "arg2", ...],
      "R_EVENT_DATA":  { /* optional object payload */ },
      "ORIGIN":        "https://my-host.cf.eu10.hana.ondemand.com",
      "PATHNAME":      "/rest/root/z2ui5",
      "SEARCH":        "?app_start=...",
      "HASH":          "",
      "CONFIG":        { /* ComponentData */ }
    },
    "XX":    { /* two-way bindings: user edits */ },
    "MODEL": { /* current model state on the frontend */ }
  }
}
```

CDS requires, through the action signature `z2ui5(value: object)`, that the actual oBody be wrapped as `value`. The `z2ui5_cl_http_handler` unwraps it again.

### `S_FRONT` fields

| Field | Type | Description |
|---|---|---|
| `ID` | `string` | UUID of the most recently persisted app instance; empty on the first roundtrip |
| `APP` | `string` | Class name of the current app (informational) |
| `EVENT` | `string` | Event name from `_event(...)`. Empty on init call. |
| `T_EVENT_ARG` | `string[]` | Event arguments from `_event(name, args)` |
| `R_EVENT_DATA` | `any` | Optional object payload from `_event(name, args, ctrl, data)` |
| `ORIGIN` / `PATHNAME` / `SEARCH` / `HASH` | `string` | Browser `location` |
| `CONFIG.ComponentData.startupParameters` | `object` | FLP startup parameters |

### `XX` (two-way delta)

Plain JSON object with the fields the user edited. Example:

```json
"XX": {
  "username": "Alice",
  "preferences": { "language": "de" },
  "is_active": true
}
```

The engine applies it to the deserialized app via `main_json_to_attri`.

## Response body

```json
{
  "S_FRONT": {
    "APP":   "<class name>",
    "ID":    "<new UUID>",
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
    /* one-way bindings on top level */
    "users": [...],
    "title": "...",
    "XX": {
      /* two-way bindings */
      "username": "...",
      ...
    }
  }
}
```

### `MODEL` structure

The engine builds `MODEL` from the `aBind` array:

```js
client.aBind = [
  { name: "users",    val: [...], type: "one_way" },
  { name: "username", val: "...", type: "two_way" },
  ...
];
```

One-way entries land directly under `MODEL`; two-way entries under `MODEL.XX`. The frontend JSONModel is set as the default model on the view, from which the bindings (`{/...}` and `{/XX/...}`) resolve.

## Sample roundtrip

### Initial roundtrip (init)

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

### Button-click roundtrip

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

## Frontend action strings (`eB`/`eF`)

Action strings travel from the server to the frontend driver in the UI5 binding slot (`press="..."`):

- **`eB(...)`** = "event Backend" → triggers a roundtrip
- **`eF(...)`** = "event Frontend" → runs only in the frontend

Format:

```
.eB([['EVENT_NAME', '', '', '']], 'arg1', 'arg2')
                  ↑    ↑    ↑   ↑
                  |    |    |   force_main_model (truthy)
                  |    |    bypass_busy (truthy)
                  |    reserved
                  event name
```

`_event(name, args, ctrl)` builds this automatically — you only need the internals if you extend the frontend yourself.

→ Continue with the [Database Model](./database).
