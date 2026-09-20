# Navigation

Navigation in cap2UI5 is one app **calling another**. The caller keeps its
state, the callee runs with its own, and when the callee leaves, the caller gets
the screen back and can read what the callee produced.

## Calling an app

```js
// ZCL_PICK
if (c.eventName === "CHOOSE") {
  c.navTo("ZCL_PICK_ONE");
  return;
}
```

`c.navTo` takes the name you gave `defineApp`, a `defineApp` class, or an
instance you built yourself. A name that resolves to nothing is refused **here**,
where you can see which name it was, rather than as a `NAV_APP_TARGET_NOT_BOUND`
later.

Navigation is scheduled for the end of the roundtrip, so it is usually the last
thing a branch does.

## Coming back

```js
// ZCL_PICK_ONE
if (c.eventName === "TAKE") {
  this.colour = c.eventArg(1);
  if (c.canGoBack) c.navBack({ event: "PICKED" });
  return;
}
```

`c.navBack(opts)` hands the screen back. Guard it with `c.canGoBack` — there may
be nothing to go back to.

| option | |
|---|---|
| `event` | the event the caller's `main` sees on its next run |
| `data` | a value for the caller; a string goes as is, anything else is JSON |
| `app` | leave to a *different* app than the one that called |

## Reading what the callee produced

Back in the caller, `c.prevApp` is the app on the other side of the last
navigation — the instance that just returned, with its fields as plain values:

```js
// ZCL_PICK again, after the callee left
if (c.eventName === "PICKED" && c.prevApp) {
  this.chosen = c.prevApp.colour ?? "";
  this.picks += 1;
}

if (c.isDisplay) {
  c.view(/* … shows this.chosen … */);
}
```

::: danger This is where `isDisplay` earns its name
When the callee leaves, the caller's `main` runs again with **`isDisplay` true
and `isFirstRun` false**. An app that renders only on `isFirstRun` shows the
user its *old* screen — the pick never appears, and nothing anywhere reports an
error.

That is the single most common way to get a screen that does not refresh. See
[App Lifecycle](./lifecycle).
:::

## The stack is in the database

`c.navTo` does not keep a call stack in memory. The draft rows carry it —
`id_prev`, `id_prev_app`, `id_prev_app_stk` — which is why navigation survives a
restart.

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
| a dialog that belongs to this app's state | [`c.popup`](./popups) |
| a screen with its own state, reusable from several places | `c.navTo` |

A value help is usually the second: it is an app, and its result comes back
through `c.prevApp`.

## Next

- [**App Lifecycle**](./lifecycle) — `isDisplay` vs. `isFirstRun`
- [**Popups & Toasts**](./popups) — the lighter alternatives
- [**Persistence**](./persistence) — why the stack survives
