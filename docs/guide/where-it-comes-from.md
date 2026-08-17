# Where cap2UI5 Comes From

If you're a CAP developer, chances are you've never heard of **abap2UI5** — it lives in the ABAP world. But cap2UI5 is a direct descendant of it, and knowing the family history explains many of its design decisions (and its unusual class names like `z2ui5_cl_ui5_view_builder`). Don't worry: **you never need to read or write a single line of ABAP** to use cap2UI5.

## The abap2UI5 story

[abap2UI5](https://github.com/abap2UI5/abap2UI5) is a popular open-source community project from the SAP/ABAP ecosystem. Its promise: **write complete SAPUI5 apps purely in ABAP classes** — no JavaScript, no XML views to deploy, no separate frontend artifacts, no BSP/UI5 repository uploads. One ABAP class = one app.

It works with the server-driven UI pattern described in [Server-Driven UI, Explained](./server-driven-ui):

- A small, **generic UI5 frontend** is served to the browser once.
- Every user interaction is one HTTP roundtrip to the ABAP backend.
- The ABAP class builds the view as XML, binds data, handles events — and the frontend renders it.

The project became successful because it removed an entire deployment and tooling layer for internal tools and utility apps. Over the years it grew a large sample collection ([abap2UI5-samples](https://github.com/abap2UI5/samples)), add-ons, and a community — all documented at [abap2UI5.org](https://www.abap2ui5.org).

## The same gap exists in CAP

The problem abap2UI5 solved in ABAP — *"I just need a small UI and I don't want to maintain a whole frontend project for it"* — exists identically in the CAP world: between annotation-generated Fiori Elements and full freestyle UI5 there was nothing lightweight.

**cap2UI5 is the abap2UI5 concept, ported to CAP/Node.js.** Instead of an ABAP class on NetWeaver, you write a JavaScript class in your CAP project's `srv/` folder. Everything else — the pattern, the API, even the frontend — is the same.

## How the port actually works

This is the interesting part, and it's more than a one-time copy. cap2UI5 stays **continuously in sync** with abap2UI5 through automated pipelines in two build repositories — [builder-abap2UI5-js](https://github.com/cap2UI5/builder-abap2UI5-js) (the framework build) and [builder-cap2UI5](https://github.com/cap2UI5/builder-cap2UI5) (the app build):

```
abap2UI5 (ABAP sources + UI5 frontend)          abap2UI5/samples
        │                                              │
        ▼                                              ▼
┌──────────── builder-abap2UI5-js sync pipelines ───────────────────────┐
│ update_backend   mirror → transpile ABAP → JS with abap2js            │
│                  (parser: @abaplint) → core/srv/z2ui5                 │
│ update_frontend  mirror → take the UI5 webapp 1:1, patch two          │
│                  config values → core/app/z2ui5/webapp                │
│ update_samples   mirror → transpile the demo apps                     │
│                  → core/srv/app/samples                               │
│ build_core       overlay the generated trees on the hand-written      │
│                  src/ → publish the core package into core/           │
│                  jest suite gates the commit — only green gets pushed │
└────────────────────────────────┬───────────────────────────────────────┘
                                 ▼
┌──────────── builder-cap2UI5 update_cap ────────────────────────────────┐
│ mirror the published core → assemble the CAP app (src/ + vendored     │
│ core) → test → publish 1:1 into the deployable cap2UI5/cap2UI5 repo   │
└─────────────────────────────────────────────────────────────────────────┘
```

Three different sync policies keep the pieces healthy:

| Piece | Where it lands | Policy |
|---|---|---|
| **Frontend** (`app/webapp` from abap2UI5) | `core/app/z2ui5/webapp` → mirrored to the app's `app/z2ui5/webapp` | replaced 1:1 — only the UI5 bootstrap URL in `index.html` and the backend endpoint in `manifest.json` are patched |
| **Framework core** (transpiled ABAP classes) | `core/srv/z2ui5/` | *fill-in only*: the hand-maintained adaptation in builder-abap2UI5-js's `src/` wins; transpiled classes are added but never overwrite the curated files |
| **Samples** (transpiled demo apps) | `core/srv/app/samples/` | fully machine-owned: overwritten on every sync |

The transpiler (**abap2js**, built on the open-source ABAP parser [@abaplint/core](https://github.com/abaplint/abaplint)) converts ABAP classes into plain JavaScript. Anything outside its supported subset is emitted as a visible `// TODO(abap2js): …` comment instead of being silently dropped, and tracked in a transpile report.

## What this means for you

- **The frontend is battle-tested.** You're running the exact UI5 app that thousands of abap2UI5 installations use — every upstream bugfix and new custom control (charts, camera, geolocation, …) flows in automatically.
- **The wire format is identical.** The frontend cannot tell whether ABAP or Node.js is answering. That's why the whole ecosystem of abap2UI5 knowledge, samples, and patterns applies 1:1.
- **The naming is inherited.** `z2ui5_cl_ui5_view_builder`, `check_on_init`, `_bind_edit` — these names come from ABAP conventions (`z` = customer namespace, `cl` = class, `if` = interface). They look unusual in JavaScript, but they keep the two worlds mappable line-by-line: any abap2UI5 sample can be ported (or auto-transpiled) to cap2UI5 mechanically.
- **Hundreds of ready samples.** The `core/srv/app/samples/` folder ships the transpiled abap2UI5 demo apps (`z2ui5_cl_smp_app_*`) — a huge, browsable cookbook. Try them in the [browser playground](./playground) without installing anything.
- **You still write normal JavaScript.** The sync pipeline is a maintainer concern. As an app developer you just `require` two classes and write a JS class — see the [Quickstart](./getting-started).

→ Next: [**Try it in the browser**](./playground) — zero-install playground, or the [**Quickstart**](./getting-started).
