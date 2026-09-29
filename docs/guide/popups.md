# Popups & Toasts

Five ways to put something on the screen that is not the main view.

## Messages

```js
client.message_toast_display("saved");                 // transient, bottom of the screen
client.message_box_display("Hello " + this.name);      // a dialog with an OK button
```

Both are recorded and replayed in the order you wrote them, so two toasts arrive
in that order. Their other parameters go by name, in one object with the ABAP
names:

```js
client.message_box_display({ text: "Delete it?", type: "confirm", actions: ["DELETE", "CANCEL"],
  emphasizedaction: "DELETE", onclose: "BOX_CLOSED" });
client.message_toast_display({ text: "saved", duration: 5000 });
```

`text` may be data — an object or an array is laid out as abap2UI5 lays out an
ABAP structure or table.

## A popup — a fragment on top of the view

```js
if (client.check_on_event("HELP")) {
  client.popup_display(
    `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m">` +
    `<Dialog title="Help">` +
    `<Text text="Choose picks a colour."/>` +
    `<beginButton><Button text="Close" press="${client._event("HELP_CLOSE")}"/></beginButton>` +
    `</Dialog></core:FragmentDefinition>`);
  return;
}

if (client.check_on_event("HELP_CLOSE")) {
  client.popup_destroy();
  return;
}
```

A popup is a **`FragmentDefinition`**, not an `mvc:View` — that is the shape UI5
expects here. It shares the main view's model, so `client._bind()` and
`client._event()` work inside it exactly as they do outside.

Close it with `client.popup_destroy()`. Changed bound data is pushed into an
open popup automatically; you do not re-render it to refresh a value.

## A popover — a fragment anchored to a control

```js
if (client.check_on_event("POPOVER")) {
  client.popover_display({
    xml: `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m">` +
      `<Popover title="More" placement="Bottom"><Text text="the popover"/>` +
      `<footer><Toolbar><Button text="Close" press="${client._event("POPOVER_CLOSE")}"/></Toolbar></footer>` +
      `</Popover></core:FragmentDefinition>`,
    by_id: "more",                                   // the id of a control in the main view
  });
  return;
}

if (client.check_on_event("POPOVER_CLOSE")) client.popover_destroy();
```

`by_id` names the control it opens at — here `<Button id="more" … />`.

## A nested view — a view INSIDE the main view

For a region of the page that changes while the rest stays put:

```js
client.view_display(
  `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m">` +
  `<Shell><Page title="pick">` +
  `<Button text="Detail" press="${client._event("DETAIL")}"/>` +
  `<VBox id="slot"/>` +                                   // ← the receiving control
  `</Page></Shell></mvc:View>`);

// later
if (client.check_on_event("DETAIL")) {
  client.nest_view_display({
    val: `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m">` +
      `<VBox><Text text="chosen: ${client._bind("chosen")}"/>` +
      `<Button text="Hide" press="${client._event("DETAIL_HIDE")}"/></VBox></mvc:View>`,
    id: "slot",
    method_insert: "addContent",
    method_destroy: "removeAllContent",
  });
  return;
}

if (client.check_on_event("DETAIL_HIDE")) client.nest_view_destroy();
```

The main view stays as it is; only the nested view re-renders on the next
`nest_view_display`.

`id` is the receiving control's `id`, and the other two parameters name the UI5
mutators for its aggregation — there are no defaults:

| | required | for a `Page` or `VBox` | for a `List` |
|---|---|---|---|
| `method_insert` | yes | `addContent` | `addItem` |
| `method_destroy` | no | `removeAllContent` | `removeAllItems` |

**Without `method_destroy`, nothing is cleared first, and every call adds one
more view.**

There are **two** nested slots: `nest2_view_display({ val, id, method_insert,
method_destroy })` and `nest2_view_destroy()` are the second, with the same
contract. Each `*_destroy()` takes no argument: it clears its slot.

## Which one do I want?

| | |
|---|---|
| a short confirmation | `message_toast_display` |
| something the user must acknowledge | `message_box_display` |
| a modal that takes input or a decision | `popup_display` |
| a few details next to the control that asked | `popover_display` |
| a region of the page that updates independently | `nest_view_display` |
| a whole second screen with its own state | [navigation](./navigation) — a separate app |

## Next

- [**Navigation**](./navigation) — when a popup is really another app
- [**Events**](./events) — the handlers the buttons above use
- [**Client API**](../api/client) — every parameter of these methods
