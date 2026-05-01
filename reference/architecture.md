# Architektur

Diese Seite zeigt im Detail, **wie ein Roundtrip durch das System läuft** — vom Klick im Browser bis zur DB-Persistenz und zurück.

## Komponenten-Übersicht

```
┌────────── Browser ──────────┐
│  Statisches UI5-Bundle      │
│  (aus abap2UI5 mirror)      │
│   ├ index.html              │
│   ├ Component.js            │
│   ├ Actions.js (eF/eB)      │
│   └ JSONModel               │
└────────────┬────────────────┘
             │ POST /rest/root/z2ui5
             │ { S_FRONT, XX, MODEL }
             ▼
┌──────── CAP-Server ─────────┐
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
│  3. apply XX-Delta          │
│  4. await app.main(client)  │── ▶ deine App-Klasse
│  5. nav-loop (falls aktiv)  │
│  6. db_save                 │── ▶ DB.saveApp
│  7. build response          │
└────────────┬────────────────┘
             │
             ▼
┌────── CDS-Persistenz ───────┐
│  Entity z2ui5_t_01          │
│  (UUID, id_prev, data)      │
└─────────────────────────────┘
```

## Roundtrip im Detail

### 1. HTTP-Empfang

Die `cat-service.cds` deklariert:

```cds
@protocol: 'rest'
service rootService {
  @open type object {};
  action z2ui5(value : object) returns object;
}
```

CAP exponiert das automatisch unter `POST /rest/root/z2ui5`. Der Body landet als CDS-Action-Parameter `value` (Typ `object`).

Zusätzlich registriert `server.js` per `cds.on("bootstrap", ...)`:

- `GET /rest/root/z2ui5` → liefert das Bootstrap-HTML aus `z2ui5_cl_app_index_html.get_source()`
- `HEAD /rest/root/z2ui5` → CSRF-Prefetch und sap-terminate ack

### 2. CDS-Action-Handler

In `cat-service.js`:

```js
srv.on("z2ui5", z2ui5_cl_http_handler);
```

`z2ui5_cl_http_handler` macht nur das Action-Wrapper-Unwrapping:

```js
const oBody = req?.data?.value ?? req?.data ?? req;
const oHandler = new z2ui5_cl_core_handler();
const responseJson = await oHandler.main(oBody);
return JSON.parse(responseJson);
```

Es entkapselt den abap2UI5-kompatiblen Body aus dem CDS-Action-Wrapper. Damit ist `oBody` exakt das, was die abap2UI5-ICF-Schnittstelle direkt empfängt.

### 3. Roundtrip-Orchestrator

`z2ui5_cl_core_handler.main(body)` durchläuft sechs Phasen:

#### Phase 1 — App-Resolution

```js
let oApp = await Action.factory_main(oReq, oClient);
```

`z2ui5_cl_core_action.factory_main` ermittelt, welche App diesen Roundtrip bedient:

1. `oClient._navTarget` (in-memory, von vorherigem Hop) — selten
2. `oReq.S_FRONT.ID` — DB-Load
3. `?app_start=ClassName` URL-Parameter — RTTI-Lookup
4. **Fallback**: `z2ui5_cl_app_startup` (eingebauter Launcher)

Außerdem rehydriert es den Nav-Stack aus `oApp.__navStackIds`.

#### Phase 2 — Validierung

```js
z2ui5_cl_core_app.validate(oApp);
```

Wirft, wenn die App nicht von `z2ui5_if_app` erbt.

#### Phase 3 — XX-Delta anwenden

```js
z2ui5_cl_core_srv_model.main_json_to_attri(oApp, oReq.XX);
```

Das `XX`-Objekt der Request enthält die User-Edits aus Two-way-Bindings (z.B. `{XX: { username: "Alice" }}`). Die Engine wendet sie auf die App-Instanz an (deep merge).

#### Phase 4 — `main()` aufrufen

```js
await oApp.main(oClient);
oApp.check_initialized = true;
```

Hier landet deine eigene App-Logik. Während `main()` läuft, schreibt sie über `client.view_display(...)`, `client.message_toast_display(...)` etc. Slots in `oClient`.

#### Phase 5 — Nav-Loop

Wenn `main()` ein `nav_app_call(...)` oder `nav_app_leave()` ausgelöst hat, ist `oClient._navTarget` gesetzt. Der Handler "tritt einen Schritt weiter":

```js
while (oClient._navTarget) {
  // ... push / pop Stack ...
  await z2ui5_cl_core_app.run(navApp, oClient, oReq, true);
}
```

Heißt: bis zu N nested Navigationen können in **einem einzigen** Roundtrip stattfinden — z.B. "öffne Picker → User klickt sofort einen Default → schließe Picker → kehre zurück".

