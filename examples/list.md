# List & Detail

Eine Liste mit Selection-Change-Event, die bei einer Zeilen-Auswahl reagiert. Zeigt das Pattern für **Tabellen-/List-Bindings** und wie ein Item-Click serverseitig verarbeitet wird.

## Code

```js
// srv/samples/my_list.js
const z2ui5_if_app      = require("../z2ui5/02/z2ui5_if_app");
const z2ui5_cl_xml_view = require("../z2ui5/02/z2ui5_cl_xml_view");

class my_list extends z2ui5_if_app {

  t_tab = [];

  async main(client) {

    if (client.check_on_init()) {

      this.t_tab = [
        { title: "row_01", descr: "Beschreibung 1", icon: "sap-icon://account", info: "completed",   selected: false },
        { title: "row_02", descr: "Beschreibung 2", icon: "sap-icon://account", info: "incompleted", selected: false },
        { title: "row_03", descr: "Beschreibung 3", icon: "sap-icon://account", info: "working",     selected: false },
        { title: "row_04", descr: "Beschreibung 4", icon: "sap-icon://account", info: "working",     selected: false },
        { title: "row_05", descr: "Beschreibung 5", icon: "sap-icon://account", info: "completed",   selected: false },
      ];

      const view = z2ui5_cl_xml_view.factory();
      const page = view.Shell().Page({
        title:          "abap2UI5 - List",
        navButtonPress: client._event_nav_app_leave(),
        showNavButton:  client.check_app_prev_stack(),
      });

      page.List({
        headerText:      "Items",
        items:           client._bind_edit(this.t_tab),
        mode:            "SingleSelectMaster",
        selectionChange: client._event("SELCHANGE"),
      })
        .StandardListItem({
          title:       "{title}",
          description: "{descr}",
          icon:        "{icon}",
          info:        "{info}",
          press:       client._event("ITEM_PRESS"),
          selected:    "{selected}",
        });

      client.view_display(view.stringify());

    } else if (client.check_on_event("SELCHANGE")) {
      const sel = this.t_tab.find((row) => row.selected);
      client.message_box_display(`Details für: ${sel?.title ?? ""}`);

    } else if (client.check_on_event("ITEM_PRESS")) {
      // Click auf Item — könnte zur Detail-View navigieren
      client.message_toast_display("Item geklickt");
    }
  }
}

module.exports = my_list;
```

## Wichtige Stellen

### Bindings für Aggregations-Slots

```js
.List({
  items: client._bind_edit(this.t_tab),
  ...
})
.StandardListItem({
  title: "{title}",   // ← relativer Pfad zum Item
  description: "{descr}",
  selected: "{selected}",
});
```

`items` bekommt das Top-Level-Binding (`{/XX/t_tab}`). Innerhalb des `StandardListItem` sind alle Pfade **relativ zum Item** — `{title}` zeigt auf `t_tab[N].title`.

### `selectionChange` vs. `press`

- `selectionChange` feuert bei **Selection-Mode** (SingleSelectMaster, MultiSelect). Die `selected`-Property der Items wird per Two-way im Modell upgedated, also kannst du serverseitig per `find(row => row.selected)` nachschauen.
- `press` feuert beim **Klick auf das Item** unabhängig vom Selection-Mode. Praktisch, wenn du einen "Open Detail"-Click ohne Selection willst.

### Master-Detail mit Navigation

Erweiterung — bei Klick zur Detail-App navigieren:

```js
} else if (client.check_on_event("ITEM_PRESS")) {
  const sel = this.t_tab.find((r) => r.selected);
  if (sel) {
    const detail = new my_detail();
    detail.parent_id = sel.title;     // einfaches "params"-Pattern
    client.nav_app_call(detail);
  }
}
```

In `my_detail.js`:

```js
class my_detail extends z2ui5_if_app {

  parent_id = "";   // wird vom Caller gesetzt
  payload   = null;

  async main(client) {
    if (client.check_on_init()) {
      this.payload = await this.load_payload(this.parent_id);
      this.render(client);
    }
  }
}
```

Da Apps **Klassen** sind, gibst du Parameter einfach als Felder mit. Der Caller setzt sie vor `nav_app_call`, der Callee liest sie in `check_on_init`.

→ Weiter mit [**External OData**](./external-odata).
