# Popups & Toasts

Neben der Haupt-View kann eine cap2UI5-App vier weitere UI-Slots befüllen: **Popup** (Dialog), **Popover**, **Message-Toast** und **Message-Box**. Außerdem gibt es **Nested Views** (zwei Levels) für Master-Detail-Layouts.

## Message Toast

```js
client.message_toast_display("Daten gespeichert");
```

Eine kurze Nachricht, die sich automatisch ausblendet. Optional mit Steuerparametern:

```js
client.message_toast_display("Speichern fehlgeschlagen", {
  duration:                 5000,
  width:                    "20em",
  closeonbrowsernavigation: false,
  class:                    "myToast"
});
```

## Message Box

```js
client.message_box_display("Wirklich löschen?", "warning", "Löschen bestätigen");
```

Argumente in Reihenfolge: `text, type, title, styleclass, onclose, actions, emphasizedaction, initialfocus, textdirection, icon, details, closeonnavigation`.

Mögliche `type`-Werte: `"information"`, `"success"`, `"warning"`, `"error"`, `"confirm"`.

Mit Action-Buttons (z.B. Confirm-Dialog):

```js
client.message_box_display(
  "Wirklich löschen?",
  "confirm",
  "Bestätigung",
  "",                                        // styleclass
  client._event("DELETE_CONFIRMED"),         // onclose
  ["Yes", "No"],                             // actions
  "Yes"                                      // emphasizedaction
);
```

`onclose` ist ein Event-String — wenn der User "Yes" klickt, kommt das Event als Roundtrip zurück und du kannst in `client.check_on_event("DELETE_CONFIRMED")` reagieren.

## Popup (Dialog)

Ein **Popup** ist eine zweite XML-View, die als modal Dialog überlagert wird. Du baust sie mit `factory_popup()`:

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

In Folge-Roundtrips:

- `client.popup_close()` → schließt den Dialog (Frontend-Action)
- `client.popup_destroy()` → markiert ihn als zerstört (Server-Side)
- `client.popup_model_update()` → schickt nur das Modell-Delta, nicht die ganze View

## Popover

Sehr ähnlich, aber an ein UI5-Control im Hauptview verankert:

```js
client.popover_display(view.stringify(), "buttonId");
```

Das `OPEN_BY_ID` ist die ID eines Controls in der Hauptview, neben dem das Popover erscheint. Der Builder hat dafür sogar einen Komfort-Helper:

```js
view._z2ui5().approve_popover({
  placement: "Right",
  text:      "Wirklich speichern?",
  btn_type:  "Emphasized",
  btn_txt:   "Yes",
  btn_event: client._event("CONFIRM"),
});
```

## Nested Views

Manche Layouts haben **zwei oder drei Views nebeneinander** — z.B. ein klassischer Master-Detail-Aufbau. cap2UI5 unterstützt das mit `nest_view_display`:

```js
// 1. Hauptview mit zwei Containern
client.view_display(masterView.stringify());

// 2. Detail-View ins rechte Panel injecten
client.nest_view_display(
  detailView.stringify(),
  "rightPanel",      // ID des Container-Controls
  "addItem",         // Methode zum Einfügen (z.B. "addItem", "addContent", …)
  "removeAllItems"   // optional: Methode zum Aufräumen
);
```

Es gibt einen zweiten Level (`nest2_view_display`), falls du noch tiefer schachteln willst — z.B. ein FlexibleColumnLayout mit drei Spalten.

`nest_view_destroy()` und `nest_view_model_update()` runden das ab.

## Übersicht der UI-Slots

| Slot | Display-Methode | Update-Methode | Destroy-Methode |
|---|---|---|---|
| Haupt-View | `view_display(xml)` | `view_model_update()` | `view_destroy()` |
| Nested 1   | `nest_view_display(xml, id, m_ins, m_dest)` | `nest_view_model_update()` | `nest_view_destroy()` |
| Nested 2   | `nest2_view_display(...)` | `nest2_view_model_update()` | `nest2_view_destroy()` |
| Popup      | `popup_display(xml)` | `popup_model_update()` | `popup_destroy()` |
| Popover    | `popover_display(xml, by_id)` | `popover_model_update()` | `popover_destroy()` |
| Toast      | `message_toast_display(text, opts?)` | – | – |
| Box        | `message_box_display(text, type, ...)` | – | – |

Mehrere Slots in einem Roundtrip sind erlaubt — z.B. "Update den Toast UND aktualisiere das Popup-Modell".

## Beispiel: Confirm-Pattern

```js
async main(client) {

  if (client.check_on_init()) this.render(client);

  if (client.check_on_event("DELETE")) {
    this.show_confirm_dialog(client);
  }

  if (client.check_on_event("DELETE_CONFIRMED")) {
    await this.do_delete();
    client.popup_close();
    client.message_toast_display("Gelöscht");
    this.render(client);
  }

  if (client.check_on_event("DELETE_CANCELLED")) {
    client.popup_close();
  }
}

show_confirm_dialog(client) {
  const view = z2ui5_cl_xml_view.factory_popup();
  view.Dialog({ title: "Bestätigung", contentWidth: "20em" })
    .content()
      .Text({ text: "Eintrag wirklich löschen?" });
  view.endButton().Button({ text: "Löschen", type: "Reject",  press: client._event("DELETE_CONFIRMED") });
  view.beginButton().Button({ text: "Abbruch",                press: client._event("DELETE_CANCELLED") });
  client.popup_display(view.stringify());
}
```

→ Damit ist der Konzept-Teil durch. Schau in die [**Beispiele**](../examples/hello-world) für End-to-End-Apps.
