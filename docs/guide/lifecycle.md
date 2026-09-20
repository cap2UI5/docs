# App Lifecycle

An app is a class. Each roundtrip rebuilds an instance of it from the draft,
applies what the browser sent, and calls `main(c)` exactly once.

```js
const { defineApp } = require("cap2ui5");

defineApp("ZCL_HELLO", class {
  name = "";

  main(c) {
    // called on EVERY roundtrip — the branches below decide what happens
  }
});
```

`main` is **synchronous**. Make it `async` only when your app does I/O; the
framework calls need no `await` either way.

## The two predicates, and the one that trips people

```js
main(c) {
  if (c.isFirstRun) {
    // the first roundtrip of THIS app instance, and only that one.
    // Seed state here.
  }

  if (c.isDisplay) {
    // the first roundtrip AND every time this app gets the screen back:
    // a called app leaving, a value help closing, a bookmark restored.
    // RENDER here.
    c.view(/* … */);
    return;
  }

  if (c.eventName === "GO") { /* … */ }
}
```

::: danger Render on `isDisplay`, not on `isFirstRun`
`isFirstRun` implies `isDisplay`, so `if (c.isDisplay)` is the whole display
condition — no `||`.

An app that renders only on `isFirstRun` works perfectly until something
navigates back into it, and then **leaves the previous screen standing with no
error anywhere**. Nothing throws, nothing logs, the user just sees the wrong
page. It is the framework's most common app bug, and `z2ui5_if_client`'s own
documentation says so.
:::

Underneath they are `check_on_init()` and `check_on_navigated()`. The facade
renames them because the original names suggest the opposite of what they do —
`check_on_navigated` reads like "arrived by navigation" and is in fact also true
on the very first run.

## The full surface

Everything `c` offers, which is everything an app needs before reaching for
`c.raw`:

| | |
|---|---|
| **lifecycle** | `isFirstRun`, `isDisplay`, `canGoBack`, `eventName`, `eventArg(i)`, `prevApp` |
| **binding** | `bind(field)`, `event(name, [args])` |
| **screen** | `view(xml)`, `popup(xml)` / `popupClose()`, `nest(into, xml, opts)` / `nestClose()` |
| **messages** | `messageBox(text)`, `messageToast(text)` |
| **navigation** | `navTo(app)`, `navBack({event, data, app})` |
| **escape hatch** | `raw` — the underlying async client |

## A typical app

```js
defineApp("ZCL_ORDER", class {
  customer = "";
  lines    = t.table({ sku: "", qty: 0 });
  loaded   = false;

  async main(c) {
    if (c.isFirstRun) {
      this.customer = c.raw ? "" : "";      // seed once
    }

    if (c.eventName === "LOAD") {
      const { Orders } = cds.entities("my.shop");
      this.lines = await SELECT.from(Orders);
      this.loaded = true;
    }

    if (c.isDisplay || c.eventName === "LOAD") {
      c.view(/* … */);
    }
  }
});
```

Note the last branch: after an event that changed what is on screen you render
again. Changed **bound data** is pushed on its own — you only re-render when the
view's *structure* changes.

## Two members that used to exist and now throw

Both throw an error naming the replacement rather than quietly changing meaning:

| gone | why |
|---|---|
| `c.isInitial` | it was wired to `check_on_navigated()` and named after `check_on_init()`. Use `c.isDisplay` to render, `c.isFirstRun` to seed |
| `c.modelUpdate()` | it called `view_model_update()`, which the framework declares **obsolete and does nothing**. Changed bound data is pushed automatically — to an open popup and a nested view too |

## Next

- [**Data Binding**](./data-binding) — `c.bind`, tables, structures
- [**Events**](./events) — `c.event`, arguments, `c.eventName`
- [**Navigation**](./navigation) — `navTo`, `navBack`, `prevApp`
- [**Persistence**](./persistence) — why the instance survives at all
