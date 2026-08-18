# cap2UI5 vs. abap2UI5

cap2UI5 is a **JavaScript port** of the [abap2UI5](https://github.com/abap2UI5/abap2UI5) framework. If you know one, you know the other 90%. This page shows the commonalities, the differences, and why a second implementation exists in the first place. (New to abap2UI5 entirely? Start with [Where cap2UI5 comes from](./where-it-comes-from).)

## Commonalities

- **Identical frontend bundle.** cap2UI5 pulls the `app/webapp/` directory from the abap2UI5 repo via the automated [sync pipeline](./where-it-comes-from#how-the-port-actually-works). That means: same UI5 bundle, same custom controls, same `app/z2ui5/webapp/core/actions/` handlers, same index HTML boot pattern.
- **Identical wire protocol.** `POST /rest/root/z2ui5` with `{ S_FRONT, XX, MODEL }` — the frontend cannot tell whether ABAP or Node.js is responding.
- **The same API, method for method.** Class names, methods and patterns (`check_on_init`, `_event`, `nav_app_call`, the view builder chain) carry over one to one; an ABAP method call and its JS counterpart differ only in language idiom.
- **Identical custom control set.** `geolocation`, `chartjs`, `file_uploader`, … all run identically on the frontend — the server only has to render the XML correctly.

::: warning Same shape — but not the same release, and not the same class set
Two qualifications on "identical", both worth knowing before you copy an upstream sample.

**cap2UI5 carries one pinned framework release, and it is 1.142.0.** The number is in the shipped code: `static version` on `z2ui5_if_app` (`core/srv/z2ui5/02/z2ui5_if_app.js`). Upstream has moved on, and one of the moves changes what an example means:

- **Here, on 1.142.0**, `_bind()` and `_bind_edit()` are two different bindings — one-way and two-way. Every example on this site uses them that way, because that is what the shipped `z2ui5_cl_ui5_srv_bind` does.
- **Upstream, from 1.143.0 on**, the split is gone: `_bind_edit()` is an alias of `_bind()`, and `custom_mapper_back` / `custom_filter_back` are still accepted but no longer evaluated. See abap2UI5's [deprecations page](https://abap2ui5.github.io/docs/resources/deprecations.html).

**cap2UI5 does not ship upstream's frozen legacy package at all.** abap2UI5 keeps its `src/99` for one reason — abapGit installs a repository, not a folder, so deleting those objects would break existing installations. An npm package has no such installed base, so since 2026-08 nothing from `src/99` enters the port. Concretely, these exist upstream and do **not** exist here:

| upstream (frozen, still shipped) | cap2UI5 |
|---|---|
| `z2ui5_cl_xml_view`, `z2ui5_cl_xml_view_cc` | not carried — the only builder is `z2ui5_cl_ui5_view_builder` |
| the built-in popups `z2ui5_cl_pop_*` | not carried — upstream's own successor is the separate [popups add-on](https://github.com/abap2UI5-addons/popups) |
| the retired `z2ui5_cl_util*` of `99/01` | not carried (the `z2ui5_cl_util` here is the transpiler runtime, an unrelated class of the same name) |

So an old abap2UI5 sample that still compiles upstream can fail here on the import alone — and that is deliberate, not a gap waiting to be filled.
:::

## Differences

### Language & type system

| | abap2UI5 | cap2UI5 |
|---|---|---|
| Language | ABAP OO | JavaScript |
| Types   | static, with interface contracts | dynamic, JSDoc + duck typing |
| Class lookup | RTTI via CCDIR | RTTI via file system + `require` |
| Persistence | DB table Z2UI5_T_01 in HANA | CDS entity `z2ui5_t_01` (CAP DB) |

### Backend hosting

| | abap2UI5 | cap2UI5 |
|---|---|---|
| Server | SAP NetWeaver / S/4 / RAP / BTP-ABAP | Node.js / CAP / Cloud Foundry |
| Endpoint | ICF service (e.g. `/sap/bc/z2ui5`) | CDS REST action (`/rest/root/z2ui5`) |
| Auth | SAP user, X.509, OAuth via SICF | XSUAA, IAS, mock auth |
| External calls | `cl_http_client`, RFC, service consumer | `cds.connect.to`, `fetch`, `axios` |
| Data access | OpenSQL, AMDP | CDS queries (`SELECT.from(...)`), HANA CCL |

### Build & deployment

| | abap2UI5 | cap2UI5 |
|---|---|---|
| Build | abapGit pull, transport | `npm install`, `cds build` |
| Deploy | STMS / abapGit / GCTS | `cf deploy mta_archives/...` |
| Sticky sessions | ABAP session stickiness | Cloud Foundry `RouteServiceUrl` |
| Hot-reload dev | incremental activation | `npx cds w` |

### Tooling

abap2UI5 apps are written in SAP GUI / ADT. cap2UI5 apps are written in **VS Code, JetBrains, Cursor** — with all modern JS tooling (ESLint, Prettier, Jest, debugger, source maps).

## Which should I choose?

That **doesn't** depend on which framework is "better" — they solve the same problem the same way. It depends on **which server stack fits your project**:

- You have an **existing ABAP system** and don't want a second platform → **abap2UI5**.
- You're building a **new cloud application** on BTP / Cloud Foundry / Kyma → **cap2UI5**.
- You need **CAP features** (multi-tenancy, OData v4 out of the box, JS toolchain, async event mesh) → **cap2UI5**.
- You work in a **mixed landscape** and want a UI component that looks the same in both worlds → you can deploy _exactly the same_ app in both frameworks, since the wire is compatible.

## Code comparison

ABAP version — the same app on current abap2UI5, built with `z2ui5_cl_ui5_view_builder`:

```abap
CLASS z2ui5_cl_ui5_app_hi_world DEFINITION PUBLIC.
  PUBLIC SECTION.
    INTERFACES z2ui5_if_app.
    DATA name TYPE string.
ENDCLASS.

CLASS z2ui5_cl_ui5_app_hi_world IMPLEMENTATION.
  METHOD z2ui5_if_app~main.
    IF client->check_on_init( ).
      DATA(view) = z2ui5_cl_ui5_view_builder=>factory( ).
      view->ele( n = `View` ns = `mvc`
        )->a( n = `xmlns`     v = `sap.m`
        )->a( n = `xmlns:mvc` v = `sap.ui.core.mvc` ).

      DATA(page) = view->ele( `Shell`
        )->ele( `Page` )->a( n = `title` v = `Hello World` ).

      page->tag( `Input`  )->a( n = `value` v = client->_bind( name )
        )->tag( `Button` )->a( n = `text`  v = `Send`
        )->a( n = `press` v = client->_event( `BUTTON_POST` ) ).

      client->view_display( view->stringify( ) ).
    ELSEIF client->check_on_event( `BUTTON_POST` ).
      client->message_box_display( |Your name is { name }| ).
    ENDIF.
  ENDMETHOD.
ENDCLASS.
```

JS version (cap2UI5):

```js
class z2ui5_cl_ui5_app_hi_world extends z2ui5_if_app {

  name = "";

  async main(client) {
    if (client.check_on_init()) {
      const view = z2ui5_cl_ui5_view_builder.factory()
        .ele({ n: `View`, ns: `mvc` })
        .a({ n: `xmlns`,     v: `sap.m` })
        .a({ n: `xmlns:mvc`, v: `sap.ui.core.mvc` });

      const page = view.ele(`Shell`).ele(`Page`).a({ n: `title`, v: `Hello World` });

      page.tag(`Input`).a({ n: `value`, v: client._bind_edit(this.name) })
        .tag(`Button`)
        .a({ n: `text`,  v: `Send` })
        .a({ n: `press`, v: client._event(`BUTTON_POST`) });

      client.view_display(view.stringify());

    } else if (client.check_on_event("BUTTON_POST")) {
      client.message_box_display(`Your name is ${this.name}`);
    }
  }
}
```

The structure is the same, method for method. The two places the languages part company are visible above: ABAP names its arguments (`n = … v = …`) where JavaScript passes one object, and the binding call differs — `_bind` upstream, `_bind_edit` here, because on the pinned 1.142.0 that is still the two-way one. Everything else maps line by line, which is exactly what makes machine transpilation of the samples possible.

## How the two stay in sync

cap2UI5 is not a one-time fork. The [builder-abap2UI5-js repository](https://github.com/cap2UI5/builder-abap2UI5-js) runs automated pipelines that mirror abap2UI5 and **transpile the ABAP sources to JavaScript** with *abap2js* (built on the [@abaplint](https://github.com/abaplint/abaplint) parser):

- the **frontend** is taken over 1:1 (only the bootstrap URL and the backend endpoint are patched),
- the **sample apps** are fully machine-transpiled — that's why `core/srv/app/samples/` contains over a hundred `z2ui5_cl_smp_app_*` classes,
- the **framework core** under `core/srv/z2ui5/` is generated from a hand-maintained adaptation (the builder's `src/`); transpiled classes are only ever *added*, never overwrite the curated files.

[builder-cap2UI5](https://github.com/cap2UI5/builder-cap2UI5) then assembles the finished CAP app from the published core and publishes it into the [cap2UI5 repository](https://github.com/cap2UI5/cap2UI5).

A jest suite gates every sync — only a green build is committed.

## Migration ABAP → CAP

Because the wire format and API are compatible, migrating an existing abap2UI5 app to cap2UI5 is mechanical:

1. Rewrite the ABAP class as a JS class — method for method, with the two caveats above: a view built on the retired `z2ui5_cl_xml_view` has to be rebuilt on `z2ui5_cl_ui5_view_builder`, and two-way binding is `_bind_edit` on the release cap2UI5 pins. Or let the transpiler do a first pass: `npm run transpile -- path/to/z2ui5_cl_my_app.clas.abap --stdout` in a [builder-abap2UI5-js](https://github.com/cap2UI5/builder-abap2UI5-js) checkout emits JavaScript, marking unsupported statements as `// TODO(abap2js)` comments instead of dropping them
2. Convert data access from OpenSQL to CDS queries
3. Convert external calls from `cl_http_client` to `fetch`/`cds.connect.to`
4. Drop the file into `srv/app/` (or a [registered app folder](./project-structure#srv-app))
5. Run it — done.

The same static frontend renders both without changes.

→ Have a look at the [**examples**](../examples/hello-world) or jump straight to the [**API reference**](../api/client).
