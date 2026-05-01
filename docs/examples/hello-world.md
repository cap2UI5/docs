# Hello World

The simplest variation of a cap2UI5 app: an input field, a button, a confirmation box.

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

## What happens

| Phase | What runs |
|---|---|
| **Initial load** | Frontend POSTs an empty body. Server has no `S_FRONT.ID`, falls back to the startup app. User clicks the "Hello World" link. |
| **App start** | New `app_start=z2ui5_cl_app_hello_world` starts. `check_on_init() === true`, view is rendered. |
| **User types** | Two-way binding via `client._bind_edit(this.name)` — value flows into the XX delta. |
| **User clicks "Send"** | Frontend sends `S_FRONT.EVENT = "BUTTON_POST"` + XX delta with `name`. Server applies the delta to `this.name` and calls `main()`. |
| **`check_on_event("BUTTON_POST")`** | True → `message_box_display(...)` with the current name. |

## Launch

```
http://localhost:4004/rest/root/z2ui5?app_start=z2ui5_cl_app_hello_world
```

## What you can take away from this

- **One file = one app.** Class names match file names.
- **Two phases.** `check_on_init()` for the initial view, `check_on_event(...)` for events.
- **Reference-equality bindings.** `client._bind_edit(this.name)` finds the path `/XX/name` itself.
- **Pure JavaScript.** No manifest, no component, no OData layer.

→ Continue with [**Selection Screen**](./selection-screen) for a richer form with various control types.
