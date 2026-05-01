# cap2UI5 vs. abap2UI5

cap2UI5 ist eine **JavaScript-Portierung** des [abap2UI5](https://github.com/abap2UI5/abap2UI5)-Frameworks. Wenn du eines kennst, kennst du das andere zu 90%. Diese Seite zeigt die Gemeinsamkeiten, die kleinen Unterschiede und warum es überhaupt eine zweite Implementierung gibt.

## Gemeinsamkeiten

- **Identisches Frontend-Bundle.** cap2UI5 zieht das `app/webapp/`-Verzeichnis aus dem abap2UI5-Repo per CI ein. Das heißt: dasselbe UI5-Bundle, dieselben Custom-Controls, derselbe `Actions.js`-Handler, dasselbe Index-HTML-Boot-Pattern.
- **Identisches Wire-Protokoll.** `POST /rest/root/z2ui5` mit `{ S_FRONT, XX, MODEL }` — Frontend kann nicht unterscheiden, ob ABAP oder Node.js antwortet.
- **Identische Entwickler-API.** Klassennamen, Methoden, Pattern (`check_on_init`, `_bind_edit`, `_event`, `nav_app_call`) sind 1:1.
- **Identisches Custom-Control-Set.** `geolocation`, `chartjs`, `file_uploader`, … alle laufen im Frontend identisch — der Server muss nur das XML korrekt rendern.

## Unterschiede

### Sprache & Typsystem

| | abap2UI5 | cap2UI5 |
|---|---|---|
| Sprache | ABAP OO | JavaScript |
| Typen   | statisch, mit Interface-Verträgen | dynamisch, JSDoc + duck typing |
| Klassen-Lookup | RTTI über CCDIR | RTTI über file-system + `require` |
| Persistenz | DB-Tabelle Z2UI5_T_01 in HANA | CDS-Entity `z2ui5_t_01` (CAP-DB) |

### Backend-Hosting

| | abap2UI5 | cap2UI5 |
|---|---|---|
| Server | SAP NetWeaver / S/4 / RAP / BTP-ABAP | Node.js / CAP / Cloud Foundry |
| Endpoint | ICF-Service (z.B. `/sap/bc/z2ui5`) | CDS-REST-Action (`/rest/root/z2ui5`) |
| Auth | SAP-User, X.509, OAuth über SICF | XSUAA, IAS, Mock-Auth |
| Externe Calls | `cl_http_client`, RFC, Service-Consumer | `cds.connect.to`, `fetch`, `axios` |
| Datenzugriff | OpenSQL, AMDP | CDS-Queries (`SELECT.from(...)`), HANA-CCL |

### Build & Deployment

| | abap2UI5 | cap2UI5 |
|---|---|---|
| Build | abapGit-Pull, Transport | `npm install`, `cds build` |
| Deploy | STMS / abapGit / GCTS | `cf deploy mta_archives/...` |
| Sticky-Sessions | ABAP-Session-Stickiness | Cloud-Foundry `RouteServiceUrl` |
| HOT-Reload-DEV | inkrementelle Aktivierung | `npx cds w` |

### Tooling

abap2UI5-Apps schreibt man im SAP GUI / ADT. cap2UI5-Apps schreibt man in **VS Code, JetBrains, Cursor** — mit allen modernen JS-Tools (ESLint, Prettier, Jest, Debugger, Source Maps).

## Welche soll ich wählen?

Das hängt **nicht** davon ab, welches Framework "besser" ist — beide sind 1:1-Äquivalente. Es hängt davon ab, **welcher Server-Stack zu deinem Projekt passt**:

- Du hast ein **bestehendes ABAP-System** und willst keine zweite Plattform → **abap2UI5**.
- Du baust eine **neue Cloud-Anwendung** auf BTP / Cloud Foundry / Kyma → **cap2UI5**.
- Du brauchst **CAP-Features** (Multi-Tenancy, OData v4 out-of-box, JS-Toolchain, async event mesh) → **cap2UI5**.
- Du arbeitest in einer **Mixed-Landscape** und willst eine UI-Komponente, die in beiden Welten gleich aussieht → kannst du _exakt dieselbe_ App in beiden Frameworks deployen, da die Wire kompatibel ist.

## Code-Vergleich

ABAP-Version (`z2ui5_cl_app_hello_world.clas.abap`):

```abap
CLASS z2ui5_cl_app_hello_world DEFINITION PUBLIC.
  PUBLIC SECTION.
    INTERFACES z2ui5_if_app.
    DATA name TYPE string.
ENDCLASS.

CLASS z2ui5_cl_app_hello_world IMPLEMENTATION.
  METHOD z2ui5_if_app~main.
    IF client->check_on_init( ).
      DATA(view) = z2ui5_cl_xml_view=>factory( ).
      view->shell( )->page( title = 'Hello World'
        )->simple_form( editable = abap_true
        )->content(
        )->title( text = 'Make an input here and send it to the server...'
        )->label( text = 'Name'
        )->input(  value = client->_bind_edit( name )
        )->button( text = 'Send'
                   press = client->_event( 'BUTTON_POST' ) ).
      client->view_display( view->stringify( ) ).
    ELSEIF client->check_on_event( 'BUTTON_POST' ).
      client->message_box_display( |Your name is { name }| ).
    ENDIF.
  ENDMETHOD.
ENDCLASS.
```

JS-Version (cap2UI5):

```js
class z2ui5_cl_app_hello_world extends z2ui5_if_app {

  name = "";

  async main(client) {
    if (client.check_on_init()) {
      const view = z2ui5_cl_xml_view.factory()
        .Shell()
        .Page({ title: "Hello World" })
        .SimpleForm({ editable: true })
          .content()
          .Title({ text: "Make an input here and send it to the server..." })
          .Label({ text: "Name" })
          .Input({ value: client._bind_edit(this.name) })
          .Button({ text: "Send", press: client._event("BUTTON_POST") });
      client.view_display(view.stringify());

    } else if (client.check_on_event("BUTTON_POST")) {
      client.message_box_display(`Your name is ${this.name}`);
    }
  }
}
```

Die Struktur ist **identisch**. Nur die Sprach-Idiome unterscheiden sich.

## Migration ABAP → CAP

Da Wire-Format und API kompatibel sind, ist eine Migration einer existierenden abap2UI5-App nach cap2UI5 mechanisch:

1. ABAP-Klasse in JS-Klasse umschreiben (Mapping ist 1:1)
2. Datenzugriffe von OpenSQL auf CDS-Queries umstellen
3. Externe Calls von `cl_http_client` auf `fetch`/`cds.connect.to` umstellen
4. Im JS-Projekt `require` einbauen, in `srv/samples/` ablegen
5. Aufrufen — fertig.

Das gleiche statische Frontend rendert beide ohne Änderung.

→ Schau dir die [**Beispiele**](../examples/hello-world) an oder gehe direkt zur [**API-Referenz**](../api/client).