#### Phase 6 — Persistenz

```js
const generatedId = await z2ui5_cl_core_app.db_save(oApp, oClient, previousId);
```

Erst die Stack-Apps, dann die finale App. Stack-IDs werden auf `oApp.__navStackIds` festgehalten.

#### Phase 7 — Response bauen

```js
const oResponse = {
  S_FRONT: { APP, ID: generatedId, PARAMS: { S_VIEW, S_POPUP, ... } },
  MODEL:   z2ui5_cl_core_srv_model.main_json_stringify(oClient.aBind)
};
return JSON.stringify(oResponse);
```

`MODEL` wird aus den `aBind`-Einträgen aufgebaut, die der Builder während `main()` registriert hat. Das ist das JSONModel, das im Frontend als Default-Modell läuft.

## Klassen-Architektur

Die `cap2UI5/srv/z2ui5/`-Library spiegelt **abap2UI5s Schichtmodell**:

```
00 — Pure Utilities (keine Framework-Abhängigkeiten)
└─ 03/z2ui5_cl_util              RTTI, Class-Lookup, URL-Builder

01 — Core
├─ 01/z2ui5_cl_core_srv_draft    Serialize / Deserialize / DB
├─ 02/z2ui5_cl_core_handler      Roundtrip-Orchestrator
├─ 02/z2ui5_cl_core_action       App-Resolution
├─ 02/z2ui5_cl_core_app          Lifecycle-Helper
├─ 02/z2ui5_cl_core_client       die Client-Klasse (deine API)
├─ 02/z2ui5_cl_core_srv_bind     _bind / _bind_edit Implementierung
├─ 02/z2ui5_cl_core_srv_event    _event String-Builder
├─ 02/z2ui5_cl_core_srv_model    XX-Delta + Response-Modell
├─ 02/z2ui5_if_core_types        interne Typ-Container
└─ 03/z2ui5_cl_app_index_html    Bootstrap-HTML als JS-Modul

02 — Public API (App-Entwickler-Imports)
├─ z2ui5_if_app                  Basisklasse für deine Apps
├─ z2ui5_cl_http_handler         CDS-Action-Adapter
├─ z2ui5_cl_xml_view             View Builder
├─ z2ui5_cl_xml_view_cc          Custom-Control-Decorator
├─ z2ui5_cl_app_startup          eingebauter Launcher
├─ z2ui5_cl_app_hello_world      Mini-Beispiel
└─ 01/z2ui5_cl_pop_*             Pop-Helper
```

Die Schichtung ist **kein Zufall** — es ist die abap2UI5-Konvention, in JS portiert. Wenn du dich in einem dieser Files einliest, findest du dasselbe Layout im abap2UI5-Repo wieder.

## Wire-Format-Kompatibilität

Das **Frontend-Bundle** unter `app/z2ui5/` wird per CI-Workflow (`npm run mirror_frontend` in `cap2UI5/package.json`) aus dem abap2UI5-Repo gespiegelt. Das heißt: jeder Patch im abap2UI5-Frontend-Code wandert nach hier rüber.

Damit das funktioniert, muss cap2UI5s Backend **bit-genau dasselbe Wire-Format** sprechen wie abap2UI5s ABAP-Backend:

- `S_FRONT.ID`, `S_FRONT.EVENT`, `S_FRONT.T_EVENT_ARG` — alle Großschreibung
- `MODEL.XX.<path>` für Two-way, `MODEL.<path>` für One-way
- `S_VIEW.XML`, `S_POPUP.XML`, `S_POPOVER.XML`
- `S_FOLLOW_UP_ACTION.CUSTOM_JS` als Array
- `S_MSG_TOAST`, `S_MSG_BOX` mit ABAP-typischen `"X"`/`""`-Booleans

Das ist sichtbar im Code (siehe `z2ui5_cl_core_handler.main` ganz unten).

## CAP-Spezifika

- **CDS-REST-Action statt eigenes Express-Routing**: macht den z2ui5-Endpoint zu einem ganz normalen CAP-Service-Eintrag — auth, auditing, tracing greifen automatisch.
- **CDS-Entity statt eigene SQL-Tabelle**: die App-Persistenz nutzt die normale CAP-DB-Anbindung. Deploy auf SQLite (Dev), HANA (Cloud), Postgres — funktioniert ohne Code-Änderung.
- **`cds.connect.to(...)` in `main()`**: deine Apps haben sofort Zugriff auf alle deklarierten externen Services, ohne separate Connection-Registrierung.

→ Weiter mit dem [HTTP-Protokoll](./protocol).
