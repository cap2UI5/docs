# Roadmap

Where cap2UI5 is, what is limited today, and what is intended. No dates.

::: tip How to read this
**Known limits today** is true of the current build. **What's next** is
intended, not promised. If a limit matters to your project, check the
[issues](https://github.com/cap2UI5/cap2UI5/issues) before you build around it.
:::

## What just changed

cap2UI5 stopped being a hand-written JavaScript port of abap2UI5 and became a
**CAP plugin that hosts abap2UI5's own runtime**. That retired the largest
limitation this page used to carry — and it retired the pipelines, the vendored
core and 82,804 lines of generated code with it. The reasoning and the
measurements are in [Where cap2UI5 Comes From](./where-it-comes-from).

## Known limits today

### The two packages are not on npm yet

`npm i cap2ui5` answers **404**, and so does `@abap2ui5/runtime`. Both are
published from a release that has not been cut. Until then the route is the
repository — see the box in the [Quickstart](./getting-started).

This is the single biggest gap, and the only work item between here and a
`npm i` that just works.

### The facade does not cover everything

`c` covers views, popups, nested views, navigation, messages, event arguments
and nested state. Everything else lives behind `c.raw`, which is the full
`z2ui5_if_client` — async, and under its original ABAP names. That is a real
escape hatch rather than a placeholder, but a method used often enough deserves
a facade member.

### The apps are JavaScript, and so are the errors

A mistyped field name throws at runtime, not at edit time. `c.bind("nmae")`
tells you the known fields, and an untypeable field is named in a warning — but
there is no type checking across your app, and the TypeScript story is
unwritten.

### UI5 comes from the CDN, and only from the CDN

The plugin serves the abap2UI5 shell, not UI5 itself: the page bootstraps from
`sdk.openui5.org`, and there is no local `/resources` route to fall back to. A
server without outbound internet access renders nothing until you host a UI5
distribution yourself and point `cfg.src` at it in a
[user exit](./user-exit#onpage). Shipping a local copy in the plugin is open.

The browser test follows the same road: it renders against the CDN, and where
there is none it answers the CDN's requests from a local `openui5-dist` — so a
control introduced after that fallback's release is covered by a CDN run and
not by a sandboxed one.

### The documentation is mid-migration

The plugin merged and this site is catching up. The entry points, the concept
guides, the reference and the examples describe the plugin. A handful of
background pages may still carry the port's mechanics; if a page contradicts
[Architecture](../reference/architecture), the architecture page is right.

## What's next

**Publish the packages.** `@abap2ui5/runtime` from upstream's release build,
then `cap2ui5`. Everything else is downstream of this.

**Pin the runtime by default.** Once it is on npm, `^X.Y.Z` instead of `*`, so
a project gets a known framework rather than the newest one.

**Grow the facade where use shows it is needed** — driven by real apps rather
than by completing a table.

**Finish this documentation**, including a page on writing an app against
`c.raw` when the facade does not reach.

## What is deliberately not planned

**A cap2UI5 view builder.** Views are UI5 XML strings; a template literal is
shorter and clearer than a fluent chain in JavaScript. abap2UI5's builder is in
the runtime and reachable through `c.raw` if you want it.

**A second implementation of anything upstream owns.** The whole point of the
current design is that there is one implementation of the framework. A feature
that belongs in abap2UI5 belongs upstream, where it also reaches every ABAP
user — the four seams and a bug fix went that way already.

## Next

- [**Where cap2UI5 Comes From**](./where-it-comes-from) — the change of strategy
- [**Architecture**](../reference/architecture) — what the plugin is and is not
