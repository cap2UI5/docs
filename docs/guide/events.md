# Events

`client._event("NAME")` produces the handler a control's event attribute needs.
The next roundtrip answers `client.check_on_event("NAME")` with `true`.

```js
defineApp("ZCL_HELLO", class {
  name  = "";
  count = 0;

  main(client) {
    if (client.check_on_navigated()) {
      client.view_display(
        `<Input value="${client._bind("name")}"/>` +
        `<Button text="Go" press="${client._event("GO")}"/>`);
      return;
    }

    if (client.check_on_event("GO")) {
      this.count++;
      client.message_toast_display(`Hello ${this.name}, click ${this.count}`);
    }
  }
});
```

`client.get_event()` is the event's name, `""` on an app start, so
`if (client.check_on_event("GO"))` is safe without a guard.
`client.check_on_event()` without a name is true for any event.

## Arguments — how two buttons share one event

A handler cannot know which control fired unless the wire carries it. That is
what `t_arg` is for — the parameters by name are one object, with the ABAP
names:

```js
client.view_display(
  `<Button text="red"  press="${client._event({ val: "TAKE", t_arg: ["red"] })}"/>` +
  `<Button text="blue" press="${client._event({ val: "TAKE", t_arg: ["blue"] })}"/>`);

// next roundtrip
if (client.check_on_event("TAKE")) {
  this.colour = client.get_event_arg(1);   // "red" or "blue"
}
```

`client.get_event_arg(i)` is **1-based**, like the ABAP table it reads. `arg`
is one more argument behind the `t_arg`. The first eight arguments are resolved
up front; `client.get_event_arg(9)` throws and tells you to use `client.raw` for
a longer list.

An argument may be a UI5 expression the browser evaluates when the event fires —
`"${$parameters>/newValue}"` hands over what the user typed. `s_ctrl` is
`z2ui5_if_client=>ty_s_event_control`, by component name:

```js
`<SearchField value="${client._bind("query")}" liveChange="${client._event({
  val: "TYPED", t_arg: ["${$parameters>/newValue}"],
  s_ctrl: { check_queue_last: true, check_no_busy: true },
})}"/>`
```

| `s_ctrl` | |
|---|---|
| `check_queue_last` | keep the last firing while a roundtrip runs, instead of dropping it — for `liveChange` |
| `check_no_busy` | no busy indicator for this event |
| `check_arg_literal` | every argument is quoted, so none is read as a binding or expression |
| `check_prevent_default` | cancel the control's default for this event |

`client._event("TAKE", ["red"])` — a second positional argument — is refused:
the one positional argument is `val`, everything else goes by name.

::: info The argument has to be on the wire
Only the browser shows whether it is. A test that plays the frontend's part by
hand and feeds the argument table itself simulates a browser that may never
send it. A method that composes view XML needs a browser test, not only a wire
test.
:::

## Where an event string goes

Anywhere UI5 takes an event handler:

```js
`<Button press="${client._event("SAVE")}"/>`
`<SearchField search="${client._event("SEARCH")}"/>`
`<List selectionChange="${client._event("PICK")}"/>`
```

The value you get back is a handler expression, not a plain name — embed it,
do not parse or compare it. Between `client._event(…)` and the end of `main` it
is in fact a placeholder token that is substituted for the real wire string on
the way out; embedding is what it is for.

Two more handlers go into view attributes the same way:

- **`client._event_nav_app_leave()`** leaves the app — a `Page`'s
  `navButtonPress`, with `showNavButton="${client.check_app_prev_stack()}"`.
  `main` needs no branch for it. See [Navigation](./navigation).
- **`client.follow_up_action({ val, t_arg })`** is a front-end action: `val` a
  `z2ui5_if_client.cs_event` constant. Embedded in a view attribute it runs in
  the browser, **with no roundtrip**; called on its own it runs when this
  roundtrip's answer lands.

```js
import { defineApp, z2ui5_if_client } from "@cap2ui5/cds-plugin";

// in the view: focus the search field, no roundtrip
`<Button text="Focus" press="${client.follow_up_action({
  val: z2ui5_if_client.cs_event.set_focus, t_arg: ["search"] })}"/>`

// in an event branch: set the browser tab's title with the answer
if (client.check_on_event("TITLE")) {
  client.follow_up_action({ val: z2ui5_if_client.cs_event.set_title, t_arg: [this.title] });
}
```

`client.cs_event.set_focus` is the same constant, as ABAP allows both.

## Dispatching

With more than a few events, a switch reads better than a chain:

```js
main(client) {
  switch (client.get_event()) {
    case "SEARCH": return this.search(client);
    case "ADD":    return this.add(client);
    case "":       break;                 // an app start
  }
  if (client.check_on_navigated()) client.view_display(/* … */);
}
```

Note that a handler often wants to fall through to the render branch rather than
`return` — after an event that changed the view's *structure* you render again.
Changed **bound data** needs no re-render; it is pushed on its own.

## Next

- [**Data Binding**](./data-binding) — `client._bind` and the types
- [**Popups & Toasts**](./popups) — `message_box_display`, `message_toast_display`, `popup_display`
- [**Navigation**](./navigation) — events that hand the screen to another app
- [**Client API**](../api/client) — every method with its parameters
