# Developer Tools

The webapp ships a full inspector — it is part of every cap2UI5 app, in
development and in production, and nothing needs to be installed or enabled.

**Open it with `Ctrl+F12`.** You can also deep-link straight to a tab with
`?z2ui5-devtools=HISTORY`.

Server-driven UI moves the interesting state to the server, which makes the
browser's own devtools much less useful than usual: you can see the rendered
XML, but not why the server produced *that* XML for *this* click. These tools
show the other half.

## What is in there

The dialog has five groups.

### Overview

Which app class is serving, which roundtrip you are on, and whether anything
is broken. The first place to look when an app "does nothing" — usually it
answers the question before you open anything else.

### Problems

The **Error** view and the **Log**. *Open on Error* makes the dialog pop up by
itself the moment something throws, which is the difference between catching
an error and finding out about it three interactions later.

### Roundtrips

The heart of it, and what you cannot get anywhere else:

- **History** — every roundtrip of this session
- **Request** / **Response** — the exact wire payloads (`S_FRONT`, `XX`,
  `MODEL`; see [HTTP Protocol](../reference/protocol))
- **Actions** — the frontend actions the server asked for
- **two diffs** — what changed between roundtrips, model and view

*Record Payloads* keeps the full bodies instead of summaries. *Retry* re-sends
a roundtrip, *Restart* starts the app over.

### View & Data

The generated view, sliced by slot and aspect, plus **Pick Control** — click a
control in the running app and land on the piece of view XML and the bound
model path that produced it. **After Templating** shows the view as UI5 sees
it once templating has run, which is where binding problems become obvious.
**Apply to App** pushes an edited view straight into the running app, so you
can try a change without a server roundtrip.

### System

The UI5 version and device info, the class registry (what
`?app_start=` can resolve), and **ABAP Source** — for apps transpiled from
ABAP, the original source, with *Open in ADT* when you are on a system that
has it.

## Turning it off

There is no switch. The tools are part of the shipped webapp, and the webapp
is a generated artifact mirrored from upstream abap2UI5 — patching it out
locally would be overwritten by the next sync. If you must remove them, do it
in the pipeline: the frontend is assembled by
[builder-abap2UI5-js](https://github.com/cap2UI5/builder-abap2UI5-js) (see
[Ecosystem](./ecosystem)).

Worth knowing before you try: the tools expose nothing the browser could not
already read. The payloads they show are this session's own requests and
responses, and the class registry lists what `?app_start=` accepts anyway.
