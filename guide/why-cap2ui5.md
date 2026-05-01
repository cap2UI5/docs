# Warum cap2UI5?

Diese Seite richtet sich an **CAP-Entwickler**, die UI5-Apps anbieten müssen, aber das Tooling-Overhead, die doppelte Datenmodellierung und das XML-Pflegen leid sind.

## Das Problem in der klassischen Welt

Eine "kleine" UI5-App auf CAP zu starten, kostet dich heute:

```
my-cap-project/
├── srv/
│   ├── catalog-service.cds          # Service-Definition
│   ├── catalog-service.js           # Handler
│   └── ...
├── app/
│   └── catalog/
│       ├── webapp/
│       │   ├── Component.js         # ← Boilerplate
│       │   ├── manifest.json        # ← Boilerplate
│       │   ├── index.html           # ← Boilerplate
│       │   ├── i18n/i18n.properties
│       │   ├── controller/
│       │   │   └── App.controller.js
│       │   ├── view/
│       │   │   └── App.view.xml     # ← XML pflegen
│       │   └── model/
│       │       └── models.js
│       ├── package.json             # ← zweite npm-Welt
│       ├── ui5.yaml                 # ← UI5-Build-Tooling
│       └── xs-app.json
└── package.json
```

Das **erste klickbare UI** kostet dich locker eine Stunde Setup, bevor du eine Zeile Business-Logik geschrieben hast. Ändert sich später ein Feldname, musst du an _drei_ Stellen anfassen: CDS-Entity, Service-Handler, View.

## Was cap2UI5 ändert

Mit cap2UI5 reduziert sich die Struktur auf:

```
my-cap-project/
├── srv/
│   ├── cat-service.cds              # ← + 4 Zeilen für die z2ui5-Action
│   ├── cat-service.js               # ← + 1 Zeile srv.on('z2ui5', handler)
│   ├── server.js                    # ← + bootstrap-HTML-Mount
│   ├── samples/
│   │   └── my_app.js                # ← deine App. Eine Datei.
│   └── z2ui5/                       # ← Library (ungeändert mitgezogen)
└── app/
    └── z2ui5/                       # ← statisches Frontend (ungeändert mitgezogen)
```

Eine neue UI = **eine neue JS-Datei in `srv/samples/`**. Aufrufbar sofort über `?app_start=my_app`.

## Konkrete Vorteile

### 1. Einheitliche Sprache & Tooling

Du arbeitest die ganze Zeit in **JavaScript** (oder TypeScript, falls gewünscht). Kein XML-Editor, kein UI5-CLI, kein doppeltes `npm install`. Dein vorhandener `cds watch`-Workflow reicht.

```bash
npx cds w
# → CAP-Server läuft auf :4004
# → öffne /rest/root/z2ui5 → fertig
```

### 2. Server-State = App-State

Eine cap2UI5-App ist eine **Klasse mit Feldern**. Diese Felder sind dein State:

```js
class CustomerEdit extends z2ui5_if_app {

  customer_id   = "";
  customer_data = {};
  is_dirty      = false;
  validation    = { name: "None", email: "None" };

  async main(client) { /* ... */ }
}
```

Nach jedem Roundtrip wird die ganze Instanz **automatisch in der CDS-Entity `z2ui5_t_01` persistiert**. Beim nächsten Roundtrip wird sie deserialisiert, das Frontend-Delta (XX) angewendet, und `main()` läuft erneut. Du brauchst keinen JSONModel zu verwalten, keinen Reducer zu schreiben, keinen "Service Worker" für Offline-State — der Server hält alles.

### 3. Reference-Equality-Bindings

Das ist das Kern-Pattern, das cap2UI5 (und abap2UI5) erst zu leichtem Code macht:

```js
.Input({ value: client._bind_edit(this.name) })
```

`_bind_edit(this.name)` schaut in deiner App-Instanz nach, **welches Property dem übergebenen Wert entspricht**, und gibt den Pfad als UI5-Bindings-Expression `{/XX/name}` zurück. Wenn der User tippt, wandert der Wert über das Delta zurück in `this.name`. Kein manuelles Mapping, keine Property-Strings, kein Sync-Code.

→ Details unter [Data Binding](./data-binding).

### 4. Kein OData-Layer für UI-Zwecke

In klassisch-CAP musst du für jedes Feld in der UI eine OData-fähige Entity bauen. Bei cap2UI5 ist die View an deinen **Server-State** gebunden — der kann beliebige JavaScript-Werte sein, auch geschachtelte Strukturen, die du _nie_ als CDS-Entity modellieren würdest:

```js
this.wizard_state = {
  step: 2,
  inputs: { /* ... */ },
  errors: [],
  preview: { /* berechnet aus inputs */ }
};
```

Du nutzt CDS-Entities da, wo es **fachlich Sinn macht** (Stammdaten, Geschäftsdaten) — nicht, weil das UI darauf besteht.

### 5. Externe Calls nahtlos

In `main()` kannst du **alles** machen, was Node.js erlaubt — natürlich auch CAP-Connections:

```js
async main(client) {
  if (client.check_on_init()) {
    const northwind = await cds.connect.to("northwind");
    this.customers = await northwind.run(SELECT.from("Customers"));
    /* ... view ... */
  }
}
```

Der Server kennt schon Auth, Destinations, und alle CDS-Services. **Du musst nichts in die UI tunneln**, weil die UI-Logik direkt im Backend lebt.

### 6. Sicherheit per Default

Es gibt keinen "frei zugänglichen" OData-Endpoint, der für die UI da wäre. Der einzige offene Endpoint ist `POST /rest/root/z2ui5` — und der nimmt nur Frontend-Events entgegen, die der Server gerendert hat. Server-State, der nicht ge-bindet ist, ist auch nicht erreichbar.

→ Vergleich mit Fiori Elements: dort ist jede Spalte einer SmartTable ein OData-Endpoint, den ein Angreifer beliebig durchpaginieren kann.

### 7. Schnelles initiales Rendering

Das UI5-Bundle wird einmal geladen. Danach gibt jedes Roundtrip nur **ein bisschen XML + ein JSON-Delta** zurück — keine Component-Initialisierung, keine zweite OData-Metadata-Round, keine i18n-Roundtrip.

## Wo es unfair wird

cap2UI5 löst nicht jedes Problem. Konkret:

- **Offline-Szenarien**: jede Interaktion ist ein Roundtrip. Wenn du offline-fähig sein musst, schreib Fiori Elements oder einen klassischen UI5-Aufbau.
- **Pixel-Designs außerhalb von UI5-Standard**: der View Builder kennt `sap.m`, `sap.ui.layout`, `sap.tnt`, plus die z2ui5-Custom-Controls. Wenn du eigene, fremde JS-Bibliotheken einbinden willst, geht das — aber mit deutlich mehr Arbeit.
- **Read-Heavy Listen** mit Live-Such-Filter über Millionen Zeilen: für jede Filteränderung ein Server-Roundtrip — das skaliert nicht so gut wie OData-Bindings, die der Frontend-Treiber lokal im JSONModel filtert.

Für **UI-zentrierte Backoffice-Apps**, die typischer CAP-Anwendungsfall sind, ist cap2UI5 fast immer die ergonomischere Wahl.

→ Weiter mit dem [**Quickstart**](./getting-started) oder dem Architektur-Reference unter [Architektur](../reference/architecture).
