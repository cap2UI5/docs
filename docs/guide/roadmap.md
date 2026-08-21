# Roadmap

Where cap2UI5 is going, and — more usefully — what is limited today. No dates:
this is a small project with an automated pipeline, and work lands when it
lands. What follows is the order of intent, not a schedule.

::: tip How to read this
Anything under **Known limits today** is true of the current build. Anything
under **What's next** is intended, not promised. If a limit matters to your
project, it is worth checking the
[cap2UI5 issues](https://github.com/cap2UI5/cap2UI5/issues) before you build
around it.
:::

## Known limits today

### Getting a project started

There is no supported way to *start* a cap2UI5 project other than cloning the
generated [cap2UI5](https://github.com/cap2UI5/cap2UI5) repository and writing
your apps into [`srv/app/`](./project-structure#srv-app). The framework is
vendored inside that repository at `core/`; it is not on the public npm
registry, so `npm install` cannot pull it into an existing CAP project. This is
the single biggest gap and the one most of the work below serves.

### One process, one session

State that survives a roundtrip lives in the draft table, but the *sticky*
handler that answers consecutive requests from one browser tab is held in the
process that answered the first one. There is no session affinity and no shared
handler store, so **running more than one instance can lose state
intermittently** — which is why the Cloud Foundry descriptor declares a single
instance. Horizontal scaling waits on either affinity or a shared sticky store.
Two tabs of the same user share one sticky slot, too, so a second tab can
disturb the first.

Concurrency inside one session is not guarded either: two roundtrips answered at
the same time fork the draft chain silently rather than failing.

### Pinned versions

- **abap2UI5 1.142.0.** The port pins one upstream release; `static version` on
  `z2ui5_if_app` says which. Upstream material written against a later release
  can disagree with what runs here — most visibly `_bind` and `_bind_edit`,
  which are still two different bindings on 1.142.0. See
  [Migrating from abap2UI5](./migration-from-abap2ui5#binding).
- **OpenUI5 1.113.0**, served locally. Newer UI5 controls and properties are
  not available. The pin is deliberately excluded from automated dependency
  updates: moving it is a compatibility decision about which UI5 releases the
  framework supports, not a routine bump.

### Not everything upstream ships is here

cap2UI5 deliberately does not carry abap2UI5's frozen legacy package, so
`z2ui5_cl_xml_view`, its custom-control decorator and the built-in `z2ui5_cl_pop_*`
popups do not exist here — an old upstream sample can fail on the import alone.
That is a decision, not a backlog item; the detail is on
[cap2UI5 vs. abap2UI5](./vs-abap2ui5).

Beyond that, a number of transpiled framework internals still carry
`TODO(abap2js)` markers where an ABAP construct has no finished JavaScript
equivalent — mostly in runtime type introspection. The common paths are
exercised by the whole sample suite on every sync, but the corners are real.

The one limit you are most likely to meet is not a TODO but a language
difference: because JavaScript has no reference to a field, `_bind` identifies
*which* attribute you meant by the value you passed, so two attributes holding
the same value are ambiguous. [Data Binding](./data-binding#reference-equality)
explains the workaround — pass the path explicitly.

### BTP deployment

The Cloud Foundry deployment descriptor ships and is documented
([Deployment](../reference/deployment)), but it is exercised by far less
automation than the local path. Treat a first BTP rollout as something to
verify end to end rather than assume.

## What's next

### Distribution — making `npm install` work

The intent is that a CAP developer can adopt cap2UI5 without ever seeing the
build pipeline: install a published package into an existing project, add a
plugin entry, write one class. That means publishing the core to the public
registry under a real version, and shipping a CAP plugin that contributes the
service, the bootstrap and the draft wiring on its own — replacing today's
hand-copied `srv/server.js` and `srv/z2ui5-service.cds` skeleton. A template or
scaffold would then be the recommended way to start, and the generated
repository becomes the demo rather than the delivery mechanism.

### Security defaults

The principle is that the defaults should be safe when nobody configures
anything, and the work is closing what is left between that and what ships.
The 2026-08 pass moved several settings onto that footing: the CSRF
gate is on by default (see [The User Exit](./user-exit#csrf)), security headers
are applied to the roundtrip and OData responses rather than only to the
bootstrap page, the roundtrip has an explicit body-size cap, and the
authorisation scope the app declares is enforced on the endpoint — so a
deployment now needs the role assigned, not merely defined.

What is *not* solved is the multi-instance state problem above: an honest
single-instance deployment is the current answer, not a shared store. The
[Deployment](../reference/deployment) page carries the operational detail as it
changes.

### Types

Hand-written type definitions for the top of the API — `client`,
`z2ui5_if_app`, `z2ui5_cl_ui5_view_builder` — so that editors complete the
builder chain instead of guessing. A fluent chain is the API most improved by
completion, and it is the one you write most.

### Playground

The [browser playground](./playground) runs the whole stack in a tab. Two things
would make it a genuinely better front door: a landing page that lists the
samples instead of requiring a hand-typed class name (the
[Sample Catalogue](./samples) is the documentation half of that), and an in-tab
editor that registers a class you wrote yourself — write a class, run it,
without installing anything. The engine already supports registering a class
directly, so this is a tooling question rather than a framework one.

### Keeping up with abap2UI5

The port tracks a fast-moving upstream through an automated transpile pipeline.
The work here is less about features than about alarms: making divergence from
upstream a visible check rather than something discovered by a user, and
carrying upstream's own deprecations through instead of having classes quietly
appear and vanish between releases.

## What is deliberately not planned

- **A named frontend action API.** Upstream has parked that design space; the
  port will not invent a competing one.
- **Carrying the frozen legacy classes.** See above — an npm package has no
  installed base to protect, which is exactly why they were dropped.
- **Divergence from the wire protocol.** The frontend is shared with abap2UI5
  byte for byte, and staying protocol-compatible is what makes the same app
  deployable in both worlds.

## Where the real backlog lives

This page is a summary written for people *using* cap2UI5. The working plans
live with the code, in each repository's issues and `AGENTS.md`:

| | |
|---|---|
| the app, and the framework as delivered | [cap2UI5/cap2UI5](https://github.com/cap2UI5/cap2UI5) |
| transpiler and core build | [builder-abap2UI5-js](https://github.com/cap2UI5/builder-abap2UI5-js) |
| app assembly and publishing | [builder-cap2UI5](https://github.com/cap2UI5/builder-cap2UI5) |
| the browser playground | [builder-cap2UI5-web](https://github.com/cap2UI5/builder-cap2UI5-web) |
| this site | [cap2UI5/docs](https://github.com/cap2UI5/docs) |

[The Ecosystem](./ecosystem) explains how those fit together.
