# List & Detail

A list with a selection-change event that reacts to a row selection. Shows the pattern for **table/list bindings** and how an item click is handled on the server side.

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
        { title: "row_01", descr: "Description 1", icon: "sap-icon://account", info: "completed",   selected: false },
        { title: "row_02", descr: "Description 2", icon: "sap-icon://account", info: "incompleted", selected: false },
        { title: "row_03", descr: "Description 3", icon: "sap-icon://account", info: "working",     selected: false },
        { title: "row_04", descr: "Description 4", icon: "sap-icon://account", info: "working",     selected: false },
        { title: "row_05", descr: "Description 5", icon: "sap-icon://account", info: "completed",   selected: false },
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
      client.message_box_display(`Details for: ${sel?.title ?? ""}`);

    } else if (client.check_on_event("ITEM_PRESS")) {
      // click on item — could navigate to a detail view
      client.message_toast_display("Item clicked");
    }
  }
}

module.exports = my_list;
```

## Important spots

### Bindings for aggregation slots

```js
.List({
  items: client._bind_edit(this.t_tab),
  ...
})
.StandardListItem({
  title: "{title}",   // ← path relative to the item
  description: "{descr}",
  selected: "{selected}",
});
```

`items` gets the top-level binding (`{/XX/t_tab}`). Inside `StandardListItem`, all paths are **relative to the item** — `{title}` refers to `t_tab[N].title`.

### `selectionChange` vs. `press`

- `selectionChange` fires in **selection mode** (SingleSelectMaster, MultiSelect). The `selected` property of items is updated two-way in the model, so on the server you can check via `find(row => row.selected)`.
- `press` fires on **item click** regardless of selection mode. Useful when you want an "open detail" click without a selection.

### Master-detail with navigation

Extension — navigate to the detail app on click:

```js
} else if (client.check_on_event("ITEM_PRESS")) {
  const sel = this.t_tab.find((r) => r.selected);
  if (sel) {
    const detail = new my_detail();
    detail.parent_id = sel.title;     // simple "params" pattern
    client.nav_app_call(detail);
  }
}
```

In `my_detail.js`:

```js
class my_detail extends z2ui5_if_app {

  parent_id = "";   // set by the caller
  payload   = null;

  async main(client) {
    if (client.check_on_init()) {
      this.payload = await this.load_payload(this.parent_id);
      this.render(client);
    }
  }
}
```

Because apps are **classes**, you simply pass parameters as fields. The caller sets them before `nav_app_call`, the callee reads them in `check_on_init`.

→ Continue with [**External OData**](./external-odata).
