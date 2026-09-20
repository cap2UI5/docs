# Where cap2UI5 Comes From

cap2UI5 is a direct descendant of **abap2UI5**, and today it is more than a
descendant: it *runs* abap2UI5. Knowing the family history explains the unusual
names you will meet (`ZCL_…`, `z2ui5_if_client`) and why the design looks the
way it does. You never need to read or write a line of ABAP to use it.

## The abap2UI5 story

[abap2UI5](https://github.com/abap2UI5/abap2UI5) is an open-source project from
the SAP/ABAP world. Its promise: **write complete SAPUI5 apps purely in ABAP
classes** — no JavaScript, no XML views to deploy, no separate frontend
artifacts, no BSP or UI5 repository uploads. One ABAP class, one app.

It works by the [server-driven UI pattern](./what-is-cap2ui5#server-driven-ui):
a generic UI5 frontend is served to the browser once, every interaction is one
HTTP roundtrip, and the class builds the view, binds data and handles events.

It removed an entire deployment and tooling layer for internal tools — the same
gap that exists on the CAP side. That is the gap cap2UI5 fills.

## How it used to work: a port

For most of this project's life, cap2UI5 was a **hand-written JavaScript port**
of abap2UI5, kept in sync by build pipelines:

- a transpiler of our own (`abap2js.js`, 4,286 lines) turned upstream's ABAP
  into JavaScript;
- a port of the framework (12,588 lines) filled the gaps it could not;
- nightly pipelines mirrored upstream, rebuilt the core and published a
  ready-made CAP app into this repository.

It worked, and it had a structural problem: **two implementations of one
protocol drift.** A conformance gate built to measure that drift found 17
differences — including the one that mattered, that this project's *frontend*
and its *backend* had come to speak different protocols. Upstream had moved to a
new response envelope; the port still wrote the superseded one; the frontend
looked for a key the backend no longer produced and rendered its empty result,
silently.

No test could have caught it, because each half was consistent with itself.

## How it works now: a host

So the strategy changed. cap2UI5 stopped porting abap2UI5 and became a **CAP
plugin that hosts it**:

```
abap2UI5 (the real ABAP sources)
        │  npm run auto_downport      ← to 7.02-compatible ABAP
        │  npm run auto_transpile     ← @abaplint/transpiler, over open-abap
        ▼
@abap2ui5/runtime          the backend AND the UI5 shell, one package, one commit
        │
        ▼
cap2ui5 (this plugin)      mounts the route, implements the draft store over a
                           CDS entity, turns a JS class into something the
                           runtime can call — and contains no framework logic
```

The numbers, since they are the argument:

| | port | host |
|---|---|---|
| framework code maintained here | 16,874 lines | **774**, of which 485 are code |
| wire drift against abap2UI5 | 17 measured | structurally impossible — same code |
| frontend/backend pairing | assembled by us | one upstream commit |

Drift is not *reduced*. It cannot happen: there is only one implementation, and
both halves ship together.

## What upstream had to open

Hosting the framework outside an SAP system needed four small, additive changes
in abap2UI5 — none of them CAP-specific, all merged upstream:

| | |
|---|---|
| `z2ui5_if_ui5_draft_store` | session state behind an interface, so a host can put it in a CDS entity instead of an ABAP table |
| `z2ui5_if_ui5_serializer` | app-state serialization behind an interface, because `CALL TRANSFORMATION` has no counterpart outside ABAP |
| a guarded codepage fallback | **a bug fix.** On a runtime with neither codepage class, a failure escaped from inside an exception handler and took the view builder down before any app code ran. It presented as a *hang* |
| `c_protocol` | the wire carries its own version, and the shell refuses a mismatch loudly instead of rendering an empty result |

The third one is the reason to read that list twice: it was found here, on a
transpiled Node runtime, and fixed at the source for everybody.

## What is left of the port

The conformance gate that found the drift, and the measurements that made the
decision, live in
[builder-abap2UI5-js](https://github.com/cap2UI5/builder-abap2UI5-js) together
with the ADRs. The app-building pipelines are archived: nothing is generated any
more.

## Why the ABAP names remain

`ZCL_HELLO`, `z2ui5_if_client`, `check_on_init` — the runtime *is* ABAP, so its
identifiers are ABAP's. The plugin's facade renames the handful an app author
meets every day (`c.isDisplay`, `c.bind`, `c.event`), and `c.raw` reaches the
rest under their original names. Every abap2UI5 sample and document therefore
still maps onto what you are doing.

## Next

- [**What is cap2UI5?**](./what-is-cap2ui5) — the pattern itself
- [**Architecture**](../reference/architecture) — how host and runtime fit together
- [**cap2UI5 vs. abap2UI5**](./vs-abap2ui5) — what differs in practice
