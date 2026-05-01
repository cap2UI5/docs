# Selection Screen

A classic input mask with combobox, DatePicker, checkbox, switch — comparable to an ABAP `SELECTION-SCREEN`. Shows the pattern for **structured app fields** (`s_screen` as a container) and how you bind sub-paths _within_ a structure.

## Code

```js
// srv/samples/selection_screen.js
const z2ui5_if_app      = require("../z2ui5/02/z2ui5_if_app");
const z2ui5_cl_xml_view = require("../z2ui5/02/z2ui5_cl_xml_view");

class selection_screen extends z2ui5_if_app {

  s_screen = {
    check_is_active: false,
    colour:          "",
    combo_key:       "",
    segment_key:     "",
    date:            "",
    date_time:       "",
    time_start:      "",
    time_end:        "",
    check_switch_01: false,
    check_switch_02: false,
  };

  t_suggestions = [];
  t_combo       = [];

  async main(client) {

    if (client.check_on_init()) {
      this.on_init();
      this.render(client);
      return;
    }

    if (client.check_on_event()) {
      this.on_event(client);
      this.render(client);
    }
  }

  on_init() {
    this.s_screen = {
      check_is_active: true,
      colour:          "BLUE",
      combo_key:       "GRAY",
      segment_key:     "GREEN",
      date:            "2025-12-07",
      date_time:       "2025-12-23T19:27:20",
      time_start:      "05:24:00",
      time_end:        "17:23:57",
      check_switch_01: false,
      check_switch_02: false,
    };

    this.t_suggestions = [
      { descr: "Green", value: "GREEN" },
      { descr: "Blue",  value: "BLUE"  },
      { descr: "Black", value: "BLACK" },
      { descr: "Gray",  value: "GRAY"  },
    ];

    this.t_combo = [
      { key: "BLUE",  text: "blue"  },
      { key: "GREEN", text: "green" },
      { key: "BLACK", text: "black" },
      { key: "GRAY",  text: "gray"  },
    ];
  }

  on_event(client) {
    switch (client.get().EVENT) {
      case "BUTTON_SEND":
        client.message_box_display("Values sent to the server");
        break;
      case "BUTTON_CLEAR":
        for (const k of Object.keys(this.s_screen)) {
          this.s_screen[k] = typeof this.s_screen[k] === "boolean" ? false : "";
        }
        client.message_toast_display("View reset");
        break;
    }
  }

  render(client) {
    const view = z2ui5_cl_xml_view.factory();
    const page = view.Shell().Page({
      title:          "abap2UI5 - Selection Screen",
      navButtonPress: client._event_nav_app_leave(),
      showNavButton:  client.check_app_prev_stack(),
    });

    // 1) pull out the path to s_screen → manually build sub-paths
    const screenPath = client._bind_edit(this.s_screen, { path: true });
    const screen = (k) => `{${screenPath}/${k}}`;

    const grid = page.Grid({ defaultSpan: "L6 M12 S12" }).content();

    const sf1 = grid.SimpleForm({ title: "Input", editable: true }).content();
    sf1.Label({ text: "Color (with suggestions)" });
    sf1.Input({
      value:           screen("colour"),
      placeholder:     "Enter your favorite color",
      suggestionItems: client._bind(this.t_suggestions),
      showSuggestion:  true,
    }).get().suggestionItems().ListItem({ text: "{value}", additionalText: "{descr}" });

    const sf2 = grid.SimpleForm({ title: "Time Inputs", editable: true }).content();
    sf2.Label({ text: "Date" }).DatePicker({ value: screen("date") });
    sf2.Label({ text: "Date / Time" }).DateTimePicker({ value: screen("date_time") });
    sf2.Label({ text: "Time Start / End" });
    sf2.TimePicker({ value: screen("time_start") });
    sf2.TimePicker({ value: screen("time_end") });

    const content = page.Grid({ defaultSpan: "L12 M12 S12" })
      .content()
      .SimpleForm({ title: "Selection", editable: true })
      .content();

    content.Label({ text: "Active" });
    content.CheckBox({ selected: screen("check_is_active"), text: "Active", enabled: true });

    content.Label({ text: "Combo" });
    content.ComboBox({
      selectedKey: screen("combo_key"),
      items:       client._bind(this.t_combo),
    }).Item({ key: "{key}", text: "{text}" });

    content.Label({ text: "Segmented" });
    content.SegmentedButton({ selectedKey: screen("segment_key") })
      .items()
      .SegmentedButtonItem({ key: "BLUE",  icon: "sap-icon://accept",        text: "blue"  })
      .SegmentedButtonItem({ key: "GREEN", icon: "sap-icon://add-favorite",  text: "green" })
      .SegmentedButtonItem({ key: "BLACK", icon: "sap-icon://attachment",    text: "black" });

    content.Label({ text: "Switch 1" }).Switch({ state: screen("check_switch_01") });
    content.Label({ text: "Switch 2" }).Switch({ state: screen("check_switch_02") });

    const footer = page.footer().OverflowToolbar();
    footer.ToolbarSpacer();
    footer.Button({ text: "Clear", press: client._event("BUTTON_CLEAR"), type: "Reject", icon: "sap-icon://delete" });
    footer.Button({ text: "Send",  press: client._event("BUTTON_SEND"),  type: "Success" });

    client.view_display(view.stringify());
  }
}

module.exports = selection_screen;
```

## The sub-path pattern

The most important trick:

```js
const screenPath = client._bind_edit(this.s_screen, { path: true });
//                                                   ^^^^^^^^^^^
//                                                   "give me the bare path,
//                                                    not wrapped in {...}"

const screen = (k) => `{${screenPath}/${k}}`;
//             screen("colour") === "{/XX/s_screen/colour}"
```

`_bind_edit(this.s_screen)` returns the path to the entire structure object via reference equality. With `{ path: true }` you get it unwrapped — and can then append sub-paths yourself.

This saves you from **binding every sub-field individually** — a single lookup, many bindings.

## Two `BUTTON_*` events in a switch

In `on_event()` the pattern shows up when you have **many** events — a `switch` over `client.get().EVENT` is usually more readable than ten `if (check_on_event(...))` blocks.

→ Continue to [**List & Detail**](./list).
