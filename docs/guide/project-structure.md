# Project Structure

There is no cap2UI5 project layout. cap2UI5 is a **CAP plugin**, so the project
is *your* CAP project, and the plugin adds three things to it without putting a
single file in your repository.

## What your project looks like

An ordinary CAP project. The only cap2UI5-specific thing in it is the
dependency and one directory:

```
my-project/
├── db/
│   └── schema.cds          # your entities
├── srv/
│   ├── catalog-service.cds # your services — untouched by cap2UI5
│   ├── apps/               # ← your cap2UI5 apps, one file each
│   │   ├── hello.js
│   │   └── books.js
│   └── server.js           # optional, and NOT touched by the plugin
└── package.json            # "cap2ui5": "^x.y.z"
```

`examples/bookshop` in the [cap2UI5 repository](https://github.com/cap2UI5/cap2UI5)
is exactly this and nothing more.

## What the plugin adds at runtime

CAP loads `cds-plugin.js` from every dependency that has one. On `cds watch`
that gives you:

| | where it comes from |
|---|---|
| `/sap/bc/z2ui5`, `/rest/root/z2ui5` | the roundtrip route, mounted behind CAP's own middleware chain |
| `/z2ui5/webapp/` | the UI5 shell, served **out of the runtime package** — not copied, not generated, not yours to maintain |
| `cap2ui5.Drafts` | a CDS entity contributed through `package.json#cds.requires`, so `cds deploy` creates it next to your own tables |

None of this appears in your working tree. There is nothing to regenerate, no
vendored folder, no sync pipeline. Upgrading is `npm update cap2ui5`.

## `srv/apps/` — the one directory that is yours

Every `.js`, `.mjs` or `.cjs` file in it is loaded once the runtime is up. A
file is not special in any way: it just calls `defineApp`, and it may call it
more than once.

```js
// srv/apps/pick.js — two apps in one file is fine
const { defineApp } = require("cap2ui5");

defineApp("ZCL_PICK",     class { /* … */ });
defineApp("ZCL_PICK_ONE", class { /* … */ });
```

The **first argument to `defineApp` is the name on the wire** — what
`?app_start=` takes and what `c.navTo()` resolves. The file name is irrelevant.

To put apps somewhere else, point the plugin at it:

```json
{ "cds": { "cap2ui5": { "apps": "srv/my-apps" } } }
```

See [Configuration](../reference/configuration) for the rest of the knobs.

## Where the framework actually lives

In `node_modules`, in two packages, and you own neither:

| | |
|---|---|
| `cap2ui5` | the plugin — ~770 lines, of which 485 are code. `cds-plugin.js`, `index.cds`, `lib/` |
| `@abap2ui5/runtime` | abap2UI5 itself: upstream's ABAP, downported and transpiled over open-abap, plus the UI5 shell. 1,244 transpiled files |

That split is the whole design. The plugin is a **host**: it mounts a route,
implements the draft store over a CDS entity, and turns a JavaScript class into
something the runtime can call. It contains no framework logic, which is why it
cannot drift from abap2UI5 — see [Architecture](../reference/architecture).

::: info The repository is not the product
[`cap2UI5/cap2UI5`](https://github.com/cap2UI5/cap2UI5) holds `plugin/` (the
package), `examples/bookshop` (a project that uses it) and `runtime/` (where
`@abap2ui5/runtime` is assembled until it is on npm). You consume the package;
you do not clone the repository — unless you are working on cap2UI5 itself.
:::

## Next

- [**Configuration**](../reference/configuration) — routes, authentication, the apps directory
- [**Persistence & Sessions**](./persistence) — `cap2ui5.Drafts`
- [**Architecture**](../reference/architecture) — what runs where, and why there is no port any more
