# App Lifecycle

An app is a class. Each roundtrip rebuilds an instance of it from the draft,
applies what the browser sent, and calls `main(client)` exactly once.

```js
import { defineApp } from "@cap2ui5/cds-plugin";

defineApp("ZCL_HELLO", class {
  name = "";

  main(client) {
    // called on EVERY roundtrip — the branches below decide what happens
  }
});
```

`client` is abap2UI5's `z2ui5_if_client`, by its ABAP method names:
`client->check_on_navigated( )` is `client.check_on_navigated()`.

`main` is **synchronous**. Make it `async` only when your app does I/O; the
client's calls need no `await` either way.

## The two predicates, and the one that trips people

```js
main(client) {
  if (client.check_on_init()) {
    // the first roundtrip of THIS app instance, and only that one.
    // Seed state here.
  }

  if (client.check_on_navigated()) {
    // the first roundtrip AND every time this app gets the screen back:
    // a called app leaving, a value help closing, a bookmark restored.
    // RENDER here.
    client.view_display(/* … */);
    return;
  }

  if (client.check_on_event("GO")) { /* … */ }
}
```

::: danger Render on `check_on_navigated()`, not on `check_on_init()`
`check_on_init()` implies `check_on_navigated()`, so
`if (client.check_on_navigated())` is the whole display condition — no `||`.

An app that renders only on `check_on_init()` works perfectly until something
navigates back into it, and then **leaves the previous screen standing with no
error anywhere**. Nothing throws, nothing logs, the user just sees the wrong
page. It is the framework's most common app bug, and `z2ui5_if_client`'s own
documentation says so.
:::

The names are abap2UI5's, and they mislead in the same way there:
`check_on_navigated` reads like "arrived by navigation" and is in fact also true
on the very first run.

## The full surface

What `client` offers, grouped — the [client reference](../api/client) lists
every method with its parameters:

| | |
|---|---|
| **lifecycle** | `check_on_init()`, `check_on_navigated()`, `check_app_prev_stack()`, `get_event()`, `check_on_event(name)`, `get_event_arg(i)`, `get_app_prev()`, `get()` |
| **binding** | `_bind(field)`, `_event(name)`, `_event_nav_app_leave()`, `follow_up_action(…)` |
| **screen** | `view_display(xml)`, `popup_display(xml)` / `popup_destroy()`, `popover_display({ xml, by_id })`, `nest_view_display({ … })` / `nest_view_destroy()`, `nest2_*` |
| **messages** | `message_box_display(text)`, `message_toast_display(text)` |
| **navigation** | `nav_app_call(app)`, `nav_app_leave({ event, r_data })`, `get_app(id)`, `hash_set()`, `app_state_set_active()` |
| **escape hatch** | `raw` — the transpiled `z2ui5_if_client` itself, asynchronous |

## A typical app

```js
import cds from "@sap/cds";
import { defineApp, t } from "@cap2ui5/cds-plugin";

const { SELECT } = cds.ql;

defineApp("ZCL_ORDER", class {
  customer = "";
  lines    = t.table({ sku: "", qty: 0 });
  loaded   = false;

  async main(client) {
    if (client.check_on_init()) {
      this.customer = "ACME";              // seed once
    }

    if (client.check_on_event("LOAD")) {
      const { Orders } = cds.entities("my.shop");
      this.lines = await SELECT.from(Orders);
      this.loaded = true;
    }

    if (client.check_on_navigated() || client.check_on_event("LOAD")) {
      client.view_display(/* … */);
    }
  }
});
```

Note the last branch: after an event that changed what is on screen you render
again. Changed **bound data** is pushed on its own — you only re-render when the
view's *structure* changes.

## Helper methods

An abap2UI5 app of any size splits `main` into helpers, and keeps the client
for them in `main` as an ABAP app does with `me->client = client`:

```js
main(client) {
  this.client = client;
  if (client.check_on_navigated()) this.view_display();
}

view_display() {
  this.client.view_display(/* … */);
}
```

`this.client` is not declared as a field, so it is not part of the model or the
draft; `main` sets it again on every roundtrip.

## What throws, and what does nothing

A name the client does not have throws an error naming the replacement, rather
than answering `undefined` — `if (client.isDisplay)` would otherwise be false on
every roundtrip and the app would never render:

| | |
|---|---|
| `client.isFirstRun`, `client.isDisplay`, `client.eventName`, `client.bind(…)`, … | the pre-0.2.0 names. The error names the `z2ui5_if_client` method that replaces each |
| `client.isInitial` | it was wired to `check_on_navigated()` and named after `check_on_init()`. Use `check_on_navigated()` to render, `check_on_init()` to seed |
| `client.set_session_stateful()` | not supported: the app's state is in its fields, which are in the draft |
| `view_model_update()` and the other `*_model_update()` | obsolete in `z2ui5_if_client`, and they **do nothing**, as in ABAP. Changed bound data is pushed automatically — to an open popup, popover and nested view too |

## Next

- [**Data Binding**](./data-binding) — `client._bind`, tables, structures
- [**Events**](./events) — `client._event`, arguments, `check_on_event`
- [**Navigation**](./navigation) — `nav_app_call`, `nav_app_leave`, `get_app_prev`
- [**Persistence**](./persistence) — why the instance survives at all
