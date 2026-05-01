# Data Binding

Data binding is the trick that lets cap2UI5 work without model boilerplate. This page explains **how it works** and **when you use what**.

## The two bindings

```js
client._bind(value)        // → "{/path}"      one-way (read-only on the frontend)
client._bind_edit(value)   // → "{/XX/path}"  two-way (frontend can write back)
```

Both methods take a **value**, look in `client.oApp` (= your app instance) to find **which property that value is**, and return a UI5 binding path.

```js
class my_app extends z2ui5_if_app {

  username = "Alice";

  async main(client) {
    const path1 = client._bind(this.username);       // → "{/username}"
    const path2 = client._bind_edit(this.username);  // → "{/XX/username}"
  }
}
```

## Reference equality

The lookup is **by reference equality**: `Object.is(this.username, value)`. For primitive values (`string`, `number`, `boolean`) this works because the same primitive value identity holds — as long as you pass the value out of the app instance:

```js
client._bind_edit(this.username);          // ✓ finds "username"
client._bind_edit("Alice");                // ✗ also matches (value is "Alice"),
                                           //   BUT: the engine iterates all fields
                                           //   and the FIRST one with value "Alice" wins
                                           //   → unreliable
```

For **objects and arrays** it is unambiguous:

```js
this.users = [...];
client._bind_edit(this.users);             // ✓ finds "users" (array identity)
```

::: warning Multiple fields with the same default
If two fields both have `""` as the initial value, the engine doesn't know which one you mean:

```js
class app extends z2ui5_if_app {
  first_name = "";
  last_name  = "";
  /* ... */
  client._bind_edit(this.last_name);       // → matches 'first_name'!
}
```

**Solution:** set different defaults (even a single space is enough), or _explicitly_ pass the path:

```js
client._bind_edit(this.last_name, { path: "last_name" });
```
:::

## What happens on the wire?

A cap2UI5 response contains a `MODEL` object that is set as the **default model** in the frontend's JSONModel. It has two areas:

```json
{
  "MODEL": {
    "users": [/* ... */],          // ← one-way bindings (top level)
    "title": "Hello",
    "XX": {
      "username": "Alice",         // ← two-way bindings (XX namespace)
      "is_active": true
    }
  }
}
```

When the user types in an `Input`, UI5 writes the value back to `/XX/username`. On the next roundtrip the frontend sends an **XX delta** with all changed values to the server. The server engine (`z2ui5_cl_core_srv_model.main_json_to_attri`) applies this delta to the deserialized app instance **before** `main()` is called — meaning: in `main()`, `this.username` is already the new value the user typed.

## Options

```js
client._bind_edit(value, opts);
```

| Option | Meaning |
|---|---|
| `path: true` | returns the **raw path** (`"/XX/username"`), not wrapped in `{...}` |
| `path: "myField"` | skips the reference lookup and uses the given path |
| `custom_mapper: ".fmt"` | formatter function name → output: `{path: '...', formatter: '.fmt'}` |
| `custom_mapper_back: ".fmtBack"` | reverse formatter (two-way only) |
| `view: "POPUP"` | target view — rarely needed |

Examples:

```js
// raw path for relative bindings (table items)
const tabPath = client._bind_edit(this.users, { path: true });
// "/XX/users"

// inside the table item structure, fields are relative:
view.Table({ items: client._bind_edit(this.users) })
  .Column()
    .Text({ text: "{name}" });   // ← '{name}' relative to the item
```

## Local bindings

Sometimes you want a view-internal variable that should _not_ live as an app property:

```js
client._bind_local(initialValue);   // → "{/__local_3}"
```

Creates an anonymous path with the given initial value. Useful for visual helper state that the server never needs.

## Reacting to clicks: `_event`

Bindings are one half; the other is `_event`:

```js
view.Button({ text: "Save", press: client._event("BUTTON_SAVE") });
```

`_event(name)` builds the UI5 press handler string that sends the event back to the server via the roundtrip. The actual `BUTTON_SAVE` then shows up in `client.get().EVENT`.

→ More under [Events](./events).

## Frontend-only events: `_event_client`

When the event should run **only on the frontend** (no server roundtrip):

```js
view.Button({
  press: client._event_client(client.cs_event.OPEN_NEW_TAB, ["https://sap.com"])
});
```

The frontend handler dispatches it locally. Very similar to `client.open_new_tab()`, which terminates the roundtrip — the difference: `_event_client` does it _on a click_, `open_new_tab` does it _as a side effect of this roundtrip_.

→ List of all `cs_event` constants in [API: client](../api/client).

## Example: complete form

```js
class profile extends z2ui5_if_app {

  first_name = " ";    // ← different defaults so the lookup is unambiguous
  last_name  = "  ";
  email      = "";
  active     = false;
  validation = { email_state: "None", email_text: "" };

  async main(client) {

    if (client.check_on_init()) this.render(client);

    if (client.check_on_event("SAVE")) {
      if (!this.email.includes("@")) {
        this.validation.email_state = "Error";
        this.validation.email_text  = "Please enter a valid email";
      } else {
        client.message_toast_display("Saved");
      }
      this.render(client);
    }
  }

  render(client) {
    const view = z2ui5_cl_xml_view.factory();
    view.Page({ title: "Profile" })
      .SimpleForm({ editable: true })
        .content()
          .Label({ text: "First name" }).Input({ value: client._bind_edit(this.first_name) })
          .Label({ text: "Last name"  }).Input({ value: client._bind_edit(this.last_name) })
          .Label({ text: "Email"      }).Input({
              value:          client._bind_edit(this.email),
              valueState:     client._bind(this.validation.email_state),
              valueStateText: client._bind(this.validation.email_text)
            })
          .Label({ text: "Active"     }).CheckBox({ selected: client._bind_edit(this.active) })
          .Button({ text: "Save", press: client._event("SAVE"), type: "Emphasized" });
    client.view_display(view.stringify());
  }
}
```

→ Continue with [**Events**](./events).
