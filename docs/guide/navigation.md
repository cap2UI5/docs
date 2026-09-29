# Navigation

Navigation in cap2UI5 is one app **calling another**. The caller keeps its
state, the callee runs with its own, and when the callee leaves, the caller gets
the screen back and can read what the callee produced.

## Calling an app

```js
// ZCL_JS_PICK
if (client.check_on_event("CHOOSE")) {
  client.nav_app_call("ZCL_JS_PICK_ONE");
  return;
}
```

`client.nav_app_call` takes the name you gave `defineApp`, a `defineApp` class,
or an instance you built yourself — ABAP's `nav_app_call( NEW zcl_other( ) )`
is `client.nav_app_call("ZCL_OTHER")`. A name that resolves to nothing is
refused **here**, where you can see which name it was, rather than as a
`NAV_APP_TARGET_NOT_BOUND` later.

A second argument presets the called app's fields — what an ABAP app does
between `NEW` and `nav_app_call( )`. They win over the called app's own initial
values, and a name it does not have is refused, naming the ones it has:

```js
client.nav_app_call("ZCL_JS_HANDOVER_FORM", { product: "Notebook", quantity: 2, mode: "edit" });
```

Navigation is scheduled for the end of the roundtrip, so it is usually the last
thing a branch does.

## Coming back

```js
// ZCL_JS_PICK_ONE
if (client.check_on_event("TAKE")) {
  this.colour = client.get_event_arg(1);
  if (client.check_app_prev_stack()) client.nav_app_leave({ event: "PICKED" });
  return;
}
```

`client.nav_app_leave(…)` hands the screen back. Guard it with
`client.check_app_prev_stack()` — there may be nothing to go back to.

| parameter | |
|---|---|
| `event` | the event the caller's `main` sees on its next run: `client.get_event()`, `client.check_on_event(…)` |
| `r_data` | a value for the caller, which reads it as `client.get().r_event_data` |
| `app` | leave to a *different* app than the one that called; `client.nav_app_leave(app)` positionally |

A page's back button needs no branch at all:
`navButtonPress="${client._event_nav_app_leave()}"`, with
`showNavButton="${client.check_app_prev_stack()}"`.

## Reading what the callee produced

Back in the caller, `client.get_app_prev()` is the app on the other side of the
last navigation — the instance that just returned, with its fields as plain
values:

```js
// ZCL_JS_PICK again, after the callee left
if (client.check_on_event("PICKED") && client.get_app_prev()) {
  this.chosen = client.get_app_prev().colour ?? "";
  this.picks += 1;
}

if (client.check_on_navigated()) {
  client.view_display(/* … shows this.chosen … */);
}
```

Or the callee hands over data with `r_data`, and the caller reads it from
`client.get()`, abap2UI5's `client->get( )-r_event_data`:

```js
// the callee
client.nav_app_leave({ event: "CONFIRMED", r_data: { product: this.product, quantity: this.quantity } });

// the caller
if (client.check_on_navigated()) {
  if (client.check_on_event("CONFIRMED")) {
    this.result = client.get().r_event_data;   // { product: "Notebook", quantity: 5 }
  }
  client.view_display(/* … */);
}
```

`r_data` arrives **typed** — an ABAP caller could `ASSIGN` it as a structure —
so a JavaScript caller gets the object back with its keys lowercase, as ABAP
names components.

::: danger This is where `check_on_navigated()` earns its name
When the callee leaves, the caller's `main` runs again with
**`check_on_navigated()` true and `check_on_init()` false**. An app that renders
only on `check_on_init()` shows the user its *old* screen — the pick never
appears, and nothing anywhere reports an error.

That is the single most common way to get a screen that does not refresh. See
[App Lifecycle](./lifecycle).
:::

## Writing into the caller: `get_app(id)`

The callee can also set a field of the caller before it leaves, as abap2UI5's
sample 025 does. `client.get_app(id)` answers the app behind a draft id:

```js
const app_back = client.get_app(client.get().s_draft.id_prev_app_stack);
app_back.backend_event = "FORM_LEFT";
client.nav_app_leave(app_back);
```

That app is read from the draft store after `main` returns, so what
`get_app(id)` answers is a **handle whose fields can be written, not read** —
reading one throws and points to `client.get_app_prev()`. Without an id,
`client.get_app()` is the running app itself.

## The URL

| | |
|---|---|
| `client.hash_set("/detail/1")` | push a hash onto the browser history |
| `client.hash_replace("/detail/2")` | rewrite the hash without a history entry |
| `client.app_state_set_active()` | keep this app's state id in the URL |
| `client.app_state_get_href()` | the absolute link to this app's current state |

## The stack is in the database

`client.nav_app_call` does not keep a call stack in memory. The draft rows carry
it — `id_prev`, `id_prev_app`, `id_prev_app_stk` — which is why navigation
survives a restart.

Measured: a server is **SIGKILLed while inside the called app**, and a fresh
process takes the callee's event, unwinds a stack it never built, runs the
caller's `main` again and carries the value home:

```
B roundtrip 2  MODEL={"CHOSEN":"red","PICKS":1}
RESULT: the app STACK survived the restart
```

## Popup or navigation?

| | |
|---|---|
| a dialog that belongs to this app's state | [`client.popup_display`](./popups) |
| a screen with its own state, reusable from several places | `client.nav_app_call` |

A value help is usually the second: it is an app, and its result comes back
through `client.get_app_prev()` or `r_data`.

## Next

- [**App Lifecycle**](./lifecycle) — `check_on_navigated()` vs. `check_on_init()`
- [**Popups & Toasts**](./popups) — the lighter alternatives
- [**Persistence**](./persistence) — why the stack survives
- [**Client API**](../api/client) — every navigation method
