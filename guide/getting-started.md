# Quickstart

Diese Seite bringt dich von "leeres Verzeichnis" zu "klickbare cap2UI5-App" in unter fünf Minuten.

## Voraussetzungen

- **Node.js ≥ 20** (cap2UI5 setzt auf `@sap/cds ^9` und `express ^5`)
- **`@sap/cds-dk`** global installiert: `npm i -g @sap/cds-dk`

## 1. Projekt klonen

Der einfachste Weg ist, das Referenz-Projekt aus dem dev-Repo zu klonen:

```bash
git clone https://github.com/cap2UI5/dev.git my-cap2ui5-app
cd my-cap2ui5-app/cap2UI5
npm install
```

Das `cap2UI5/`-Unterverzeichnis ist ein vollständiges, eigenständiges CAP-Projekt:

```
cap2UI5/
├── srv/
│   ├── cat-service.cds         # Service-Definitionen inkl. z2ui5-Action
│   ├── cat-service.js          # Service-Handler-Bindings
│   ├── server.js               # CAP-Bootstrap mit z2ui5-HTML-Endpoint
│   ├── samples/                # Beispiel-Apps
│   └── z2ui5/                  # Framework-Code (nicht anfassen)
├── db/
│   └── schema.cds              # CDS-Entity z2ui5_t_01 für Persistenz
├── app/
│   └── z2ui5/                  # Statisches Frontend-Bundle
└── package.json
```

## 2. Starten

```bash
npx cds w
# oder: npm start
```

Browser öffnen unter [http://localhost:4004/rest/root/z2ui5](http://localhost:4004/rest/root/z2ui5).

Du siehst den **Startup-Screen** (`z2ui5_cl_app_startup`) mit einem Eingabefeld für den App-Namen. Standardmäßig steht `z2ui5_cl_app_hello_world` darin — klick **Check** → **Link to the Application** → fertig.

## 3. Die erste eigene App

Lege im Ordner `srv/samples/` (oder einem beliebigen anderen, der vom `_findAppFile`-Lookup gefunden wird — siehe [Persistenz](./persistence)) eine neue Datei `my_first_app.js` an:

```js
// srv/samples/my_first_app.js
const z2ui5_if_app      = require("../z2ui5/02/z2ui5_if_app");
const z2ui5_cl_xml_view = require("../z2ui5/02/z2ui5_cl_xml_view");

class my_first_app extends z2ui5_if_app {

  who   = "World";
  count = 0;

  async main(client) {

    if (client.check_on_init()) {
      this.render(client);
      return;
    }

    if (client.check_on_event("CLICK")) {
      this.count++;
      client.message_toast_display(`Hi, ${this.who}! You clicked ${this.count}x.`);
      this.render(client);
    }
  }

  render(client) {
    const view = z2ui5_cl_xml_view.factory()
      .Shell()
      .Page({ title: "My first cap2UI5 app" })
      .SimpleForm({ editable: true })
        .content()
        .Label({ text: "Your name" })
        .Input({ value: client._bind_edit(this.who) })
        .Label({ text: "Clicks" })
        .Text({ text: client._bind(this.count) })
        .Button({
          text:  "Click me",
          press: client._event("CLICK"),
          type:  "Emphasized"
        });

    client.view_display(view.stringify());
  }
}

module.exports = my_first_app;
```

## 4. Aufrufen

Im Startup-Screen `my_first_app` eintragen → **Check** → **Link to the Application**.

Oder direkt per Deeplink: [http://localhost:4004/rest/root/z2ui5?app_start=my_first_app](http://localhost:4004/rest/root/z2ui5?app_start=my_first_app).

## Was du gerade gebaut hast

Mit ~25 Zeilen JS hast du eine **stateful UI5-App** gebaut, die:

- Two-way-bindet `who` an ein Input-Feld (du tippst, der Server bekommt's)
- Persistiert `count` über Roundtrips hinweg (Klick-Zähler überlebt sogar einen Browser-Refresh — der Server speichert die App-Instanz in `z2ui5_t_01`)
- Keine Migration, keine OData-Service-Definition, kein Manifest-Eintrag, keine Controller-Klasse

## Nächste Schritte

- [**Projektstruktur**](./project-structure) — was wo lebt
- [**App-Lifecycle**](./lifecycle) — `check_on_init`, `check_on_event`, `check_on_navigated`
- [**View Builder**](./views) — was du alles rendern kannst
- [**Data Binding**](./data-binding) — `_bind` vs. `_bind_edit`, das Reference-Equality-Pattern
- [**Beispiele**](../examples/hello-world) — von Hello World bis Selection Screen
