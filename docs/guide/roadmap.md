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

Since then the JavaScript side closed its own gaps. 0.2.0 made the client an
app receives abap2UI5's `z2ui5_if_client`, every method under its ABAP name,
exported `z2ui5_cl_ui5_view_builder` and shipped TypeScript declarations;
0.3.0 added `npx --no-install cap2ui5 abap2js`, which translates an abap2UI5
app class into a cap2UI5 app line for line, and apps that come from a package —
[`@cap2ui5/samples`](https://github.com/cap2UI5/samples) is 71 of abap2UI5's
samples that way. 0.4.0 sends the browser only the fields an app binds, gzips
the page and the roundtrips, and hosts runtime 1.146.0, whose frontend does the
approuter's CSRF token handshake and whose accelerations make a table of
thousands of rows usable. The details are in the plugin's
[CHANGELOG](https://github.com/cap2UI5/cap2UI5/blob/main/plugin/CHANGELOG.md).

## Known limits today

### Not yet run on BTP

Behind an approuter, the route `cds add approuter` generates should work as it
is since 0.4.0: the frontend in runtime 1.146.0 does the `X-CSRF-Token`
handshake the approuter asks for. That is read from both sides' code, not yet
run end to end against XSUAA or IAS — see
[Deployment](../reference/deployment#the-approuter-and-its-csrf-token).

### The apps are JavaScript, and so are the errors

A mistyped field name throws at runtime, not at edit time:
`client._bind("nmae")` names the app's known fields, and an untypeable field
is named in a warning. The package ships TypeScript declarations, so an
annotated client —
`/** @param {import("@cap2ui5/cds-plugin").Client<{ name: string }>} client */`
— gets completion and checked field names in the editor; nothing checks an
unannotated app.

### `abap2js` translates part of ABAP

`npx --no-install cap2ui5 abap2js` knows the ABAP an abap2UI5 app is written
in and refuses the rest — a field-symbol, `SELECT`, a `sy-` field — with file,
row and column. What it refuses you translate by hand. Of abap2UI5's 129
samples, it translates 69 today.

### UI5 comes from the CDN, and only from the CDN

The page embeds the abap2UI5 frontend, not UI5 itself: it bootstraps from
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

**Teach `abap2js` more ABAP.** Some of its refusals say "not supported yet".

**Finish this documentation.**

## What is deliberately not planned

**A view builder of cap2UI5's own.** The builder a JavaScript app uses is
abap2UI5's `z2ui5_cl_ui5_view_builder`, rendered by the transpiled class in
the runtime — see [The view builder](./views#the-view-builder). A UI5 XML
string in a template literal works as well.

**A second implementation of anything upstream owns.** The whole point of the
current design is that there is one implementation of the framework. A feature
that belongs in abap2UI5 belongs upstream, where it also reaches every ABAP
user — the four seams and a bug fix went that way already.

## Next

- [**Where cap2UI5 Comes From**](./where-it-comes-from) — the change of strategy
- [**Architecture**](../reference/architecture) — what the plugin is and is not
