# Architecture

cap2UI5 does not reimplement abap2UI5. It **hosts** it.

That sentence is the whole architecture, and it is a change from what this
project used to be — see [Where cap2UI5 Comes From](../guide/where-it-comes-from).

## The three pieces

```
  your CAP project
  ├── srv/apps/*.js          your apps          ← you write this
  ├── db/, srv/*.cds         your model          ← you write this
  └── node_modules/
      ├── cap2ui5            the plugin          ← ~485 lines of code
      │   ├── cds-plugin.js    mounts the route, serves the shell
      │   ├── index.cds        cap2ui5.Drafts
      │   └── lib/
      │       ├── define-app.js    a JS class → something the runtime can call
      │       ├── draft-store.js   the draft store, over a CDS entity
      │       └── runtime.js       locate and boot the runtime
      └── @abap2ui5/runtime  abap2UI5 itself     ← 1,244 transpiled files
          ├── output/            upstream's ABAP, downported + transpiled
          └── webapp/            the UI5 shell, from the same commit
```

The plugin contains **no framework logic**. No view builder, no wire format, no
lifecycle, no model service — all of that is upstream's code running unmodified.

## Why that removes a whole class of bug

The runtime is built from one upstream commit and carries the backend *and* the
frontend. A response and the page that reads it can therefore never be of
different ages — which was not a hypothetical: the previous design paired a
hand-maintained backend with a separately synced frontend, and they drifted into
speaking different protocols without anything noticing.

Upstream also stamps each response with a wire version, and the shell refuses a
mismatch loudly. See [HTTP Protocol](./protocol).

## A roundtrip, end to end

```
POST /rest/root/z2ui5
  │
  ├─ cds.middlewares.before        ← context, auth: cds.context.user now exists
  ├─ guard                         ← cap2ui5.requires, before the body is read
  ├─ express.raw                   ← up to 10 MB
  └─ cl_express_icf_shim.run       ← upstream's own express adapter
        │
        ├─ load the draft          ← ZCL_CDS_DRAFT_STORE → cap2ui5.Drafts
        ├─ rebuild the app instance
        ├─ apply the browser's model
        ├─ call your main(c)       ← defineApp's wrapper
        ├─ compose the response    ← upstream's handler
        └─ write the next draft
```

Two of those steps are the plugin's, and both are *seams upstream opened* rather
than patches:

| seam | what it lets a host do |
|---|---|
| `z2ui5_if_ui5_draft_store` | put session state wherever it lives — here, a CDS entity |
| `z2ui5_if_ui5_serializer` | serialize the app container without `CALL TRANSFORMATION` |

Both default to upstream's original code paths, so an SAP system behaves exactly
as before.

## `defineApp` — the part that earns its keep

The runtime expects what `@abaplint/transpiler` emits: static `ATTRIBUTES` and
`METHODS` maps, `constructor_()`, `~` becoming `$` in interface method names,
values boxed in `abap.types.*`. `defineApp` bridges a plain JavaScript class to
that:

- it **boxes** each declared field at construction and derives the RTTI schema
  from the same pass, because `_bind()` matches a value by *identity* among the
  object's attributes — there is no name parameter;
- it hands `main` a **Proxy** whose reads unwrap the boxes and whose writes write
  through, so your code sees plain values while the framework keeps its boxes;
- it makes `main` **synchronous**: queries are resolved before it runs, commands
  are recorded and replayed after, and event tokens are substituted once the
  async call can be awaited.

## The hazards, and what guards each

Neither coupling surface is a published contract, so both have a gate whose job
is to fail there rather than on the wire.

| | guarded by |
|---|---|
| what the **transpiler emits** — the statics, the boxes, the `$` naming | `abi-gate.test.mjs`: every touchpoint named and checked against a class the transpiler itself produced |
| **`@sap/cds` internals** — above all `cds.middlewares.before`, which is a *mixed* array of functions and `{factory}` objects | `cap-abi.test.mjs`: the chain read per auth kind, asserting the auth middleware is a plain function and the rest are inert |

Both are verified to discriminate: break the thing they pin, and they go red
naming it.

## What is measured

| | |
|---|---|
| Roundtrip | **14 ms**, sequential, HTTP, SQLite |
| The runtime's private SQLite | **no SQL at all** once the CDS store is installed — only `rollback`/`endTransaction` |
| Restart | state and the navigation stack survive SIGKILL |
| Concurrency | three users interleaved in one process, every answer to its owner |
| Browser | real Chromium on every CI run, against the CDN |

## Next

- [**HTTP Protocol**](./protocol) — what goes over the wire
- [**Database Model**](./database) — `cap2ui5.Drafts`
- [**Configuration**](./configuration) — the knobs
