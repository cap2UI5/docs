# Quickstart

This page takes you from "empty directory" to "clickable cap2UI5 app" in under five minutes.

## Prerequisites

- **Node.js ≥ 20** (cap2UI5 builds on `@sap/cds ^9` and `express ^5`)
- **`@sap/cds-dk`** installed globally: `npm i -g @sap/cds-dk`

## 1. Clone the project

The easiest path is to clone the reference project from the dev repo:

```bash
git clone https://github.com/cap2UI5/dev.git my-cap2ui5-app
cd my-cap2ui5-app/cap2UI5
npm install
```

The `cap2UI5/` subdirectory is a complete, self-contained CAP project:

```
cap2UI5/
├── srv/
│   ├── cat-service.cds         # service definitions incl. z2ui5 action
│   ├── cat-service.js          # service handler bindings
│   ├── server.js               # CAP bootstrap with z2ui5 HTML endpoint
│   ├── samples/                # example apps
│   └── z2ui5/                  # framework code (don't touch)
├── db/
│   └── schema.cds              # CDS entity z2ui5_t_01 for persistence
├── app/
│   └── z2ui5/                  # static frontend bundle
└── package.json
```

## 2. Start

```bash
npx cds w
# or: npm start
```

Open the browser at [http://localhost:4004/rest/root/z2ui5](http://localhost:4004/rest/root/z2ui5).

You'll see the **startup screen** (`z2ui5_cl_app_startup`) with an input field for the app name. By default it shows `z2ui5_cl_app_hello_world` — click **Check** → **Link to the Application** → done.

## 3. Your first own app

Inside the folder `srv/samples/` (or any other folder that the `_findAppFile` lookup finds — see [Persistence](./persistence)) create a new file `my_first_app.js`:

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

## 4. Launch it

In the startup screen enter `my_first_app` → **Check** → **Link to the Application**.

Or directly via deep link: [http://localhost:4004/rest/root/z2ui5?app_start=my_first_app](http://localhost:4004/rest/root/z2ui5?app_start=my_first_app).

## What you just built

In about 25 lines of JS you built a **stateful UI5 app** that:

- Two-way-binds `who` to an input field (you type, the server receives it)
- Persists `count` across roundtrips (the click counter even survives a browser refresh — the server stores the app instance in `z2ui5_t_01`)
- No migration, no OData service definition, no manifest entry, no controller class

## Next steps

- [**Project Structure**](./project-structure) — what lives where
- [**App Lifecycle**](./lifecycle) — `check_on_init`, `check_on_event`, `check_on_navigated`
- [**View Builder**](./views) — everything you can render
- [**Data Binding**](./data-binding) — `_bind` vs. `_bind_edit`, the reference-equality pattern
- [**Examples**](../examples/hello-world) — from Hello World to Selection Screen
