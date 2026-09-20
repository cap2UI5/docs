# cap2UI5 vs. abap2UI5

They are the same framework. The question is not which framework you want but
**which runtime your code should live in** — and that is usually decided for you
by where your data is.

## What is identical

Not "compatible" — identical, because it is the same code:

- **the same frontend.** The UI5 shell ships inside `@abap2ui5/runtime`,
  straight from upstream's repository. Same bundle, same custom controls, same
  frontend actions, same boot;
- **the same backend.** Upstream's ABAP, downported and transpiled over
  open-abap. Not a port of it — it;
- **the same wire.** One `PROTOCOL` version, stamped by the same code that
  reads it;
- **the same concepts.** Roundtrips, the draft chain, the app stack, value
  helps as apps, one class per app.

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
| view | the fluent builder | a UI5 XML string — the builder is there, the facade just does not need it |
| lifecycle predicates | `check_on_init( )` / `check_on_navigated( )` | `c.isFirstRun` / `c.isDisplay` |

The full mapping is in
[Migrating from abap2UI5](./migration-from-abap2ui5#the-translation-table).

## The same app, twice

```abap
" abap2UI5
METHOD z2ui5_if_app~main.
  IF client->check_on_navigated( ).
    client->view_display( ... ).
    RETURN.
  ENDIF.
  IF client->get( )-event = 'GO'.
    client->message_box_display( |Hello { name }| ).
  ENDIF.
ENDMETHOD.
```

```js
// cap2UI5
main(c) {
  if (c.isDisplay) {
    c.view(/* … */);
    return;
  }
  if (c.eventName === "GO") c.messageBox(`Hello ${this.name}`);
}
```

Structure for structure. The languages part company in two places: ABAP names
its arguments where JavaScript passes an object, and `_bind( name )` becomes
`c.bind("name")` because JavaScript cannot match a value by reference.

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

What can lag is the **facade** — `c` covers the common surface, and something
newly added upstream may need a member here before it is convenient. `c.raw`
reaches it in the meantime, under its original name.

## Next

- [**Migrating from abap2UI5**](./migration-from-abap2ui5) — the translation table
- [**Where cap2UI5 Comes From**](./where-it-comes-from) — why this is a host and not a port
