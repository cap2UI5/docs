# Selection Screen

A classic input mask with combobox, DatePicker, checkbox, switch — comparable to an ABAP `SELECTION-SCREEN`. Shows the pattern for **structured app fields** (`s_screen` as a container) and how you bind sub-paths _within_ a structure.

## Code

```js
// srv/app/selection_screen.js
const z2ui5_if_app              = require("abap2UI5/z2ui5_if_app");
const z2ui5_cl_ui5_view_builder = require("abap2UI5/z2ui5_cl_ui5_view_builder");

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
    const view = z2ui5_cl_ui5_view_builder.factory()
      .ele({ n: `View`, ns: `mvc` })
      .a({ n: `xmlns`,      v: `sap.m` })
      .a({ n: `xmlns:mvc`,  v: `sap.ui.core.mvc` })
      .a({ n: `xmlns:core`, v: `sap.ui.core` })
      .a({ n: `xmlns:form`, v: `sap.ui.layout.form` })
      .a({ n: `xmlns:l`,    v: `sap.ui.layout` });

    const page = view.ele(`Shell`).ele(`Page`)
      .a({ n: `title`,          v: `abap2UI5 - Selection Screen` })
      .a({ n: `navButtonPress`, v: client._event_nav_app_leave() })
      .a({ n: `showNavButton`,  b: client.check_app_prev_stack() });

    // 1) pull out the path to s_screen → manually build sub-paths
    const screenPath = client._bind_edit(this.s_screen, { path: true });
    const screen = (k) => `{${screenPath}/${k.toUpperCase()}}`;

    const grid = page.ele({ n: `Grid`, ns: `l` })
      .a({ n: `defaultSpan`, v: `L6 M12 S12` })
      .ele({ n: `content`, ns: `l` });

    const sf1 = grid.ele({ n: `SimpleForm`, ns: `form` })
      .a({ n: `title`,    v: `Input` })
      .a({ n: `editable`, b: true })
      .ele({ n: `content`, ns: `form` });

    sf1.tag(`Label`).a({ n: `text`, v: `Color (with suggestions)` });
    sf1.ele(`Input`)
      .a({ n: `value`,           v: screen(`colour`) })
      .a({ n: `placeholder`,     v: `Enter your favorite color` })
      .a({ n: `suggestionItems`, v: client._bind(this.t_suggestions) })
      .a({ n: `showSuggestion`,  b: true })
      .ele(`suggestionItems`)
      .tag({ n: `ListItem`, ns: `core` })
      .a({ n: `text`,           v: `{VALUE}` })
      .a({ n: `additionalText`, v: `{DESCR}` });

    const sf2 = grid.ele({ n: `SimpleForm`, ns: `form` })
      .a({ n: `title`,    v: `Time Inputs` })
      .a({ n: `editable`, b: true })
      .ele({ n: `content`, ns: `form` });

    sf2.tag(`Label`).a({ n: `text`, v: `Date` })
      .tag(`DatePicker`).a({ n: `value`, v: screen(`date`) })
      .tag(`Label`).a({ n: `text`, v: `Date / Time` })
      .tag(`DateTimePicker`).a({ n: `value`, v: screen(`date_time`) })
      .tag(`Label`).a({ n: `text`, v: `Time Start / End` })
      .tag(`TimePicker`).a({ n: `value`, v: screen(`time_start`) })
      .tag(`TimePicker`).a({ n: `value`, v: screen(`time_end`) });

    const content = page.ele({ n: `Grid`, ns: `l` })
      .a({ n: `defaultSpan`, v: `L12 M12 S12` })
      .ele({ n: `content`, ns: `l` })
      .ele({ n: `SimpleForm`, ns: `form` })
      .a({ n: `title`,    v: `Selection` })
      .a({ n: `editable`, b: true })
      .ele({ n: `content`, ns: `form` });

    content.tag(`Label`).a({ n: `text`, v: `Active` })
      .tag(`CheckBox`)
      .a({ n: `selected`, v: screen(`check_is_active`) })
      .a({ n: `text`,     v: `Active` })
      .a({ n: `enabled`,  b: true });

    content.tag(`Label`).a({ n: `text`, v: `Combo` });
    content.ele(`ComboBox`)
      .a({ n: `selectedKey`, v: screen(`combo_key`) })
      .a({ n: `items`,       v: client._bind(this.t_combo) })
      .tag({ n: `Item`, ns: `core` })
      .a({ n: `key`,  v: `{KEY}` })
      .a({ n: `text`, v: `{TEXT}` });

    content.tag(`Label`).a({ n: `text`, v: `Segmented` });
    const seg = content.ele(`SegmentedButton`)
      .a({ n: `selectedKey`, v: screen(`segment_key`) });
    seg.tag(`SegmentedButtonItem`)
      .a({ n: `key`, v: `BLUE` }).a({ n: `icon`, v: `sap-icon://accept` }).a({ n: `text`, v: `blue` })
      .tag(`SegmentedButtonItem`)
      .a({ n: `key`, v: `GREEN` }).a({ n: `icon`, v: `sap-icon://add-favorite` }).a({ n: `text`, v: `green` })
      .tag(`SegmentedButtonItem`)
      .a({ n: `key`, v: `BLACK` }).a({ n: `icon`, v: `sap-icon://attachment` }).a({ n: `text`, v: `black` });

    content.tag(`Label`).a({ n: `text`, v: `Switch 1` })
      .tag(`Switch`).a({ n: `state`, v: screen(`check_switch_01`) })
      .tag(`Label`).a({ n: `text`, v: `Switch 2` })
      .tag(`Switch`).a({ n: `state`, v: screen(`check_switch_02`) });

    const footer = page.ele(`footer`).ele(`OverflowToolbar`);
    footer.tag(`ToolbarSpacer`);
    footer.tag(`Button`)
      .a({ n: `text`,  v: `Clear` })
      .a({ n: `press`, v: client._event(`BUTTON_CLEAR`) })
      .a({ n: `type`,  v: `Reject` })
      .a({ n: `icon`,  v: `sap-icon://delete` });
    footer.tag(`Button`)
      .a({ n: `text`,  v: `Send` })
      .a({ n: `press`, v: client._event(`BUTTON_SEND`) })
      .a({ n: `type`,  v: `Success` });

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

const screen = (k) => `{${screenPath}/${k.toUpperCase()}}`;
//             screen("colour") === "{/XX/S_SCREEN/COLOUR}"
```

`_bind_edit(this.s_screen)` returns the path to the entire structure object via reference equality. With `{ path: true }` you get it unwrapped — and can then append sub-paths yourself. The sub-path is uppercased because model paths are: the framework writes `s_screen` into the model as `S_SCREEN` and maps the delta back onto your lowercase property when the roundtrip returns.

This saves you from **binding every sub-field individually** — a single lookup, many bindings.

## Two `BUTTON_*` events in a switch

In `on_event()` the pattern shows up when you have **many** events — a `switch` over `client.get().EVENT` is usually more readable than ten `if (check_on_event(...))` blocks.

→ Continue to [**List & Detail**](./list).
