# Quickstart

This page takes you from "empty directory" to "clickable cap2UI5 app" in under five minutes.

::: tip No installation at all?
If you just want to *see* cap2UI5 first, open the [**browser playground**](./playground) — the whole stack, including all sample apps, runs on GitHub Pages.
:::

## Prerequisites

- **Node.js ≥ 22** (the app declares it in `engines` and `.nvmrc`)
- Internet access (the frontend loads SAPUI5 from the SAP CDN)

That's it. No database setup (CAP starts an in-memory SQLite automatically), no global CLI installs (`@sap/cds-dk` is a dev dependency of the project).

## 1. Clone the project

Clone the reference project — the repo root **is** the CAP application:

```bash
git clone https://github.com/cap2UI5/cap2UI5.git
cd cap2UI5
npm install
```

The repository is a complete, self-contained CAP project:

```
cap2UI5/
├── srv/
│   ├── z2ui5-service.cds       # service definitions incl. the z2ui5 action
│   ├── z2ui5-service.js        # service handler bindings
│   ├── server.js               # CAP bootstrap (HTML + CSRF endpoints)
│   └── app/                    # your own apps go here
├── db/
│   └── schema.cds              # CDS entity z2ui5_t_01 for persistence
├── app/
│   └── z2ui5/                  # static UI5 frontend (don't touch)
├── core/                       # vendored framework package (don't touch)
│   └── srv/app/samples/        # ~105 demo apps (from abap2UI5/samples)
└── package.json                # "abap2UI5": "file:./core"
```

## 2. Start

```bash
npx cds watch
# or: start and open the app in the browser right away
npm run watch-z2ui5
```

The server listens on [http://localhost:4004](http://localhost:4004):

| URL | What you get |
|---|---|
| [`/z2ui5/webapp/index.html`](http://localhost:4004/z2ui5/webapp/index.html) | the app — without a parameter, the startup launcher is shown |
| [`/z2ui5/webapp/index.html?app_start=z2ui5_cl_ui5_app_hi_world`](http://localhost:4004/z2ui5/webapp/index.html?app_start=z2ui5_cl_ui5_app_hi_world) | start a specific app class directly — works for every sample, e.g. `z2ui5_cl_smp_app_000` |
| `/rest/root/z2ui5` | the roundtrip endpoint the frontend talks to |

Click around the demo apps first — everything you see in `core/srv/app/samples/` can be started via `?app_start=<class_name>`.

## 3. Your first own app

Create a new file `my_first_app.js` in `srv/app/`:

```js
// srv/app/my_first_app.js
const z2ui5_if_app      = require("abap2UI5/z2ui5_if_app");
const z2ui5_cl_xml_view = require("abap2UI5/z2ui5_cl_xml_view");

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

Two things worth noting:

- The imports use the vendored core package's exports (`require("abap2UI5/...")`, resolved via the `"abap2UI5": "file:./core"` dependency) — no fragile relative paths. All bundled samples use the same style.
- **File name = class name.** That convention is how the framework finds your class (see [Persistence](./persistence)).

## 4. Launch it

Open [http://localhost:4004/z2ui5/webapp/index.html?app_start=my_first_app](http://localhost:4004/z2ui5/webapp/index.html?app_start=my_first_app) — done. (`cds watch` picks the new file up automatically.)

## What you just built

In about 25 lines of JS you built a **stateful UI5 app** that:

- Two-way-binds `who` to an input field (you type, the server receives it)
- Persists `count` across roundtrips — the click counter even survives a browser refresh, because the server stores the app instance in the database
- Needed no OData service, no manifest, no controller, no frontend build

## Where do my apps live long-term?

`srv/app/` is user-owned and scanned automatically — unlike `core/srv/app/samples/`, where the sync pipeline maintains the transpiled abap2UI5 demos (overwritten on every sync). Beyond `srv/app/` you can keep apps in **any folder** and register it:

```js
// srv/server.js (or any file loaded at startup)
require("abap2UI5/register-apps")(__dirname + "/my-apps");
```

or via environment variable, without touching code:

```bash
Z2UI5_APP_DIRS=/abs/path/to/my-apps npx cds watch
```

Registered directories are searched recursively; the file-name-equals-class-name convention still applies.

## Next steps

- [**Project Structure**](./project-structure) — what lives where
- [**App Lifecycle**](./lifecycle) — `check_on_init`, `check_on_event`, `check_on_navigated`
- [**View Builder**](./views) — everything you can render
- [**Data Binding**](./data-binding) — `_bind` vs. `_bind_edit`, the reference-equality pattern
- [**Examples**](../examples/hello-world) — from Hello World to Selection Screen
