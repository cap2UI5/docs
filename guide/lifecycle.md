# App Lifecycle

A cap2UI5 app is a JavaScript class with a single mandatory method: `async main(client)`. When exactly it is called, what happens the first time, what happens on subsequent roundtrips — that is the app lifecycle.

## The `main(client)` method

```js
class my_app extends z2ui5_if_app {

  some_field = "";

  async main(client) {
    // called on EVERY roundtrip
  }
}
```

It is called **on every roundtrip** — initial load, button click, selection change, navigation, popup close, … everything goes through `main()`. You differentiate via the `check_*` methods of the `client` object.

## The three main states

```js
async main(client) {

  if (client.check_on_init()) {
    // first call of the app instance
    return;
  }

  if (client.check_on_navigated()) {
    // app was just activated after a nav_app_call/leave
    return;
  }

  if (client.check_on_event("MY_EVENT")) {
    // a specific event has occurred
    return;
  }
}
```

### `check_on_init()`

Returns `true` **only on the first** `main()` call of a fresh app instance. This is the moment when you:

- Set default values
- Load external data (`cds.connect.to(...)`)
- Render the initial view

```js
if (client.check_on_init()) {
  this.customers = await (await cds.connect.to("northwind"))
    .run(SELECT.from("Customers").limit(50));
  this.render(client);
  return;
}
```

Internally: `check_on_init()` returns `true` as long as `oApp.check_initialized` is falsy **and** there is no event name. After `main()`, the handler sets `check_initialized = true`, persists the instance, and returns the response. On the next roundtrip the instance is loaded from the DB — by then `check_initialized` is already `true` and `check_on_init()` returns `false`.

### `check_on_event(name?)`

With argument: tests whether the given event is currently active.

```js
if (client.check_on_event("BUTTON_SAVE")) {
  await this.save();
}
```

Without argument: tests whether _any_ event is active.

```js
if (client.check_on_event()) {
  switch (client.get().EVENT) {
    case "BUTTON_SAVE":   /* ... */ break;
    case "BUTTON_CANCEL": /* ... */ break;
  }
}
```

Which style is nicer is a matter of taste — both work identically.

### `check_on_navigated()`

Returns `true` directly after a `nav_app_call(...)` or `nav_app_leave(...)`. In the navigated-into app you can use it to react to the result of a popup or a sub-app:

```js
if (client.check_on_navigated()) {
  const prev = client.get_app_prev();
  if (prev instanceof MyPopup && prev.result?.confirmed) {
    this.selected_id = prev.result.id;
  }
}
```

→ More in [Navigation](./navigation).

## What happens between roundtrips

The lifecycle of an app instance:

```
            ┌──────────────────────────────────────┐
            │ First GET → frontend loads           │
            │ First POST (S_FRONT.ID = "")         │
            ▼                                      │
        action_factory                             │
        → factory_first_start (?app_start=…)       │
        → factory_system_startup                   │
            │                                      │
            ▼                                      │
        new MyApp()                                │
            │                                      │
            ▼                                      │
        apply XX delta (initial = empty)           │
            │                                      │
            ▼                                      │
        main(client)  ← check_on_init() === true   │
            │                                      │
            ▼                                      │
        check_initialized = true                   │
            │                                      │
            ▼                                      │
        DB.saveApp() → new UUID generated          │
            │                                      │
            ▼                                      │
        Response: { S_FRONT: { ID: <uuid>, … } }   │
            │                                      │
            ▼                                      │
        Browser shows view                         │
            │                                      │
            ▼                                      │
        User clicks button                         │
            │                                      │
            ▼                                      │
        POST { S_FRONT: { ID: <uuid>, EVENT, … }, XX: { … delta … } }
            │                                      │
            ▼                                      │
        action_factory → DB.loadApp(uuid)          │
            │                                      │
            ▼                                      │
        deserialize → my_app instance with old state
            │                                      │
            ▼                                      │
        apply XX delta (user inputs flow in)       │
            │                                      │
            ▼                                      │
        main(client)  ← check_on_event(...) === true
            │                                      │
            ▼                                      │
        DB.saveApp() → new UUID                    │
            └──────────────────────────────────────┘
```

Important:

1. **The app instance only lives for one roundtrip** in memory. Afterwards it is serialized.
2. **Fields that are JSON-serializable survive.** Functions, closures, DOM refs, external connection objects → do not.
3. **Properties like `client` are skipped** (see `SKIP_PROPS` in `z2ui5_cl_core_srv_draft.js`) so that no cyclic graph is created.

## Pattern: fields ↔ reference-equality bindings

```js
class search_form extends z2ui5_if_app {

  search    = "";    // ← bind_edit finds 'search' via reference equality
  results   = [];
  page_size = 25;

  async main(client) {
    if (client.check_on_init()) { /* ... */ }
    if (client.check_on_event("DO_SEARCH")) {
      this.results = await this.search_db(this.search, this.page_size);
    }
    this.render(client);
  }

  render(client) {
    z2ui5_cl_xml_view.factory()
      .Page({ title: "Search" })
        .Input({ value: client._bind_edit(this.search) })
        .Button({ press: client._event("DO_SEARCH") })
        .Table({ items: client._bind(this.results) });
  }
}
```

Fields you expose via bindings **must be direct properties** of the app. `_bind_edit(this.deep.path.field)` does _not_ work for deeply nested values — you would expose `this.deep` and bind the sub-path as a string:

```js
const path = client._bind_edit(this.deep, { path: true });
// path = "/XX/deep"
.Input({ value: `{${path}/path/field}` })
```

→ Full explanation in [Data Binding](./data-binding).

## Framework fields (don't use yourself)

These properties on `z2ui5_if_app` are reserved:

```js
id_draft          = "";
id_app            = "";
check_initialized = false;
check_sticky      = false;
```

Don't override — the binding engine explicitly excludes them from the reference lookup (`_FRAMEWORK_FIELDS` in `z2ui5_cl_core_client.js`), but don't use them as your own app state either.

## Stickiness (optional)

```js
this.check_sticky = true;
client.set_session_stateful(true);
```

Sets a sticky session — the frontend driver then serializes roundtrips more strictly back-to-back. Useful for apps with critical ordering or file upload sequences, otherwise unnecessary.

→ Continue with [**View Builder**](./views).
