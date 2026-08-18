# List & Detail

A list with a selection-change event that reacts to a row selection. Shows the pattern for **table/list bindings** and how an item click is handled on the server side.

## Code

```js
// srv/app/my_list.js
const z2ui5_if_app              = require("abap2UI5/z2ui5_if_app");
const z2ui5_cl_ui5_view_builder = require("abap2UI5/z2ui5_cl_ui5_view_builder");

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

      const view = z2ui5_cl_ui5_view_builder.factory()
        .ele({ n: `View`, ns: `mvc` })
        .a({ n: `xmlns`,     v: `sap.m` })
        .a({ n: `xmlns:mvc`, v: `sap.ui.core.mvc` });

      const page = view.ele(`Shell`).ele(`Page`)
        .a({ n: `title`,          v: `abap2UI5 - List` })
        .a({ n: `navButtonPress`, v: client._event_nav_app_leave() })
        .a({ n: `showNavButton`,  b: client.check_app_prev_stack() });

      page.ele(`List`)
        .a({ n: `headerText`,      v: `Items` })
        .a({ n: `items`,           v: client._bind_edit(this.t_tab) })
        .a({ n: `mode`,            v: `SingleSelectMaster` })
        .a({ n: `selectionChange`, v: client._event(`SELCHANGE`) })
        .tag(`StandardListItem`)
        .a({ n: `title`,       v: `{TITLE}` })
        .a({ n: `description`, v: `{DESCR}` })
        .a({ n: `icon`,        v: `{ICON}` })
        .a({ n: `info`,        v: `{INFO}` })
        .a({ n: `press`,       v: client._event(`ITEM_PRESS`) })
        .a({ n: `selected`,    v: `{SELECTED}` });

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
page.ele(`List`)
  .a({ n: `items`, v: client._bind_edit(this.t_tab) })
  .tag(`StandardListItem`)
  .a({ n: `title`,       v: `{TITLE}` })   // ← path relative to the item
  .a({ n: `description`, v: `{DESCR}` })
  .a({ n: `selected`,    v: `{SELECTED}` });
```

`items` gets the top-level binding (`{/XX/T_TAB}`). Inside `StandardListItem`, all paths are **relative to the item** — `{TITLE}` refers to `t_tab[N].title`.

::: tip Why the uppercase paths
Model paths are uppercased on the way out (`this.t_tab` → `/XX/T_TAB`, the column `title` → `{TITLE}`) — the abap2UI5 wire format, where component names are ABAP identifiers. The write-back maps them onto your real, lowercase properties case-insensitively, so `this.t_tab[0].title` is what you read in `main()`. Write the relative paths uppercase and they will match.
:::

There is no `items` element in the chain: `items` is the default aggregation of `List`, so a child added with `.tag()` lands in it. An aggregation that is *not* the default one (a `Table`'s `columns`, a `Page`'s `footer`) is written out as an element of its own.

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
