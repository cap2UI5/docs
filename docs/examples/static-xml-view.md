# Static XML View

If you already have a UI5 view **as an XML file** — exported from a designer, copied from an existing app, or because your designer prefers reading XML over JS — you can use it 1:1 without going through the view builder.

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

Place the file right next to your app class (`srv/samples/View1.view.xml`):

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

## When does this make sense?

✅ **Migrating an existing classical UI5 app.** You want to switch it from "three-layer OData CRUD" to cap2UI5. You can leave the XML views in place for now and only move the controller logic into `main()`.
✅ **Wireframe designs from a WYSIWYG tool.** If your UX team works with [SAP Build](https://sap.com/products/build.html) or a similar designer, you'll have XML output.
✅ **Complex static layouts** where the builder gets cumbersome (e.g. deeply nested BlockLayouts with many custom classes).

## When not?

❌ When you have **dynamic** UIs (showing/hiding fields based on state). In the JS builder that's `if`/`switch`; in XML you need `visible="{= ...}"` expressions or custom data.
❌ When you have to **rebuild your form per user input**. The builder thrives on the fact that you reassemble a tree in `main()`.

## Bindings in static XML

The XML view may use any bindings the view builder would generate:

```xml
<Input value="{/XX/username}" />
<Text  text="{/customer_count}" />
<Button text="Save" press=".eB([['SAVE','','','']])" />
```

That is brittle, however — the `.eB(...)` strings are the internal wire format that the builder normally generates for you via `client._event(...)`. **My tip:** even in the static-view case, fetch the event strings from `client._event()` and inject them into the view via model bindings, e.g. like this:

```js
const eventSave = client._event("SAVE");
client.view_display(viewContent.replace("__EVENT_SAVE__", eventSave));
```

This keeps the wire format encapsulated and you stay safe across updates.

## Hybrid: view builder + static XML snippets

Sometimes you only want to load **a piece** of the view from XML — e.g. a static footer. The builder has the `xml_load(...)` method (see `z2ui5_cl_xml_view.js`) which embeds an XML fragment into the running view.

→ You're now through all the examples. Continue to the [**API reference**](../api/client) for full method listings.
