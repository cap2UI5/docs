# Popups & Toasts

Four ways to put something on the screen that is not the main view.

## Messages

```js
c.messageToast("saved");                 // transient, bottom of the screen
c.messageBox("Hello " + this.name);      // a dialog with an OK button
```

Both are recorded and replayed in the order you wrote them, so two toasts arrive
in that order.

## A popup — a fragment on top of the view

```js
if (c.eventName === "HELP") {
  c.popup(
    `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m">` +
    `<Dialog title="Help">` +
    `<Text text="Choose picks a colour."/>` +
    `<beginButton><Button text="Close" press="${c.event("HELP_CLOSE")}"/></beginButton>` +
    `</Dialog></core:FragmentDefinition>`);
  return;
}

if (c.eventName === "HELP_CLOSE") {
  c.popupClose();
  return;
}
```

A popup is a **`FragmentDefinition`**, not an `mvc:View` — that is the shape UI5
expects here. It shares the main view's model, so `c.bind()` and `c.event()`
work inside it exactly as they do outside.

Close it with `c.popupClose()`. Changed bound data is pushed into an open popup
automatically; you do not re-render it to refresh a value.

## A nested view — a fragment INSIDE the main view

For a region of the page that changes while the rest stays put:

```js
c.view(
  `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m">` +
  `<Shell><Page title="pick">` +
  `<Button text="Detail" press="${c.event("DETAIL")}"/>` +
  `<VBox id="slot"/>` +                                   // ← the receiving control
  `</Page></Shell></mvc:View>`);

// later
if (c.eventName === "DETAIL") {
  c.nest("slot",
    `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m">` +
    `<VBox><Text text="chosen: ${c.bind("chosen")}"/>` +
    `<Button text="Hide" press="${c.event("DETAIL_HIDE")}"/></VBox></mvc:View>`);
  return;
}

if (c.eventName === "DETAIL_HIDE") c.nestClose();
```

The main view stays as it is; only the fragment re-renders on the next `nest`.

`c.nest(into, xml, opts)` takes the receiving control's `id`, and `opts` names
the UI5 mutators for its aggregation:

| | default | when to change it |
|---|---|---|
| `insert` | `addContent` | `addItem` for a `List`, etc. |
| `clear` | `removeAllContent` | `removeAllItems` for a `List` |

**Without `clear`, every call adds one more fragment.** The defaults fit a
`Page` or a `VBox`.

There is exactly **one** nested slot, and `c.nestClose()` takes no argument: it
clears that slot rather than a named one.

## Which one do I want?

| | |
|---|---|
| a short confirmation | `messageToast` |
| something the user must acknowledge | `messageBox` |
| a modal that takes input or a decision | `popup` |
| a region of the page that updates independently | `nest` |
| a whole second screen with its own state | [navigation](./navigation) — a separate app |

## Next

- [**Navigation**](./navigation) — when a popup is really another app
- [**Events**](./events) — the handlers the buttons above use
