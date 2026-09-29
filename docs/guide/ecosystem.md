# The Ecosystem

cap2UI5 is a small project sitting on a larger one. Knowing which repository
owns what saves time when something breaks.

## The repositories

| | |
|---|---|
| [**abap2UI5/abap2UI5**](https://github.com/abap2UI5/abap2UI5) | the framework itself: the ABAP sources and the UI5 shell. Everything cap2UI5 runs comes from here |
| [**cap2UI5/cap2UI5**](https://github.com/cap2UI5/cap2UI5) | the plugin. `plugin/` is the npm package `@cap2ui5/cds-plugin`; `examples/bookshop` is a CAP project using it; `runtime/` is a stand-in for `@abap2ui5/node-runtime` that the repository's own tests build from upstream |
| [**cap2UI5/samples**](https://github.com/cap2UI5/samples) | abap2UI5's samples as cap2UI5 apps, each translated from its ABAP original by `npx cap2ui5 abap2js` — the npm package `@cap2ui5/samples` |
| [**cap2UI5/docs**](https://github.com/cap2UI5/docs) | this site |

The decisions that led to the current design are in the plugin repository,
`docs/adr/` — [ADR-008](https://github.com/cap2UI5/cap2UI5/blob/main/docs/adr/adr-008-host-not-port.md)
is the one that made cap2UI5 a host rather than a port.

The four repositories of the earlier port — `builder-abap2UI5-js`, which
transpiled abap2UI5 into JavaScript, and `builder-cap2UI5`,
`builder-cap2UI5-web` and `web-cap2UI5-build`, which generated an application
and a playground from it — are archived or being archived. Nothing consumes
their output: `@cap2ui5/cds-plugin` depends on `@abap2ui5/node-runtime` from npm, which
abap2UI5 builds itself.

## The packages

| | |
|---|---|
| `@cap2ui5/cds-plugin` | the plugin — about 640 lines of code. Mounts the route, implements the draft store over a CDS entity, turns a JS class into something the runtime can call |
| `@abap2ui5/node-runtime` | abap2UI5: upstream's ABAP, downported and transpiled over open-abap, with the UI5 frontend embedded in the page its GET answers with — backend and frontend from one commit |
| `@cap2ui5/samples` | abap2UI5's samples as cap2UI5 apps. Optional: added to a project, they run beside its own apps — see [Apps from a package](./project-structure#apps-from-a-package) |

All three are on npm: `@cap2ui5/cds-plugin` 0.3.0 (Node ≥ 22, `@sap/cds` ≥ 9 as a peer),
`@abap2ui5/node-runtime` 1.145.0 (Node ≥ 22), which the plugin pins exactly,
and `@cap2ui5/samples` 0.1.0. `npm add @cap2ui5/cds-plugin` installs the first two — see the
[Quickstart](./getting-started). Up to 0.2.0 the plugin was the unscoped
package `cap2ui5`, which is withdrawn from npm.

## What the plugin does and does not own

**Owns:** the CAP route and its authentication guard, `cap2ui5.Drafts` and the
draft store over it, `defineApp` and the `c` facade, the two ABI gates.

**Does not own:** views, the wire format, the model service, the lifecycle, the
UI5 shell, the frontend actions — all upstream's, running unmodified. The plugin
deliberately contains no framework logic, which is what makes drift impossible.

## Where to report it {#where-to-report}

Decide by **which layer produced the symptom**:

| symptom | where |
|---|---|
| the route 401s, the draft is not found, an app is not registered, a `c.…` member misbehaves | [cap2UI5/cap2UI5](https://github.com/cap2UI5/cap2UI5/issues) |
| a control renders wrong, an event does not fire, the frontend throws, a framework method misbehaves | [abap2UI5/abap2UI5](https://github.com/abap2UI5/abap2UI5/issues) — it is the same bug an ABAP user would see |
| a page here is wrong or out of date | [cap2UI5/docs](https://github.com/cap2UI5/docs/issues) |

Unsure? Open it on cap2UI5 and say what you saw. Moving it costs a comment.

::: tip This routing is not bureaucracy
A framework bug fixed upstream reaches every ABAP user too, and comes back here
on the next runtime bump. The codepage bug this project found was exactly that:
discovered on a transpiled Node runtime, fixed at the source, and now fixed for
everyone.
:::

## abap2UI5's own ecosystem

The [samples](https://github.com/abap2UI5/samples),
[samples-controls](https://github.com/abap2UI5/samples-controls) and the
documentation at [abap2ui5.org](https://www.abap2ui5.org) are ABAP, but the
framework calls are the same ones. The
[translation table](./migration-from-abap2ui5#the-translation-table) maps them
onto the JavaScript facade, so a sample there is still a worked example here.

## Next

- [**Where cap2UI5 Comes From**](./where-it-comes-from) — why it is a host and not a port
- [**Architecture**](../reference/architecture) — the layers in one picture
