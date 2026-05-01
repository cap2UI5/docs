# Projektstruktur

Ein cap2UI5-Projekt ist ein **stinknormales CAP-Projekt** mit zwei zusätzlichen Bausteinen: dem `z2ui5/`-Framework-Ordner unter `srv/` und dem statischen Frontend-Bundle unter `app/z2ui5/`. Diese Seite zeigt, was wo liegt und warum.

## Top-Level

```
cap2UI5/
├── app/
│   └── z2ui5/                  # ← statisches UI5-Frontend (read-only)
├── db/
│   └── schema.cds              # ← Persistenz-Tabelle z2ui5_t_01
├── srv/
│   ├── cat-service.cds         # ← CDS-Service-Definitionen
│   ├── cat-service.js          # ← Service-Handler
│   ├── server.js               # ← CAP-Bootstrap
│   ├── samples/                # ← deine Apps
│   └── z2ui5/                  # ← Framework-Library
├── mta.yaml                    # ← Cloud-Foundry-Deployment
├── xs-security.json
└── package.json
```

## `srv/cat-service.cds` — der Service

Die Datei deklariert zwei Services. Der erste (`AdminService`) ist optional — er ist die "normale" CDS-Schnittstelle für externe OData-Konsumenten. Der zweite (`rootService`) ist das **Herz von cap2UI5**:

```cds
@protocol: 'rest'
service rootService {

    @open
    type object {};

    action z2ui5(value : object) returns object;

}
```

Eine einzige Action `z2ui5(value)` — der gesamte Roundtrip läuft hier. CAP selbst exponiert sie automatisch unter `POST /rest/root/z2ui5`.

→ Mehr in [HTTP-Protokoll](../reference/protocol).

## `srv/cat-service.js` — der Handler

```js
const cds = require("@sap/cds");
const z2ui5_cl_http_handler = require("./z2ui5/02/z2ui5_cl_http_handler");

module.exports = cds.service.impl(async function (srv) {
  srv.on("z2ui5", z2ui5_cl_http_handler);
  // … deine eigenen READ/CREATE/etc. Handler kommen hier dazu
});
```

Eine Zeile, um die Action mit dem Framework-Handler zu verbinden. Du kannst hier beliebige weitere Service-Handler ergänzen, sie laufen normal weiter.

## `srv/server.js` — der Bootstrap

```js
const cds = require("@sap/cds");
const z2ui5_cl_app_index_html = require("./z2ui5/01/03/z2ui5_cl_app_index_html");

cds.on("bootstrap", (app) => {
  app.get("/rest/root/z2ui5",  (_req, res) => {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(z2ui5_cl_app_index_html.get_source());
  });

  app.head("/rest/root/z2ui5", (_req, res) => {
    res.set("X-CSRF-Token", "disabled");
    res.status(200).end();
  });
});

module.exports = cds.server;
```

Das ist nötig, weil CDS-REST-Actions **nur POST** verstehen. Der **GET** liefert die Bootstrap-HTML aus, die das UI5-Bundle lädt; der **HEAD** beantwortet den CSRF-Prefetch.

## `db/schema.cds` — die Persistenz

```cds
namespace my.domain;

entity z2ui5_t_01 {
  key id      : UUID;
  id_prev     : UUID;
  data        : LargeString;
}
```

Hier landen die **serialisierten App-Instanzen** zwischen Roundtrips. Jede Roundtrip-Antwort enthält die neue `id`, die der Frontend beim nächsten Call mitsendet — der Server lädt darüber die App und applyt das Frontend-Delta.

→ Details in [Datenbankmodell](../reference/database).

## `srv/z2ui5/` — das Framework

