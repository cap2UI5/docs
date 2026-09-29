# cap2UI5 vs. abap2UI5

They are the same framework. The question is not which framework you want but
**which runtime your code should live in** — and that is usually decided for you
by where your data is.

## What is identical

Not "compatible" — identical, because it is the same code:

- **the same frontend.** The UI5 frontend ships inside `@abap2ui5/node-runtime`,
  straight from upstream's repository. Same bundle, same custom controls, same
  frontend actions, same boot;
- **the same backend.** Upstream's ABAP, downported and transpiled over
  open-abap. Not a port of it — it;
- **the same wire.** One `PROTOCOL` version, stamped by the same code that
  reads it;
- **the same concepts.** Roundtrips, the draft chain, the app stack, value
  helps as apps, one class per app;
- **the same API.** The client an app's `main( client )` receives is
  `z2ui5_if_client` under its ABAP method names, and the view builder is
  `z2ui5_cl_ui5_view_builder`. abap2UI5's documentation of a method is the
  documentation of the JavaScript one.

The browser cannot tell which side answers.

::: info This used to be a longer and more careful section
It listed the framework version this project had pinned, the API differences
that version implied, and which examples were affected. None of that applies
any more: there is no separate version to pin, because there is no second
implementation to keep in step. See
[Where cap2UI5 Comes From](./where-it-comes-from).
:::

## What differs

| | abap2UI5 | cap2UI5 |
|---|---|---|
| language | ABAP | JavaScript |
| runs on | an SAP system (NetWeaver, S/4, BTP ABAP) | Node.js, as a CAP plugin |
| deployment | abapGit into a system | `npm i` into a CAP project |
| data access | Open SQL | `cds.ql`, and CAP's remote services |
| session state | `Z2UI5_T_01` | `cap2ui5.Drafts`, a CDS entity in your database |
| identity | `sy-uname` | `cds.context.user.id` |
| client calls | `client->check_on_navigated( )` | `client.check_on_navigated()` |
| parameters by name | ``_event( val = `GO` t_arg = … )`` | one object: `_event({ val: "GO", t_arg: [ … ] })` |
| binding | `_bind( name )` — the attribute, by reference | `_bind("name")` — the field, by name |
| view | `z2ui5_cl_ui5_view_builder` | the same builder, or a UI5 XML string |

The full mapping is in
[Migrating from abap2UI5](./migration-from-abap2ui5#the-translation-table).

## The same app, twice

```abap
" abap2UI5
METHOD z2ui5_if_app~main.
  IF client->check_on_navigated( ).
    client->view_display( ... ).
  ELSEIF client->check_on_event( `GO` ).
    client->message_box_display( |Hello { name }| ).
  ENDIF.
ENDMETHOD.
```

```js
// cap2UI5
main(client) {
  if (client.check_on_navigated()) {
    client.view_display(/* … */);
  } else if (client.check_on_event("GO")) {
    client.message_box_display(`Hello ${this.name}`);
  }
}
```

Line for line. The languages part company in two places: ABAP names its
arguments where JavaScript passes one object with the same names, and
`_bind( name )` becomes `client._bind("name")` because JavaScript cannot match
a value by reference. That is close enough for a machine to do it:
`npx --no-install cap2ui5 abap2js` translates an abap2UI5 app class into a
cap2UI5 app, line for line, and refuses what it does not know rather than guess — see
[Migrating from abap2UI5](./migration-from-abap2ui5#translate-it-cap2ui5-abap2js).
[`@cap2ui5/samples`](https://github.com/cap2UI5/samples) is 71 of abap2UI5's
samples as cap2UI5 apps, 69 of them translated that way.

## Which one do I want?

**Your data is in an SAP system** → abap2UI5. Running the UI where the data is
avoids an integration you would otherwise have to build and secure.

**Your data is in CAP** → cap2UI5. Your apps read it with `cds.ql`, share the
project's authentication, and a plain OData service can sit beside them on the
same tables.

**Both** → both. The frontend is the same, the concepts are the same, and a
developer moving between them is reading the same documentation.

## Does the CAP side lag behind?

Not structurally. The runtime is a dependency: a new abap2UI5 release is a
version bump, and it brings the backend and the frontend together. There is no
port to catch up, no pipeline to re-run, nothing to re-transpile by hand.

The client covers every method of `z2ui5_if_client` — the plugin's tests hold
it to the interface, so a method upstream adds shows up there as a failing
test — the test reads the interface from the runtime it boots — rather than
as a gap an app finds. `client.raw`, the transpiled
interface itself, remains the escape hatch.

## Next

- [**Migrating from abap2UI5**](./migration-from-abap2ui5) — the translation table, and `abap2js`
- [**Client API**](../api/client) — every method of `z2ui5_if_client`
- [**Where cap2UI5 Comes From**](./where-it-comes-from) — why this is a host and not a port
