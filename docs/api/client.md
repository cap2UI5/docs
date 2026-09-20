# API: `c` — the client facade

The single argument `main` receives. Every member is **synchronous**: queries
are resolved before `main` runs, commands are recorded and replayed after it.

```js
defineApp("ZCL_X", class {
  main(c) { /* c is this page */ }
});
```

## Lifecycle

| | |
|---|---|
| `c.isFirstRun` | `true` on the first roundtrip of **this app instance**, and only that one. Seed state here |
| `c.isDisplay` | `true` on the first roundtrip **and** every time this app gets the screen back — a called app leaving, a value help closing, a bookmark restored. **Render here** |
| `c.canGoBack` | `true` if there is an app to return to. Guard `navBack` with it |
| `c.eventName` | the event this roundtrip answers; `""` on an app start |
| `c.eventArg(i)` | the *i*-th event argument, **1-based**. The first 8 are resolved up front; beyond that use `c.raw` |
| `c.prevApp` | the app on the other side of the last navigation, as plain values — how a called app's result is read |

`isFirstRun` implies `isDisplay`. See [App Lifecycle](../guide/lifecycle) for
why confusing them produces a screen that silently does not refresh.

## Binding and events

| | |
|---|---|
| `c.bind(field)` | the binding path for a declared field. Takes the field **name** as a string. Throws, listing the known fields, if it is not one |
| `c.event(name, args = [])` | the wire string for an event handler. `args` travel with it and come back as `c.eventArg(1..n)` |

```js
`<Input value="${c.bind("name")}"/>`
`<Button press="${c.event("TAKE", ["red"])}"/>`
```

The value `c.event` returns is a handler expression — embed it, do not parse or
compare it.

## Screen

| | |
|---|---|
| `c.view(xml)` | render the main view. An `mvc:View` |
| `c.popup(xml)` | a dialog on top. A `core:FragmentDefinition` |
| `c.popupClose()` | close it |
| `c.nest(into, xml, {insert, clear})` | render a fragment **into** a control of the main view. `into` is that control's id; `insert`/`clear` default to `addContent`/`removeAllContent` |
| `c.nestClose()` | clear the nested slot. There is exactly one, so it takes no argument |
| `c.messageBox(text)` | a dialog with an OK button |
| `c.messageToast(text)` | a transient toast |

Commands are replayed **in the order you called them**.

## Navigation

| | |
|---|---|
| `c.navTo(app)` | show another app on top of this one. Takes a registered name, a `defineApp` class, or an instance |
| `c.navBack(opts)` | hand the screen back. `{ event, data, app }`, all optional |

Both are scheduled for the end of the roundtrip.

## Escape hatch

| | |
|---|---|
| `c.raw` | the underlying `z2ui5_if_client`, unwrapped. **Async** — every call needs `await` |

Use it for anything the facade does not cover. Its methods are the ABAP ones
with `~` written as `$`:

```js
await c.raw.z2ui5_if_client$set_session_stateful({ val: abap.builtin.abap_true });
```

## Removed, and why

Both throw an error naming the replacement rather than quietly changing meaning:

| | |
|---|---|
| `c.isInitial` | it was wired to `check_on_navigated()` and named after `check_on_init()`. Use `c.isDisplay` / `c.isFirstRun` |
| `c.modelUpdate()` | it called `view_model_update()`, which the framework declares **obsolete and does nothing** |

## Next

- [**App Interface**](./app-interface) — `defineApp` and `t`
- [**App Lifecycle**](../guide/lifecycle) — when each branch runs
