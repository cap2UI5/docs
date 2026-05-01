# Was ist cap2UI5?

**cap2UI5** ist ein Framework, mit dem du komplette SAPUI5-Anwendungen direkt in deinem **CAP-Backend (Node.js)** schreibst — als ganz normale JavaScript-Klassen. Kein eigenes Frontend-Projekt, kein Hand-XML, keine doppelte Datenmodellierung.

Wenn du den Begriff [abap2UI5](https://github.com/abap2UI5/abap2UI5) kennst: cap2UI5 ist **dasselbe Konzept**, aber statt eines ABAP-Backends sitzt darunter [SAP Cloud Application Programming Model (CAP)](https://cap.cloud.sap/) auf Node.js.

## Die Kernidee

In klassischer UI5-Entwicklung pflegst du **zwei Welten parallel**:

| | Backend (CAP) | Frontend (UI5) |
|---|---|---|
| Sprache | JS / TS | JS + XML + i18n |
| Build | `cds build` | `ui5 build` |
| State | DB / Service-Handler | JSONModel / Controller |
| Routing | CAP-Service | manifest.json + Router |
| Daten | CDS-Entities | OData-Bindings |

Das funktioniert — bedeutet aber, dass jeder kleine Workflow durch **drei Schichten** gehen muss: Service → OData → Controller → View. Bei Fiori Elements bekommt man Generierung, verliert aber Flexibilität.

cap2UI5 dreht das um: **dein CAP-Backend rendert die View** und tauscht den State automatisch mit dem Frontend aus. Das Frontend ist eine fertige, statische UI5-App, die du nicht mehr anfasst — sie bekommt das XML pro Roundtrip vom Server.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser  ─── statisches UI5-Frontend (von abap2UI5) ─────  │
│      ▲                                                      │
│      │  POST /rest/root/z2ui5  { S_FRONT, XX, MODEL }       │
│      ▼                                                      │
│  CAP-Server ─── deine App-Klasse → main(client) ──────────  │
│      └─ z2ui5_cl_xml_view.factory().Page().Input()...       │
│      └─ client.view_display(view.stringify())               │
│      └─ persistiert in CDS-Entity z2ui5_t_01                │
└─────────────────────────────────────────────────────────────┘
```

## Was du schreibst

Eine cap2UI5-App ist **eine einzige JavaScript-Klasse**, die `z2ui5_if_app` extended:

```js
class z2ui5_cl_app_hello_world extends z2ui5_if_app {

  name = "";        // ← App-State, automatisch persistiert

  async main(client) {
    if (client.check_on_init()) {
      // View rendern
      const view = z2ui5_cl_xml_view.factory()
        .Shell()
        .Page({ title: "Hello World" })
          .Input({  value: client._bind_edit(this.name) })
          .Button({ text: "Send", press: client._event("BUTTON_POST") });
      client.view_display(view.stringify());

    } else if (client.check_on_event("BUTTON_POST")) {
      // Event verarbeiten
      client.message_box_display(`Hello, ${this.name}!`);
    }
  }
}
```

Das ist alles. Kein `manifest.json`, kein `Component.js`, kein `View.controller.js`, keine separate `i18n.properties`. Der Server schickt pro Roundtrip XML + Modell-Delta, das Frontend zeigt es an.

## Was cap2UI5 _nicht_ ist

- **Kein UI5-Killer.** Es nutzt UI5 — sogar in seiner ganzen Breite (Page, Table, SimpleForm, ChartJS, FileUploader, Geolocation, …). Du gewinnst nur die View-Definition zurück auf den Server.
- **Kein Ersatz für CAP-Services.** Deine `srv/*.cds`-Services laufen weiter. cap2UI5 läuft _neben_ ihnen — als zusätzliche CDS-REST-Action. OData-Konsumenten (Mobile, Excel, BTP) sehen nichts davon.
- **Kein Server-Side-Rendering (SSR) im klassischen Sinn.** Es ist ein **server-driven UI** über JSON-Roundtrips, nicht Hydration eines initialen HTML.
- **Kein neues Framework.** Es ist ein _Pattern_ + ein paar tausend Zeilen JS, die du in deinem CAP-Projekt mitziehst.

## Die zwei Bestandteile

| Repository | Was | Wer berührt das? |
|---|---|---|
| [`cap2UI5/dev`](https://github.com/cap2UI5/dev) → Ordner `cap2UI5/srv/z2ui5/` | Backend-Library: Handler, View Builder, Persistenz | du baust hier deine Apps |
| [`abap2UI5/abap2UI5`](https://github.com/abap2UI5/abap2UI5) → Ordner `app/webapp/` | Statisches UI5-Frontend | nie (wird automatisch synchronisiert) |

Das Frontend ist **wire-format-kompatibel** mit abap2UI5 — heißt: jeder Patch dort kommt automatisch rüber. Das Backend ist die JS-Portierung von abap2UI5s Handler-Architektur.

## Wann ist cap2UI5 die richtige Wahl?

✅ **Internal Tools, Admin-Backends, Workflow-Apps** — schnell zusammengebaut, ein Entwickler reicht, kein Frontend-Build-Setup.
✅ **Migrations- und Daten-Maintenance-UIs** — wenn du eh CAP-Services schreibst und ein Mini-UI dazu brauchst.
✅ **Prototyping** — von der Idee zum klickbaren UI in Minuten.
✅ **Eingebettete Konfigurations-UIs** — z.B. ein Custom-Control-Panel für eine größere Fiori-App.
✅ **Apps, die viel dynamischen View-State haben** — z.B. Wizards, in denen die nächste Maske von vorherigen Eingaben abhängt.

❌ **Hochfrequente Read-only-Listen** mit komplexer OData-Filterung — da sind Fiori Elements besser.
❌ **Offline-Apps** — cap2UI5 ist server-driven, ein Roundtrip pro Interaktion.
❌ **Pixel-perfekte Custom-Designs** — der View Builder bildet UI5-Standard ab.

→ Weiter zu [**Warum cap2UI5?**](./why-cap2ui5) für die technische Begründung, oder gleich zum [**Quickstart**](./getting-started).
