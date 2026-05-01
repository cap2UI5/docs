# Hello World

Die einfachste Variante einer cap2UI5-App: Ein Eingabefeld, ein Button, eine Bestätigungs-Box.

## Code

```js
// srv/samples/z2ui5_cl_app_hello_world.js
const z2ui5_if_app      = require("../z2ui5/02/z2ui5_if_app");
const z2ui5_cl_xml_view = require("../z2ui5/02/z2ui5_cl_xml_view");

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

## Was passiert

| Phase | Was läuft ab |
|---|---|
| **Initial Load** | Frontend POSTet leerer Body. Server hat keine `S_FRONT.ID`, fällt auf den Startup-App zurück. User klickt "Hello World"-Link. |
| **App-Start** | Neuer `app_start=z2ui5_cl_app_hello_world` startet. `check_on_init() === true`, View wird gerendert. |
| **User tippt** | Two-way-Binding via `client._bind_edit(this.name)` — Wert wandert ins XX-Delta. |
| **User klickt "Send"** | Frontend schickt `S_FRONT.EVENT = "BUTTON_POST"` + XX-Delta mit `name`. Server appliziert Delta auf `this.name`, ruft `main()` auf. |
| **`check_on_event("BUTTON_POST")`** | Wahr → `message_box_display(...)` mit dem aktuellen Namen. |

## Aufrufen

```
http://localhost:4004/rest/root/z2ui5?app_start=z2ui5_cl_app_hello_world
```

## Was du daraus lernen kannst

- **Eine Datei = eine App.** Klassennamen passen zu Dateinamen.
- **Zwei Phasen.** `check_on_init()` für die initiale View, `check_on_event(...)` für Events.
- **Reference-Equality-Bindings**. `client._bind_edit(this.name)` findet den Pfad `/XX/name` selbst.
- **Pure JavaScript.** Kein Manifest, keine Component, kein OData-Layer.

→ Weiter mit [**Selection Screen**](./selection-screen) für eine reichere Form mit verschiedenen Control-Typen.
