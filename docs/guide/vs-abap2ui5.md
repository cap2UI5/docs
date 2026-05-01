# cap2UI5 vs. abap2UI5

cap2UI5 is a **JavaScript port** of the [abap2UI5](https://github.com/abap2UI5/abap2UI5) framework. If you know one, you know the other 90%. This page shows the commonalities, the small differences, and why a second implementation exists in the first place.

## Commonalities

- **Identical frontend bundle.** cap2UI5 pulls the `app/webapp/` directory from the abap2UI5 repo via CI. That means: same UI5 bundle, same custom controls, same `Actions.js` handler, same index HTML boot pattern.
- **Identical wire protocol.** `POST /rest/root/z2ui5` with `{ S_FRONT, XX, MODEL }` — the frontend cannot tell whether ABAP or Node.js is responding.
- **Identical developer API.** Class names, methods, patterns (`check_on_init`, `_bind_edit`, `_event`, `nav_app_call`) are 1:1.
- **Identical custom control set.** `geolocation`, `chartjs`, `file_uploader`, … all run identically on the frontend — the server only has to render the XML correctly.

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

That **doesn't** depend on which framework is "better" — both are 1:1 equivalents. It depends on **which server stack fits your project**:

- You have an **existing ABAP system** and don't want a second platform → **abap2UI5**.
- You're building a **new cloud application** on BTP / Cloud Foundry / Kyma → **cap2UI5**.
- You need **CAP features** (multi-tenancy, OData v4 out of the box, JS toolchain, async event mesh) → **cap2UI5**.
- You work in a **mixed landscape** and want a UI component that looks the same in both worlds → you can deploy _exactly the same_ app in both frameworks, since the wire is compatible.

## Code comparison

ABAP version (`z2ui5_cl_app_hello_world.clas.abap`):

```abap
CLASS z2ui5_cl_app_hello_world DEFINITION PUBLIC.
  PUBLIC SECTION.
    INTERFACES z2ui5_if_app.
    DATA name TYPE string.
ENDCLASS.

CLASS z2ui5_cl_app_hello_world IMPLEMENTATION.
  METHOD z2ui5_if_app~main.
    IF client->check_on_init( ).
      DATA(view) = z2ui5_cl_xml_view=>factory( ).
      view->shell( )->page( title = 'Hello World'
        )->simple_form( editable = abap_true
        )->content(
        )->title( text = 'Make an input here and send it to the server...'
        )->label( text = 'Name'
        )->input(  value = client->_bind_edit( name )
        )->button( text = 'Send'
                   press = client->_event( 'BUTTON_POST' ) ).
      client->view_display( view->stringify( ) ).
    ELSEIF client->check_on_event( 'BUTTON_POST' ).
      client->message_box_display( |Your name is { name }| ).
    ENDIF.
  ENDMETHOD.
ENDCLASS.
```

JS version (cap2UI5):

```js
class z2ui5_cl_app_hello_world extends z2ui5_if_app {

  name = "";

  async main(client) {
    if (client.check_on_init()) {
      const view = z2ui5_cl_xml_view.factory()
        .Shell()
        .Page({ title: "Hello World" })
        .SimpleForm({ editable: true })
          .content()
          .Title({ text: "Make an input here and send it to the server..." })
          .Label({ text: "Name" })
          .Input({ value: client._bind_edit(this.name) })
          .Button({ text: "Send", press: client._event("BUTTON_POST") });
      client.view_display(view.stringify());

    } else if (client.check_on_event("BUTTON_POST")) {
      client.message_box_display(`Your name is ${this.name}`);
    }
  }
}
```

The structure is **identical**. Only the language idioms differ.

## Migration ABAP → CAP

Because the wire format and API are compatible, migrating an existing abap2UI5 app to cap2UI5 is mechanical:

1. Rewrite the ABAP class as a JS class (the mapping is 1:1)
2. Convert data access from OpenSQL to CDS queries
3. Convert external calls from `cl_http_client` to `fetch`/`cds.connect.to`
4. Wire up `require` in the JS project, drop into `srv/samples/`
5. Run it — done.

The same static frontend renders both without changes.

→ Have a look at the [**examples**](../examples/hello-world) or jump straight to the [**API reference**](../api/client).
