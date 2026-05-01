# Statisches XML View

Wenn du eine UI5-View bereits **als XML-Datei** hast — vom Designer exportiert, aus einer bestehenden App kopiert, oder weil dein Designer XML lieber liest als JS — kannst du sie 1:1 verwenden, ohne den View Builder zu nutzen.

## Code

```js
// srv/samples/read_view.js
const fs                = require("fs");
const path              = require("path");
const z2ui5_if_app      = require("../z2ui5/02/z2ui5_if_app");

class read_view extends z2ui5_if_app {

  async main(client) {
    const viewPath    = path.join(__dirname, "View1.view.xml");
    const viewContent = fs.readFileSync(viewPath, "utf8");
    client.view_display(viewContent);
  }
}

module.exports = read_view;
```

## `View1.view.xml`

Lege die Datei direkt neben deine App-Klasse (`srv/samples/View1.view.xml`):

```xml
<mvc:View
    controllerName="Quickstart.App"
    displayBlock="true"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns:l="sap.ui.layout"
    xmlns:core="sap.ui.core"
    xmlns:tnt="sap.tnt"
    xmlns="sap.m">
  <App id="app">
    <Page title="Create Enterprise-ready Web Apps with Ease">
      <l:BlockLayout background="Light">
        <l:BlockLayoutRow>
          <l:BlockLayoutCell>
            <core:Icon color="#1873B4" src="sap-icon://sap-ui5" size="5rem" class="sapUiSmallMarginBottom" width="100%"/>
            <Title level="H1" titleStyle="H1" text="This is UI5!" width="100%" textAlign="Center"/>
          </l:BlockLayoutCell>
        </l:BlockLayoutRow>
        <l:BlockLayoutRow>
          <l:BlockLayoutCell>
            <FlexBox items="{/features}" justifyContent="Center" wrap="Wrap">
              <tnt:InfoLabel text="{}" class="sapUiSmallMarginTop sapUiSmallMarginEnd"/>
            </FlexBox>
          </l:BlockLayoutCell>
        </l:BlockLayoutRow>
      </l:BlockLayout>
    </Page>
  </App>
</mvc:View>
```

## Wann macht das Sinn?

✅ **Migration einer bestehenden klassischen UI5-App.** Du willst sie von "drei-Schichten-OData-CRUD" auf cap2UI5 umstellen. Die XML-Views kannst du erstmal liegenlassen und nur die Controller-Logik in `main()` umziehen.
✅ **Wireframe-Designs aus dem WYSIWYG-Tool.** Wenn dein UX-Team mit dem [SAP Build](https://sap.com/products/build.html) oder einem ähnlichen Designer arbeitet, hast du XML-Output.
✅ **Komplexe statische Layouts**, bei denen der Builder umständlich wird (z.B. tief verschachtelte BlockLayouts mit vielen Custom-Klassen).

## Wann nicht?

❌ Wenn du **dynamische** UIs hast (Fields ein-/ausblenden je nach Zustand). Im JS-Builder ist das `if`/`switch`, in XML brauchst du `visible="{= ...}"`-Expressions oder Custom-Data.
❌ Wenn du dein **Form je User-Eingabe** umbauen musst. Der Builder lebt davon, dass du in `main()` einen Tree neu zusammenbaust.

## Bindings im statischen XML

Die XML-View darf alle Bindings nutzen, die der View Builder erzeugen würde:

```xml
<Input value="{/XX/username}" />
<Text  text="{/customer_count}" />
<Button text="Save" press=".eB([['SAVE','','','']])" />
```

Das ist allerdings spröde — die `.eB(...)`-Strings sind das interne Wire-Format, das der Builder normalerweise per `client._event(...)` für dich erzeugt. **Mein Tipp:** auch im Statisch-View-Fall die Event-Strings vom `client._event()` holen und per Modell-Bindings in die View injizieren, z.B. so:

```js
const eventSave = client._event("SAVE");
client.view_display(viewContent.replace("__EVENT_SAVE__", eventSave));
```

Damit bleibt das Wire-Format gekapselt und du bist bei Updates auf der sicheren Seite.

## Hybrid: View-Builder + statische XML-Snippets

Manchmal willst du nur **ein Stück** der View aus XML laden — z.B. einen statischen Footer. Dann gibt es im Builder die `xml_load(...)`-Methode (siehe `z2ui5_cl_xml_view.js`), die ein XML-Fragment in die laufende View einbettet.

→ Du hast jetzt alle Beispiele durch. Weiter zur [**API-Referenz**](../api/client) für die vollständigen Methodenlisten.
