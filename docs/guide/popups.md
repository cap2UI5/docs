# Popups & Toasts

Beyond the main view, a cap2UI5 app can fill four additional UI slots: **popup** (dialog), **popover**, **message toast**, and **message box**. There are also **nested views** (two levels) for master-detail layouts.

## Message toast

```js
client.message_toast_display("Data saved");
```

A short message that fades out automatically. Optionally with control parameters:

```js
client.message_toast_display("Save failed", {
  duration:                 5000,
  width:                    "20em",
  closeonbrowsernavigation: false,
  class:                    "myToast"
});
```

## Message box

```js
client.message_box_display("Really delete?", "warning", "Confirm delete");
```

Arguments in order: `text, type, title, styleclass, onclose, actions, emphasizedaction, initialfocus, textdirection, icon, details, closeonnavigation`.

Possible `type` values: `"information"`, `"success"`, `"warning"`, `"error"`, `"confirm"`.

With action buttons (e.g. confirm dialog):

```js
client.message_box_display(
  "Really delete?",
  "confirm",
  "Confirmation",
  "",                                        // styleclass
  client._event("DELETE_CONFIRMED"),         // onclose
  ["Yes", "No"],                             // actions
  "Yes"                                      // emphasizedaction
);
```

`onclose` is an event string — when the user clicks "Yes", the event comes back as a roundtrip and you can react in `client.check_on_event("DELETE_CONFIRMED")`.

## Popup (dialog)

A **popup** is a second view overlaid as a modal dialog. It is a *fragment*, not a view, so the root element is `core:FragmentDefinition` instead of `mvc:View` — everything else is the ordinary builder:

```js
const popup = z2ui5_cl_ui5_view_builder.factory()
  .ele({ n: `FragmentDefinition`, ns: `core` })
  .a({ n: `xmlns`,      v: `sap.m` })
  .a({ n: `xmlns:core`, v: `sap.ui.core` })
  .a({ n: `xmlns:form`, v: `sap.ui.layout.form` });

const dialog = popup.ele(`Dialog`)
  .a({ n: `title`,        v: `Edit User` })
  .a({ n: `afterClose`,   v: client._event(`CLOSE_DIALOG`) })
  .a({ n: `contentWidth`, v: `30em` });

dialog.ele({ n: `SimpleForm`, ns: `form` })
  .a({ n: `editable`, b: true })
  .ele({ n: `content`, ns: `form` })
  .tag(`Label`).a({ n: `text`, v: `Name` })
  .tag(`Input`).a({ n: `value`, v: client._bind_edit(this.user_name) })
  .tag(`Label`).a({ n: `text`, v: `Role` })
  .tag(`Input`).a({ n: `value`, v: client._bind_edit(this.user_role) });

dialog.ele(`endButton`).tag(`Button`)
  .a({ n: `text`,  v: `Save` })
  .a({ n: `type`,  v: `Emphasized` })
  .a({ n: `press`, v: client._event(`SAVE_USER`) });
dialog.ele(`beginButton`).tag(`Button`)
  .a({ n: `text`,  v: `Cancel` })
  .a({ n: `press`, v: client._event(`CANCEL_DIALOG`) });

client.popup_display(popup.stringify());
```

::: warning `stringify()` renders the whole tree, always
`stringify()` starts at the root of the tree, not at the node you call it on — `dialog.stringify()` and `popup.stringify()` produce the same string. Keep the root in a variable and hand *that* to `popup_display`, so the intent is visible.
:::

In subsequent roundtrips:

- `client.popup_close()` → closes the dialog (frontend action)
- `client.popup_destroy()` → marks it as destroyed (server side)
- `client.popup_model_update()` → sends only the model delta, not the entire view

## Popover

Very similar, but anchored to a UI5 control in the main view:

```js
client.popover_display(view.stringify(), "buttonId");
```

The second argument is the ID of a control in the main view next to which the popover appears. There is no convenience helper for a "please confirm" popover — build it like any other fragment:

