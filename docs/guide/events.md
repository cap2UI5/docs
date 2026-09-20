# Events

`c.event("NAME")` produces the wire string a control's event attribute needs.
The next roundtrip answers with `c.eventName === "NAME"`.

```js
defineApp("ZCL_HELLO", class {
  name  = "";
  count = 0;

  main(c) {
    if (c.isDisplay) {
      c.view(
        `<Input value="${c.bind("name")}"/>` +
        `<Button text="Go" press="${c.event("GO")}"/>`);
      return;
    }

    if (c.eventName === "GO") {
      this.count++;
      c.messageToast(`Hello ${this.name}, click ${this.count}`);
    }
  }
});
```

`c.eventName` is `""` on an app start, so `if (c.eventName === "GO")` is safe
without a guard.

## Arguments — how two buttons share one event

A handler cannot know which control fired unless the wire carries it. That is
what the second parameter is for:

```js
c.view(
  `<Button text="red"  press="${c.event("TAKE", ["red"])}"/>` +
  `<Button text="blue" press="${c.event("TAKE", ["blue"])}"/>`);

// next roundtrip
if (c.eventName === "TAKE") {
  this.colour = c.eventArg(1);        // "red" or "blue"
}
```

`c.eventArg(i)` is **1-based**, like the ABAP table it reads. The first eight
arguments are resolved up front; `c.eventArg(9)` throws and tells you to use
`c.raw` for a longer list.

::: info This was missing, and the wire tests could not see it
`c.event` took no arguments for a while, and the test suite was green: the wire
tests play the frontend's part by hand and had been feeding the argument table
themselves — simulating a browser that would never have sent it. The **browser**
test found it. A facade method that composes view XML needs a browser test, not
only a wire test.
:::

## Where an event string goes

Anywhere UI5 takes an event handler:

```js
`<Button press="${c.event("SAVE")}"/>`
`<SearchField search="${c.event("SEARCH")}"/>`
`<List selectionChange="${c.event("PICK")}"/>`
```

The value you get back is a handler expression, not a plain name — embed it,
do not parse or compare it. Between `c.event(…)` and the end of `main` it is in
fact a placeholder token that is substituted for the real wire string on the
way out; embedding is what it is for.

## Dispatching

With more than a few events, a switch reads better than a chain:

```js
main(c) {
  switch (c.eventName) {
    case "SEARCH": return this.search(c);
    case "ADD":    return this.add(c);
    case "":       break;                 // an app start
  }
  if (c.isDisplay) c.view(/* … */);
}
```

Note that a handler often wants to fall through to the render branch rather than
`return` — after an event that changed the view's *structure* you render again.
Changed **bound data** needs no re-render; it is pushed on its own.

## Next

- [**Data Binding**](./data-binding) — `c.bind` and the types
- [**Popups & Toasts**](./popups) — `messageBox`, `messageToast`, `popup`
- [**Navigation**](./navigation) — events that hand the screen to another app
