---
layout: home

hero:
  name: "cap2UI5"
  text: "Server-driven UI5 for CAP"
  tagline: Build complete SAPUI5 apps directly from your CAP backend in JavaScript — no separate frontend project, no hand-crafted XML, no manifest tuning.
  image:
    src: /logo.jpeg
    alt: cap2UI5
  actions:
    - theme: brand
      text: Quickstart
      link: /guide/getting-started
    - theme: alt
      text: What is cap2UI5?
      link: /guide/what-is-cap2ui5
    - theme: alt
      text: GitHub
      link: https://github.com/cap2UI5/dev

features:
  - title: Pure JavaScript apps
    details: Define view, state and behavior in a single JS class. No tooling overhead, no UI5 build, no duplicated data modeling.
    icon: 🟨
  - title: Wire-format compatible with abap2UI5
    details: Uses the same static UI5 frontend as abap2UI5. A single roundtrip endpoint, the same protocol, the same custom control set.
    icon: 🔗
  - title: Automatic data binding
    details: client._bind_edit(this.field) finds the property by reference equality on the app instance. Two-way binding without model boilerplate.
    icon: 🔄
  - title: Native CAP integration
    details: The roundtrip runs as a CDS REST action. CAP services, OData connections, auth, destinations — everything remains available.
    icon: 🧩
  - title: Stateful sessions included
    details: Apps are persisted between roundtrips (CDS entity z2ui5_t_01). Navigation stack, draft history, and popup results out of the box.
    icon: 💾
  - title: Complete UI5 control set
    details: Page, Table, SimpleForm, Dialog, ChartJS, FileUploader, Geolocation, Camera — the builder can do anything UI5 ships.
    icon: 🎨
---

## In 30 seconds

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

This single file is the entire app. No `manifest.json`, no `Component.js`, no i18n file, no `.view.xml`. The CAP server renders the XML, and the frontend binds it to a JSONModel that builds itself dynamically.

::: tip For CAP developers
If you already write service handlers in `srv/*.js` today, you can add a UI5 surface in the same file. No tech-stack switch, no second repository, no tooling update.
:::
