# Hello World

The simplest variation of a cap2UI5 app: an input field, a button, a confirmation box.

## Code

This is `core/srv/z2ui5/01/04/z2ui5_cl_ui5_app_hi_world.js`, the app the framework ships and the one `?app_start=z2ui5_cl_ui5_app_hi_world` starts — quoted as it stands:

```js
const z2ui5_cl_ui5_view_builder = require("../../02/z2ui5_cl_ui5_view_builder");
const z2ui5_if_app = require("../../02/z2ui5_if_app");

class z2ui5_cl_ui5_app_hi_world extends z2ui5_if_app {
  name = ``;

  async main(client) {
    if (client.check_on_init()) {
      const view = z2ui5_cl_ui5_view_builder.factory()
        .ele({ n: `View`, ns: `mvc` })
        .a({ n: `xmlns`, v: `sap.m` })
        .a({ n: `xmlns:mvc`, v: `sap.ui.core.mvc` })
        .a({ n: `xmlns:core`, v: `sap.ui.core` })
        // SimpleForm and its content aggregation live in sap.ui.layout.form
        .a({ n: `xmlns:form`, v: `sap.ui.layout.form` });

      const form = view
        .ele({ n: `Shell` })
        .ele({ n: `Page` })
        .a({ n: `title`, v: `abap2UI5 - Hello World` })
        .ele({ n: `SimpleForm`, ns: `form` })
        .a({ n: `editable`, b: true })
        .ele({ n: `content`, ns: `form` });

      form
        .tag({ n: `Title`, ns: `core` })
        .a({ n: `text`, v: `Enter a value and send it to the server...` })
        .tag({ n: `Label` })
        .a({ n: `text`, v: `Name` })
        .tag({ n: `Input` })
        .a({ n: `value`, v: client._bind_edit(this.name) })
        .tag({ n: `Button` })
        .a({ n: `text`, v: `Send` })
        .a({ n: `press`, v: client._event(`BUTTON_POST`) });

      client.view_display(view.stringify());
    } else if (client.check_on_event(`BUTTON_POST`)) {
      client.message_box_display(`Your name is ${this.name}`);
    }
  }
}

module.exports = z2ui5_cl_ui5_app_hi_world;
```

::: tip The two import lines are the one thing you write differently
This file lives *inside* the core package, so it reaches its neighbours by relative path. Your own app sits outside the package and imports through its exports map:

```js
const z2ui5_cl_ui5_view_builder = require("abap2UI5/z2ui5_cl_ui5_view_builder");
const z2ui5_if_app = require("abap2UI5/z2ui5_if_app");
```

Everything below those two lines is identical.
:::

## The view it renders

```xml
<mvc:View xmlns="sap.m" xmlns:mvc="sap.ui.core.mvc" xmlns:core="sap.ui.core" xmlns:form="sap.ui.layout.form">
  <Shell>
    <Page title="abap2UI5 - Hello World">
      <form:SimpleForm editable="true">
        <form:content>
          <core:Title text="Enter a value and send it to the server..."/>
          <Label text="Name"/>
          <Input value="{/XX/NAME}"/>
          <Button text="Send" press="..."/>
        </form:content>
      </form:SimpleForm>
    </Page>
  </Shell>
</mvc:View>
```

Two details of the builder are visible here and are worth taking with you:

- **`.ele()` descends, `.tag()` stays.** `Shell`, `Page`, `SimpleForm` and `content` are containers, so they get `.ele()`. The four controls inside `content` are leaves added to the *same* parent, so they get `.tag()` — and `.a()` after a `.tag()` sets the attribute on that last child, not on `content`.
- **You name the namespace.** `SimpleForm`, its `content` aggregation and `Title` are not in `sap.m`. An unprefixed `<SimpleForm>` would resolve to `sap/m/SimpleForm.js` and the view would fail to *load*. → [Namespaces are yours to declare](../api/view-builder#namespaces)

## What happens

| Phase | What runs |
|---|---|
| **Initial load** | Frontend POSTs an empty body. Server has no `S_FRONT.ID`, falls back to the startup app. User clicks the "Hello World" link. |
| **App start** | New `app_start=z2ui5_cl_ui5_app_hi_world` starts. `check_on_init() === true`, view is rendered. |
| **User types** | Two-way binding via `client._bind_edit(this.name)` — value flows into the XX delta. |
| **User clicks "Send"** | Frontend sends `S_FRONT.EVENT = "BUTTON_POST"` + XX delta with `NAME`. Server applies the delta to `this.name` and calls `main()`. |
| **`check_on_event("BUTTON_POST")`** | True → `message_box_display(...)` with the current name. |

## Launch

```
http://localhost:4004/z2ui5/webapp/index.html?app_start=z2ui5_cl_ui5_app_hi_world
```

Or, without installing anything, in the [browser playground](../guide/playground):

```
https://cap2ui5.github.io/web-cap2UI5-build/?app_start=z2ui5_cl_ui5_app_hi_world
```

## What you can take away from this

- **One file = one app.** Class names match file names.
- **Two phases.** `check_on_init()` for the initial view, `check_on_event(...)` for events.
- **Reference-equality bindings.** `client._bind_edit(this.name)` finds the path `/XX/NAME` itself.
- **Pure JavaScript.** No manifest, no component, no OData layer.

→ Continue with [**Selection Screen**](./selection-screen) for a richer form with various control types.
