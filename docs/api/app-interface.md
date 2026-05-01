# API: App Interface

Every cap2UI5 app must extend `z2ui5_if_app`. Source: [`srv/z2ui5/02/z2ui5_if_app.js`](https://github.com/cap2UI5/dev/blob/main/cap2UI5/srv/z2ui5/02/z2ui5_if_app.js).

## Definition

```js
const z2ui5_if_app = require("../z2ui5/02/z2ui5_if_app");

class my_app extends z2ui5_if_app {
  async main(client) {
    // ...
  }
}
```

## Mandatory method

### `async main(client)`

Called on **every roundtrip**. Receives the `client` object as the only argument. Must be `async` (or return a promise).

```js
async main(client) {
  if (client.check_on_init()) { /* ... */ }
  if (client.check_on_event(...)) { /* ... */ }
}
```

## Reserved fields (framework)

These properties are predefined on the base class. **Don't override** them and don't use them as your own app state:

| Property | Type | Meaning |
|---|---|---|
| `id_draft` | `string` | Draft ID, managed internally |
| `id_app` | `string` | App ID, managed internally |
| `check_initialized` | `boolean` | Set to `true` after the first `main()` — controls `check_on_init()` |
| `check_sticky` | `boolean` | If `true`, sticky session active |

The binding engine explicitly excludes these fields from the reference lookup (`_FRAMEWORK_FIELDS` in `z2ui5_cl_core_client.js`).

## Static constants

```js
z2ui5_if_app.version    // "1.142.0"
z2ui5_if_app.origin     // "https://github.com/abap2UI5/abap2UI5"
z2ui5_if_app.authors    // link to contributors page
z2ui5_if_app.license    // "MIT"
```

## Validation

On the first roundtrip, `z2ui5_cl_core_app.validate(oApp)` is called — if your class does not extend `z2ui5_if_app`, it throws:

```
my_app must extend z2ui5_if_app (INTERFACES z2ui5_if_app)
```

## Persistence annotations

There are currently **no annotations** to exclude fields from persistence. If you need transient fields, declare them as **local variables in `main()`** instead of as app properties. The only hard-coded skip list is `["client"]` in `z2ui5_cl_core_srv_draft.js`.

Suggestion if you need this — patch `SKIP_PROPS`:

```js
// srv/z2ui5/01/01/z2ui5_cl_core_srv_draft.js
static SKIP_PROPS = new Set(["client", "_my_transient_field"]);
```

(Keeping in mind that your patch may be lost on the next sync.)

## Constructor

The base class has a constructor that **forbids direct instantiation**:

```js
new z2ui5_if_app();   // ❌ throws
```

It also checks that your subclass implements `main` as a function:

```js
class broken extends z2ui5_if_app { /* main() missing */ }
new broken();  // ❌ "broken must implement async main(client)"
```

## Lifecycle

→ see [App Lifecycle](../guide/lifecycle).

## Convention: naming

abap2UI5 convention is `z2ui5_cl_app_xyz`. cap2UI5 sticks to that for library apps (Startup, Hello World, Pop helpers), but **your own apps** can be named however you like. Important:

- **Class name === file name** (otherwise `_findAppFile` won't find the class on reload).
- The file must live in one of the three lookup paths (`srv/z2ui5/02/`, `srv/z2ui5/02/01/`, `srv/samples/`) or you extend `_findAppFile`.
- Class names should be **case-sensitive unique** — the lookup forces lowercase, so `MyApp` and `myapp` collide.
