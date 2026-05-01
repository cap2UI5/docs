# Architecture

This page shows in detail **how a roundtrip flows through the system** — from the click in the browser to DB persistence and back.

## Component overview

```
┌────────── Browser ──────────┐
│  Static UI5 bundle          │
│  (from abap2UI5 mirror)     │
│   ├ index.html              │
│   ├ Component.js            │
│   ├ Actions.js (eF/eB)      │
│   └ JSONModel               │
└────────────┬────────────────┘
             │ POST /rest/root/z2ui5
             │ { S_FRONT, XX, MODEL }
             ▼
┌──────── CAP server ─────────┐
│  Express + @sap/cds         │
│  cat-service.cds            │
│   action z2ui5(value)       │
│  cat-service.js             │
│   srv.on('z2ui5', handler)  │
└────────────┬────────────────┘
             │
             ▼
┌──── z2ui5_cl_http_handler ──┐
│  unwrap req.data.value      │
└────────────┬────────────────┘
             │
             ▼
┌──── z2ui5_cl_core_handler ──┐
│  1. action.factory_main     │── ▶ DB.loadApp(id)
│  2. validate                │
│  3. apply XX delta          │
│  4. await app.main(client)  │── ▶ your app class
│  5. nav loop (if active)    │
│  6. db_save                 │── ▶ DB.saveApp
│  7. build response          │
└────────────┬────────────────┘
             │
             ▼
┌────── CDS persistence ──────┐
│  Entity z2ui5_t_01          │
│  (UUID, id_prev, data)      │
└─────────────────────────────┘
```

## Roundtrip in detail

### 1. HTTP reception

The `cat-service.cds` declares:

```cds
@protocol: 'rest'
service rootService {
  @open type object {};
  action z2ui5(value : object) returns object;
}
```

CAP automatically exposes this under `POST /rest/root/z2ui5`. The body lands as the CDS action parameter `value` (type `object`).

In addition, `server.js` registers via `cds.on("bootstrap", ...)`:

- `GET /rest/root/z2ui5` → returns the bootstrap HTML from `z2ui5_cl_app_index_html.get_source()`
- `HEAD /rest/root/z2ui5` → CSRF token prefetch and sap-terminate ack

### 2. CDS action handler

In `cat-service.js`:

```js
srv.on("z2ui5", z2ui5_cl_http_handler);
```

`z2ui5_cl_http_handler` only does the action wrapper unwrapping:

```js
const oBody = req?.data?.value ?? req?.data ?? req;
const oHandler = new z2ui5_cl_core_handler();
const responseJson = await oHandler.main(oBody);
return JSON.parse(responseJson);
```

It unwraps the abap2UI5-compatible body from the CDS action wrapper. With that, `oBody` is exactly what the abap2UI5 ICF interface receives directly.

### 3. Roundtrip orchestrator

`z2ui5_cl_core_handler.main(body)` runs through six phases:

#### Phase 1 — app resolution

```js
let oApp = await Action.factory_main(oReq, oClient);
```

`z2ui5_cl_core_action.factory_main` determines which app serves this roundtrip:

1. `oClient._navTarget` (in-memory, from a previous hop) — rare
2. `oReq.S_FRONT.ID` — DB load
3. `?app_start=ClassName` URL parameter — RTTI lookup
4. **Fallback**: `z2ui5_cl_app_startup` (built-in launcher)

It also rehydrates the nav stack from `oApp.__navStackIds`.

#### Phase 2 — validation

```js
z2ui5_cl_core_app.validate(oApp);
```

Throws if the app does not extend `z2ui5_if_app`.

#### Phase 3 — apply XX delta

```js
z2ui5_cl_core_srv_model.main_json_to_attri(oApp, oReq.XX);
```

The `XX` object on the request contains the user edits from two-way bindings (e.g. `{XX: { username: "Alice" }}`). The engine applies them to the app instance (deep merge).

#### Phase 4 — call `main()`

```js
await oApp.main(oClient);
oApp.check_initialized = true;
```

This is where your own app logic runs. While `main()` runs, it writes slots into `oClient` via `client.view_display(...)`, `client.message_toast_display(...)` etc.

#### Phase 5 — nav loop