```js
const popover = z2ui5_cl_ui5_view_builder.factory()
  .ele({ n: `FragmentDefinition`, ns: `core` })
  .a({ n: `xmlns`,      v: `sap.m` })
  .a({ n: `xmlns:core`, v: `sap.ui.core` });

popover.ele(`Popover`)
  .a({ n: `placement`, v: `Right` })
  .a({ n: `showHeader`, b: false })
  .tag(`Text`).a({ n: `text`, v: `Really save?` })
  .a({ n: `class`, v: `sapUiSmallMargin` })
  .tag(`Button`)
  .a({ n: `text`,  v: `Yes` })
  .a({ n: `type`,  v: `Emphasized` })
  .a({ n: `press`, v: client._event(`CONFIRM`) });

client.popover_display(popover.stringify(), "saveButtonId");
```

## Nested views

Some layouts have **two or three views side by side** — e.g. a classic master-detail setup. cap2UI5 supports this with `nest_view_display`:

```js
// 1. main view with two containers
client.view_display(masterView.stringify());

// 2. inject detail view into the right panel
client.nest_view_display(
  detailView.stringify(),
  "rightPanel",      // ID of the container control
  "addItem",         // method to insert (e.g. "addItem", "addContent", …)
  "removeAllItems"   // optional: method to clean up
);
```

There is a second level (`nest2_view_display`) if you need to nest deeper — e.g. a FlexibleColumnLayout with three columns.

`nest_view_destroy()` and `nest_view_model_update()` round it out.

## Overview of UI slots

| Slot | Display method | Update method | Destroy method |
|---|---|---|---|
| Main view | `view_display(xml)` | `view_model_update()` | `view_destroy()` |
| Nested 1   | `nest_view_display(xml, id, m_ins, m_dest)` | `nest_view_model_update()` | `nest_view_destroy()` |
| Nested 2   | `nest2_view_display(...)` | `nest2_view_model_update()` | `nest2_view_destroy()` |
| Popup      | `popup_display(xml)` | `popup_model_update()` | `popup_destroy()` |
| Popover    | `popover_display(xml, by_id)` | `popover_model_update()` | `popover_destroy()` |
| Toast      | `message_toast_display(text, opts?)` | – | – |
| Box        | `message_box_display(text, type, ...)` | – | – |

Multiple slots in one roundtrip are allowed — e.g. "update the toast AND update the popup model".

## Example: confirm pattern

```js
async main(client) {

  if (client.check_on_init()) this.render(client);

  if (client.check_on_event("DELETE")) {
    this.show_confirm_dialog(client);
  }

  if (client.check_on_event("DELETE_CONFIRMED")) {
    await this.do_delete();
    client.popup_close();
    client.message_toast_display("Deleted");
    this.render(client);
  }

  if (client.check_on_event("DELETE_CANCELLED")) {
    client.popup_close();
  }
}

show_confirm_dialog(client) {
  const popup = z2ui5_cl_ui5_view_builder.factory()
    .ele({ n: `FragmentDefinition`, ns: `core` })
    .a({ n: `xmlns`,      v: `sap.m` })
    .a({ n: `xmlns:core`, v: `sap.ui.core` });

  const dialog = popup.ele(`Dialog`)
    .a({ n: `title`,        v: `Confirmation` })
    .a({ n: `contentWidth`, v: `20em` });

  dialog.tag(`Text`).a({ n: `text`, v: `Really delete entry?` });
  dialog.ele(`endButton`).tag(`Button`)
    .a({ n: `text`,  v: `Delete` })
    .a({ n: `type`,  v: `Reject` })
    .a({ n: `press`, v: client._event(`DELETE_CONFIRMED`) });
  dialog.ele(`beginButton`).tag(`Button`)
    .a({ n: `text`,  v: `Cancel` })
    .a({ n: `press`, v: client._event(`DELETE_CANCELLED`) });

  client.popup_display(popup.stringify());
}
```

→ That wraps up the concepts section. Have a look at the [**examples**](../examples/hello-world) for end-to-end apps.
