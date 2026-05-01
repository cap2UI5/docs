---
layout: home

hero:
  name: "cap2UI5"
  text: "Server-driven UI5 für CAP"
  tagline: Baue komplette SAPUI5-Apps direkt aus deinem CAP-Backend in JavaScript — kein eigenes Frontend-Projekt, kein XML von Hand, kein Manifest-Tuning.
  actions:
    - theme: brand
      text: Quickstart
      link: /guide/getting-started
    - theme: alt
      text: Was ist cap2UI5?
      link: /guide/what-is-cap2ui5
    - theme: alt
      text: GitHub
      link: https://github.com/cap2UI5/dev

features:
  - title: Pure JavaScript-Apps
    details: Definiere View, State und Verhalten in einer einzigen JS-Klasse. Kein Tooling-Overhead, kein UI5-Build, keine doppelte Datenmodellierung.
    icon: 🟨
  - title: Wire-Format-kompatibel zu abap2UI5
    details: Nutzt das gleiche statische UI5-Frontend wie abap2UI5. Ein einziger Roundtrip-Endpoint, das gleiche Protokoll, das gleiche Custom-Control-Set.
    icon: 🔗
  - title: Automatisches Data Binding
    details: client._bind_edit(this.field) findet das Property per Reference-Equality auf der App-Instanz. Two-Way-Binding ohne Modell-Boilerplate.
    icon: 🔄
  - title: Native CAP-Integration
    details: Roundtrip läuft als CDS-REST-Action. CAP-Services, OData-Connections, Auth, Destinations — alles steht weiterhin bereit.
    icon: 🧩
  - title: Stateful-Sessions inklusive
    details: Apps werden zwischen Roundtrips persistiert (CDS-Entity z2ui5_t_01). Navigation-Stack, Draft-Verlauf und Popup-Results out-of-the-box.
    icon: 💾
  - title: Komplettes UI5-Control-Set
    details: Page, Table, SimpleForm, Dialog, ChartJS, FileUploader, Geolocation, Camera — der Builder kann alles, was UI5 ausliefert.
    icon: 🎨
---

## In 30 Sekunden

```js
const z2ui5_if_app      = require("./z2ui5/02/z2ui5_if_app");
const z2ui5_cl_xml_view = require("./z2ui5/02/z2ui5_cl_xml_view");

class z2ui5_cl_app_hello_world extends z2ui5_if_app {

  name = "";

  async main(client) {
    if (client.check_on_init()) {
      const view = z2ui5_cl_xml_view.factory()
        .Shell()
        .Page({ title: "abap2UI5 - Hello World" })
        .SimpleForm({ editable: true })
        .content()
          .Title({ text: "Make an input here and send it to the server..." })
          .Label({ text: "Name" })
          .Input({  value: client._bind_edit(this.name) })
          .Button({ text: "Send", press: client._event("BUTTON_POST") });
      client.view_display(view.stringify());

    } else if (client.check_on_event("BUTTON_POST")) {
      client.message_box_display(`Your name is ${this.name}`);
    }
  }
}

module.exports = z2ui5_cl_app_hello_world;
```

Diese eine Datei ist die komplette App. Kein `manifest.json`, kein `Component.js`, kein i18n-File, keine `.view.xml`. Der CAP-Server rendert das XML, das Frontend bindet es an einen frei sich aufbauenden JSONModel.

::: tip Für CAP-Entwickler
Wenn du heute schon in `srv/*.js` Service-Handler schreibst, kannst du in derselben Datei eine UI5-Oberfläche dazustellen. Kein Wechsel des Tech-Stacks, kein zweites Repository, kein Tooling-Update.
:::