```
srv/z2ui5/
├── 00/03/z2ui5_cl_util.js               # RTTI / Klassen-Lookup
├── 01/01/z2ui5_cl_core_srv_draft.js     # Serialize / DB-Persistenz
├── 01/02/                               # Core-Logik
│   ├── z2ui5_cl_core_handler.js         # Roundtrip-Orchestrator
│   ├── z2ui5_cl_core_action.js          # App-Resolution
│   ├── z2ui5_cl_core_app.js             # Lifecycle-Helper
│   ├── z2ui5_cl_core_client.js          # Die Client-Klasse (deine API)
│   ├── z2ui5_cl_core_srv_bind.js        # _bind / _bind_edit Implementierung
│   ├── z2ui5_cl_core_srv_event.js       # _event String-Builder
│   ├── z2ui5_cl_core_srv_model.js       # XX-Delta + Response-Modell
│   └── z2ui5_if_core_types.js           # Konstanten-Container
├── 01/03/                               # Bootstrap-Assets als JS-Modul
│   └── z2ui5_cl_app_index_html.js
└── 02/                                  # Public API
    ├── z2ui5_if_app.js                  # Basisklasse für Apps
    ├── z2ui5_cl_http_handler.js         # CDS-Action-Adapter
    ├── z2ui5_cl_xml_view.js             # ViewBuilder
    ├── z2ui5_cl_xml_view_cc.js          # Custom-Control-Decorator
    ├── z2ui5_cl_app_startup.js          # eingebauter Launcher
    └── z2ui5_cl_app_hello_world.js      # Mini-Beispiel
```

Die Numerierung `00/`, `01/`, `02/` spiegelt die abap2UI5-Schichtung wider:

- **`00/`** — pure Utilities, keine Abhängigkeiten in das System
- **`01/`** — Core-Plumbing (Persistenz, Handler, Binding-Engine, HTML-Bootstrap)
- **`02/`** — alles, was App-Entwickler **direkt importieren**: `z2ui5_if_app`, `z2ui5_cl_xml_view`, der HTTP-Adapter

Als App-Entwickler musst du fast immer nur diese zwei Imports kennen:

```js
const z2ui5_if_app      = require("../z2ui5/02/z2ui5_if_app");
const z2ui5_cl_xml_view = require("../z2ui5/02/z2ui5_cl_xml_view");
```

::: warning Hands off `01/`
Die `01/`-Schicht wird als 1:1-Port aus abap2UI5 gepflegt. Anpassungen dort werden bei der nächsten Sync überschrieben.
:::

## `srv/samples/` — deine Apps

Ein flacher Ordner mit `*.js`-Dateien, in denen jeweils _eine_ App-Klasse lebt. Konvention: **Dateiname = Klassenname**. Der Lookup (`z2ui5_cl_util.rtti_get_class`) findet alles unter:

- `srv/z2ui5/02/`  (Framework-Apps)
- `srv/z2ui5/02/01/` (Pop-Helper)
- `srv/samples/`     (deine Apps)

Du kannst diesen Lookup-Pfad nicht trivial ändern, ohne `_findAppFile` in `z2ui5_cl_core_srv_draft.js` zu patchen — pflege deine Apps idealerweise unter `srv/samples/` oder erweitere den Lookup.

## `app/z2ui5/` — das Frontend

Ein **fertiges, statisches** UI5-Bundle, das aus [abap2UI5](https://github.com/abap2UI5/abap2UI5) per CI-Pipeline (`npm run mirror_frontend`) kopiert wird. Du fasst es nicht an. Updates des Bundles bekommst du automatisch.

```
app/z2ui5/
└── webapp/
    ├── index.html              # ersetzt durch z2ui5_cl_app_index_html.get_source()
    ├── manifest.json           # ersetzt durch ein cap2UI5-spezifisches Manifest
    ├── Component.js
    ├── controller/
    ├── view/
    └── ... (UI5-Custom-Controls, Action-Handler, etc.)
```

Der Mirror-Workflow ersetzt **nur** `index.html` und `manifest.json` durch die cap2UI5-Versionen aus `app/backup/`, alles andere bleibt 1:1 wie im abap2UI5-Repo.

## `package.json` — die Konfiguration

Schaue auf den `cds.requires`-Block:

```json
"cds": {
  "requires": {
    "northwind": {
      "kind": "odata-v2",
      "model": "srv/external/northwind",
      "credentials": {
        "url": "https://services.odata.org/V2/Northwind/Northwind.svc/"
      }
    }
  },
  "destinations": true,
  "html5-repo": true,
  "workzone": true
}
```

Externe Services kannst du wie gewohnt deklarieren und in deiner App per `cds.connect.to(...)` ansprechen. Siehe das Northwind-Beispiel unter [External OData](../examples/external-odata).

→ Weiter zum [**App-Lifecycle**](./lifecycle).
