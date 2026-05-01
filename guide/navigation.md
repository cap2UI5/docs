# Navigation

cap2UI5 apps can navigate between each other — the server keeps a **stack** of app instances, so forward and back navigation work naturally.

## Forward: `nav_app_call(newApp)`

```js
if (client.check_on_event("OPEN_DETAILS")) {
  const detail = new my_detail_app();
  detail.id = this.selected_id;
  client.nav_app_call(detail);
}
```

This **pushes the current app onto the stack** and makes `detail` the new main app. The handler loop will call `main()` of `detail` directly within the same roundtrip — `check_on_init()` is `true` there.

## Back: `nav_app_leave()`

```js
if (client.check_on_event("CANCEL")) {
  client.nav_app_leave();
}
```

**Pops** the topmost app off the stack. If the stack is empty, the framework falls back to the startup app.

Optionally you can specify an **explicit app** to jump back to:

```js
client.nav_app_leave(some_specific_app);
```

## Convenience: page back button

Practically every app wants a page back button that jumps to the previous app:

```js
view.Page({
  title:          "Detail",
  navButtonPress: client._event_nav_app_leave(),
  showNavButton:  client.check_app_prev_stack()
});
```

`_event_nav_app_leave()` builds a special event that **the framework intercepts** — your `main()` never sees it. It performs `nav_app_leave()` directly.

`check_app_prev_stack()` returns `true` when the stack is not empty — useful so the button is only shown when it makes sense.

## Pop result: `get_app_prev()`

The classic pattern: an app opens a "selector" that returns a selection.

```js
// main app
if (client.check_on_event("PICK_USER")) {
  const picker = new user_picker();
  picker.search_term = this.search;
  client.nav_app_call(picker);
}

// after returning from picker
if (client.check_on_navigated()) {
  const prev = client.get_app_prev();
  if (prev instanceof user_picker && prev.result?.confirmed) {
    this.selected_user = prev.result.user;
  }
}
```

`get_app_prev()` returns the **just-left** app (not the stack top). It is readable for exactly one roundtrip after a back-nav — afterwards it is discarded.

## App home & app back

Two more convenience methods:

```js
client.nav_app_home();   // ← jumps to startup, clears the stack
client.nav_app_back();   // ← single pop; falls back to home if empty
```

Difference from `nav_app_leave()`: `nav_app_back()` additionally sets the flag `_navTargetIsLeave = true`, so the stack pointer is not pushed again.

## Routing via URL

You can directly start a specific app via URL parameter:

```
/rest/root/z2ui5?app_start=my_app_name
```

This works through `factory_first_start` in `z2ui5_cl_core_action.js` — on the first roundtrip without `S_FRONT.ID` the handler looks at the query string, finds the class via RTTI, and instantiates it.

## Browser history

If you want to couple the history with the browser history:

```js
client.set_push_state(true);
```

Pushes the current server state into `history.pushState`. With this the browser back button works — it then triggers a reload with the previous `S_FRONT.ID`.

## Stack persistence

The nav stack survives across roundtrips because:

1. On `db_save` of the current app, all apps in the `_navStack` are also persisted.
2. Their IDs are stored in `oApp.__navStackIds`.
3. On the next load, `_rehydrate_nav_stack` reads these IDs and reloads the stack apps.

Meaning: a user can refresh the browser and the entire navigation history is restored.

## Example: master-detail with picker

```js
class my_master extends z2ui5_if_app {

  selected_user_id  = "";
  selected_username = "";

  async main(client) {
    if (client.check_on_init()) this.render(client);

    if (client.check_on_navigated()) {
      const prev = client.get_app_prev();
      if (prev instanceof my_user_picker && prev.confirmed) {
        this.selected_user_id  = prev.result_id;
        this.selected_username = prev.result_name;
      }
      this.render(client);
    }

    if (client.check_on_event("PICK")) {
      client.nav_app_call(new my_user_picker());
    }
  }

  render(client) { /* ... */ }
}
```

```js
class my_user_picker extends z2ui5_if_app {

  confirmed   = false;
  result_id   = "";
  result_name = "";

  async main(client) {
    if (client.check_on_init()) this.render(client);

    if (client.check_on_event("CONFIRM")) {
      this.confirmed   = true;
      this.result_id   = client.get_event_arg(1);
      this.result_name = client.get_event_arg(2);
      client.nav_app_leave();
    }

    if (client.check_on_event("CANCEL")) client.nav_app_leave();
  }

  render(client) { /* ... */ }
}
```

→ Continue with [**Persistence & Sessions**](./persistence).
