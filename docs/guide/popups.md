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

A **popup** is a second XML view overlaid as a modal dialog. You build it with `factory_popup()`:

```js
const dialog = z2ui5_cl_xml_view.factory_popup()
  .Dialog({
    title:        "Edit User",
    afterClose:   client._event("CLOSE_DIALOG"),
    contentWidth: "30em",
  });

dialog.content()
  .SimpleForm({ editable: true })
    .content()
      .Label({ text: "Name" })
      .Input({ value: client._bind_edit(this.user_name) })
      .Label({ text: "Role" })
      .Input({ value: client._bind_edit(this.user_role) });

dialog.endButton()
  .Button({ text: "Save",   type: "Emphasized", press: client._event("SAVE_USER") });
dialog.beginButton()
  .Button({ text: "Cancel", press: client._event("CANCEL_DIALOG") });

client.popup_display(dialog.stringify());
```

In subsequent roundtrips:

- `client.popup_close()` → closes the dialog (frontend action)
- `client.popup_destroy()` → marks it as destroyed (server side)
- `client.popup_model_update()` → sends only the model delta, not the entire view

## Popover

Very similar, but anchored to a UI5 control in the main view:

```js
client.popover_display(view.stringify(), "buttonId");
```

The `OPEN_BY_ID` is the ID of a control in the main view next to which the popover appears. The builder even has a convenience helper for this:

```js
view._z2ui5().approve_popover({
  placement: "Right",
  text:      "Really save?",
  btn_type:  "Emphasized",
  btn_txt:   "Yes",
  btn_event: client._event("CONFIRM"),
});
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
  const view = z2ui5_cl_xml_view.factory_popup();
  view.Dialog({ title: "Confirmation", contentWidth: "20em" })
    .content()
      .Text({ text: "Really delete entry?" });
  view.endButton().Button({ text: "Delete", type: "Reject",  press: client._event("DELETE_CONFIRMED") });
  view.beginButton().Button({ text: "Cancel",                press: client._event("DELETE_CANCELLED") });
  client.popup_display(view.stringify());
}
```

→ That wraps up the concepts section. Have a look at the [**examples**](../examples/hello-world) for end-to-end apps.