If `main()` triggered a `nav_app_call(...)` or `nav_app_leave()`, `oClient._navTarget` is set. The handler "takes one step further":

```js
while (oClient._navTarget) {
  // ... push / pop stack ...
  await z2ui5_cl_core_app.run(navApp, oClient, oReq, true);
}
```

That means: up to N nested navigations can take place in **a single** roundtrip — e.g. "open picker → user immediately clicks a default → close picker → return".

#### Phase 6 — persistence

```js
const generatedId = await z2ui5_cl_core_app.db_save(oApp, oClient, previousId);
```

First the stack apps, then the final app. Stack IDs are recorded on `oApp.__navStackIds`.

#### Phase 7 — build response

```js
const oResponse = {
  S_FRONT: { APP, ID: generatedId, PARAMS: { S_VIEW, S_POPUP, ... } },
  MODEL:   z2ui5_cl_core_srv_model.main_json_stringify(oClient.aBind)
};
return JSON.stringify(oResponse);
```

`MODEL` is built from the `aBind` entries that the builder registered during `main()`. That's the JSONModel that runs as the default model on the frontend.

## Class architecture

The `cap2UI5/srv/z2ui5/` library mirrors **abap2UI5's layered model**:

```
00 — Pure utilities (no framework dependencies)
└─ 03/z2ui5_cl_util              RTTI, class lookup, URL builder

01 — Core
├─ 01/z2ui5_cl_core_srv_draft    Serialize / deserialize / DB
├─ 02/z2ui5_cl_core_handler      Roundtrip orchestrator
├─ 02/z2ui5_cl_core_action       App resolution
├─ 02/z2ui5_cl_core_app          Lifecycle helper
├─ 02/z2ui5_cl_core_client       The client class (your API)
├─ 02/z2ui5_cl_core_srv_bind     _bind / _bind_edit implementation
├─ 02/z2ui5_cl_core_srv_event    _event string builder
├─ 02/z2ui5_cl_core_srv_model    XX delta + response model
├─ 02/z2ui5_if_core_types        internal type containers
└─ 03/z2ui5_cl_app_index_html    bootstrap HTML as a JS module

02 — Public API (app developer imports)
├─ z2ui5_if_app                  Base class for your apps
├─ z2ui5_cl_http_handler         CDS action adapter
├─ z2ui5_cl_xml_view             View Builder
├─ z2ui5_cl_xml_view_cc          Custom control decorator
├─ z2ui5_cl_app_startup          Built-in launcher
├─ z2ui5_cl_app_hello_world      Mini example
└─ 01/z2ui5_cl_pop_*             Pop helpers
```

The layering is **no accident** — it's the abap2UI5 convention, ported to JS. If you read into one of these files, you'll find the same layout in the abap2UI5 repo.

## Wire-format compatibility

The **frontend bundle** under `app/z2ui5/` is mirrored from the abap2UI5 repo via a CI workflow (`npm run mirror_frontend` in `cap2UI5/package.json`). This means: every patch in the abap2UI5 frontend code flows over here.

For that to work, cap2UI5's backend must speak **bit-exact the same wire format** as abap2UI5's ABAP backend:

- `S_FRONT.ID`, `S_FRONT.EVENT`, `S_FRONT.T_EVENT_ARG` — all uppercase
- `MODEL.XX.<path>` for two-way, `MODEL.<path>` for one-way
- `S_VIEW.XML`, `S_POPUP.XML`, `S_POPOVER.XML`
- `S_FOLLOW_UP_ACTION.CUSTOM_JS` as an array
- `S_MSG_TOAST`, `S_MSG_BOX` with ABAP-typical `"X"`/`""` booleans

This is visible in the code (see `z2ui5_cl_core_handler.main` at the bottom).

## CAP-specific notes

- **CDS REST action instead of custom Express routing**: makes the z2ui5 endpoint an ordinary CAP service entry — auth, auditing, tracing apply automatically.
- **CDS entity instead of a custom SQL table**: app persistence uses the normal CAP DB connection. Deploy on SQLite (dev), HANA (cloud), Postgres — works without code changes.
- **`cds.connect.to(...)` in `main()`**: your apps have immediate access to all declared external services, without separate connection registration.

→ Continue with the [HTTP Protocol](./protocol).
