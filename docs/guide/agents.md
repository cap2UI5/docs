# Agents: the MCP Endpoint

Since `@cap2ui5/cds-plugin` 0.5.0 an AI agent — Claude Code, or any client that
speaks the [Model Context Protocol](https://modelcontextprotocol.io) over
HTTP — can operate a project's apps: read a screen as data, fill its fields,
fire its events. It goes through the app's own `main( )`, as the CAP user who
calls, with that user's drafts and roles. There is no second API and no
technical user.

It is the same idea, the same four tools and the same answers as abap2UI5's
[MCP server](https://github.com/abap2UI5/mcp-server) and abap2UI5's ABAP agent
addon. The decision record is
[ADR-009](https://github.com/cap2UI5/cap2UI5/blob/main/docs/adr/adr-009-agent-endpoint.md).

::: warning What is verified here
This page is written from the plugin's code and its test suite
(`examples/bookshop/test/agent.test.mjs` and its siblings in cap2UI5). The
endpoint has not been run on BTP, and not behind an approuter.
:::

## Switch it on

The endpoint is **off** until the project says otherwise:

```json
{ "cds": { "requires": { "cap2ui5": { "agent": true } } } }
```

With it on, the server logs where it answers and how long it keeps its audit
rows:

```
[cap2ui5] - agent endpoint (MCP) at /rest/root/z2ui5/mcp - audit rows kept 90 days
```

`true` takes every default. An object sets the details:

```json
{
  "cds": { "requires": { "cap2ui5": { "agent": {
    "path": "/rest/root/z2ui5/mcp",
    "apps": ["Z2UI5_CL_UI5_APP_HI_WORLD"],
    "confirm": ["ZCL_BOOKS:ADD"],
    "forbidden": ["DELETE*"],
    "retention": 90
  } } } }
}
```

| key under `agent` | default | |
|---|---|---|
| `path` | `/rest/root/z2ui5/mcp` | where the endpoint answers. It must not be one of the roundtrip `routes` |
| `apps` | none | apps the **project** opts in — names, or patterns with `*`. This is how a transpiled ABAP app opts in, since it cannot say so itself |
| `confirm` | none | events an agent hands to a human: `"EVENT"` for every app, `"APP:EVENT"` for one, `*` as a wildcard |
| `forbidden` | none | events an agent never fires, written the same way |
| `retention` | `90` | days a row of the audit log is kept; `0` or `false` keeps every row — see [Retention](#retention) |

A key the endpoint does not know, or a value of the wrong kind, **fails the
start** and names the setting. `"forbiden"` would otherwise leave the event
open, and a `"retention": "90d"` read as "forever" would be the wrong guess for
an audit log. Any object switches the endpoint on, so
`CDS_REQUIRES_CAP2UI5_AGENT_RETENTION=30` alone does too.

## An app opts in

An app is reachable only when it opted in, or the settings' `apps` name it. A
JavaScript app says so where it is defined, with `defineApp`'s third argument:

```js
import { defineApp } from "@cap2ui5/cds-plugin";

defineApp("ZCL_BOOKS", class {
  /* fields and main( client ) as always */
}, {
  agent: {
    description: "Search the bookshop's books",
    events: { ADD: "confirm", "DELETE*": "forbidden" },
  },
});
```

| `agent` | |
|---|---|
| left out | the app says nothing; the settings' `apps` decide |
| `true` | opted in, every event allowed |
| `{ events, description }` | opted in. `events` maps an event name, or a pattern with `*`, to its policy; `description` is what `app_list` shows |
| `false` | never — whatever the settings' `apps` say. For an app that administers something |

Anything else — an unknown key, a policy spelt `"forbiden"` — throws when the
module loads, which fails the server's start.

## Allowed, confirm, forbidden

Every event is one of three:

| policy | what an agent can do |
|---|---|
| `allowed` | fire it. The default for an event nobody classified |
| `confirm` | not fire it. `app_act` is refused with a link that hands the screen to a human |
| `forbidden` | not fire it, and there is no handover |

Two sources classify an event: the app's own `events` and the settings'
`confirm` and `forbidden` lists. Both are applied and **the stricter wins**, so
a project can tighten what an app allows but cannot loosen it. Names and
patterns compare without regard to case, and `*` matches any run of
characters. Within an app's `events`, an exact name is looked up before a
pattern.

A setting written `"APP:EVENT"` covers the app on the screen **and** the app
the session was started with. So a framework popup an app calls —
`z2ui5_cl_pop_to_confirm`, say — is covered by the rules for that app.

In the snapshot an agent reads, an action that is not `allowed` carries
`"policy": "confirm"` or `"policy": "forbidden"`, so the agent knows before it
tries.

### The handover

A `confirm` refusal sends nothing to the app. Its text names the event and
carries a link:

```
<origin>/rest/root/z2ui5#/app/<APP>/<session>
```

(The route in it is the roundtrip route the endpoint's `path` lies under —
`/rest/root/z2ui5` for the default — else the first of `routes`.) Opened in the browser **by the same user**, the framework restores the
session's draft — the state the agent prepared — and the human checks it and
presses the button. Anybody else gets a fresh app, because a draft answers
only to its owner ([Database Model](../reference/database#the-owner-binding)).

Values the agent sent without an event are still pending, not in the draft;
the refusal lists them, and says to fire an allowed event first or to tell the
user what to enter.

## Connect a client

In development, with CAP's mocked users — Claude Code for one:

```bash
claude mcp add --transport http bookshop http://localhost:4004/rest/root/z2ui5/mcp \
  --header "Authorization: Basic $(printf '%s' 'alice:' | base64)"
```

In production the header is the token your identity provider issues (XSUAA,
IAS). Pass it as a header: CAP does not implement MCP's own authorization
discovery.

## The tools

| tool | input | answer |
|---|---|---|
| `app_list` | `filter?` | `{ count, apps: [{ app, source, description? }], hint }` — the apps an agent may start. `source` is `"app"` (it opted in itself) or `"config"` (the settings named it). Starts nothing |
| `app_start` | `app`, `values?`, `max_rows?` | starts the app and answers its screen as a snapshot. `max_rows` is the rows per table, 20 unless set, at most 200 |
| `app_describe` | `session`, `max_rows?` | the snapshot of the last answer — no roundtrip |
| `app_act` | `session`, `values?`, `event?`, `args?`, `row?`, `max_rows?` | fills fields, fires an event, answers the next snapshot |

The answer is **agent snapshot v1**, specified in the MCP server's
[docs/agent-snapshot.md](https://github.com/abap2UI5/mcp-server/blob/main/docs/agent-snapshot.md):
the fields, the actions, the tables, the messages, some static text, and what
is pending. The plugin does not reimplement it. It carries the MCP server's own
code, vendored unchanged at a recorded commit in `plugin/lib/agent/vendor/`,
and adds one key — the `"policy"` above.

- `values` address a field by its id, its model path or its name, and a table
  cell as `"<table>/<row>/<COLUMN>"`.
- `event` is an action's event name or its id.
- `row`, counted from 0, fills the row-dependent arguments of a row action.
- Values sent without an `event` stay **pending**, as typing does in the
  browser, and go out with the next event.

`app_act` is strict. An event that is not among the snapshot's actions, a field
that is not on the screen or not editable, and a choice outside its values are
refused, the refusal names what is allowed, and nothing is sent.

A refusal is a tool result with `isError` and a sentence, never a protocol
error. A failure inside the app answers `<tool> failed (<id>) - the server log
names the cause`; the detail stays in the log, as for a
[roundtrip](../reference/configuration#errors).

## Who the agent is

**The authenticated CAP user, always.** The endpoint is mounted like the
roundtrip route: behind CAP's own middlewares and the same `roles` guard, with
CAP's error middleware last. A tool call runs the route's roundtrip handler in
process, inside the MCP request, so `cds.context.user` is the caller. The
draft store binds every draft to that user, and the app's own checks see that
user.

Two things are stricter than on the UI route:

- **Anonymous callers are refused** even where `roles` is `any` and lets them
  into the UI. Their sessions could not be told apart.
- **A user without an id is refused.** Neither the drafts nor the log could
  tell that user from anybody else.

Each user has a client of their own, so a session id of another user is
"unknown" — exactly the answer a missing one gets.

### What the endpoint answers before any tool runs

| status | when |
|---|---|
| `401` | nobody is logged in — with the auth strategy's login challenge, from CAP |
| `403` | the user has none of `roles` (from CAP); or the authenticated user has no id; or the request's `Origin` names another host |
| `405` | anything but `POST`, with `Allow: POST`. There is no event stream and no MCP session, so a `GET` has nothing to open |
| `415` | a `Content-Type` other than `application/json` |
| `406` | an `Accept` header that rules `application/json` out |
| `400` | an `MCP-Protocol-Version` the endpoint does not speak; a body that is no JSON; an invalid JSON-RPC message; an empty batch |
| `413` | a body over the roundtrip route's [`body_parser.limit`](../reference/configuration#the-defaults) |
| `202` | a notification — accepted, no body |

The `Origin` check and the `Content-Type` check are there because the endpoint
is reachable from a browser: a web page on another host cannot drive it with a
user's cookies.

The protocol is MCP over Streamable HTTP — JSON-RPC 2.0, one `POST` per
message or batch, answered with `application/json`. It answers `initialize`,
`ping`, `tools/list` and `tools/call`, in the revisions `2025-11-25`,
`2025-06-18`, `2025-03-26` and `2024-11-05`.

## The audit log: `cap2ui5.AgentLog` {#audit-log}

Every tool call writes one row — also a refused one:

| column | |
|---|---|
| `owner` | the CAP user the agent acted as |
| `userAgent` | the MCP client's `User-Agent` header |
| `tool` | `app_list`, `app_start`, `app_describe` or `app_act` |
| `app`, `appStart` | the app on the screen after the call, and the app the session was started with |
| `sessionIn`, `sessionOut` | the session the call continued, and the one its answer carries |
| `event`, `args` | the event and its arguments |
| `fields` | **which** fields the agent filled — never their values |
| `outcome` | `ok`, `refused`, `confirm`, `forbidden` or `error` |
| `message` | what was refused or failed |

The values an agent entered are not stored. A password or an IBAN typed into a
screen does not end up in a log that more people read than saw the screen.

A row that cannot be written is logged as an error and does not change the
tool's answer: what the agent did has happened by then.

The entity is in every project's model, whether the endpoint is on or not, and
in no service — see [Database Model](../reference/database#agentlog)
for the definition and why the table is unconditional.

### Retention

A row is kept `retention` days, 90 unless set, and then deleted. There is no
timer: an agent call, after it has answered, deletes every user's rows older
than the cutoff — **at most once an hour per process and tenant**. A sweep
that fails is logged as a warning and tried again an hour later; it never
fails the agent's call.

`"retention": 0` (or `false`) keeps every row. A project that prefers a
scheduled job of its own sets that and runs the same `DELETE` itself:

```js
import { purgeAgentLog } from "@cap2ui5/cds-plugin";

const deleted = await purgeAgentLog({ days: 90 });
```

Without `days` it takes the setting's retention, else 90; with `0` or `false`
it deletes nothing. It answers the number of rows deleted. It runs in
`cds.context`'s transaction where there is one, so a multitenant application
calls it once per tenant, inside `cds.tx({ tenant }, …)`.

## Sessions and restarts

A session is the app's draft — in `cap2ui5.Drafts`, owned by the user,
expiring with the [draft expiry](./user-exit#onroundtrip) — plus what the
server remembers of the screen: the views, the pending values, the last answer
`app_describe` reads. That memory belongs to the process, and a restart loses
it while the drafts survive.

So a session the server no longer knows is **restored from its draft**, the
way the handover link restores it for a human:

- `app_describe` answers the restored screen, under a **new** session id;
- `app_act` sends nothing and names the new id, because the screen the agent
  chose its action on is not the one in front of it now;
- values that were pending before the restart are gone, as a browser tab's
  are.

Only a session the audit log shows the **same user's** agent reached is
restored — and only if it is the newest of its line, its draft is still there
and its app may still be started. That is why a retention shorter than the
draft expiry would lose restorable sessions; with the defaults, 90 days against
4 hours, it takes an expiry of weeks to get there.

## Not there

- MCP's own authorization discovery — a client passes the token as a header.
- Server-sent events and MCP sessions.
- An administration app for the log. To show it, expose `cap2ui5.AgentLog` in
  a service of your own, with a `@restrict` such as `where: 'owner = $user'`.

## Next

- [**Configuration**](../reference/configuration) — every `cds.requires.cap2ui5` setting
- [**Database Model**](../reference/database) — `cap2ui5.Drafts` and `cap2ui5.AgentLog`
- [**App Interface**](../api/app-interface) — `defineApp` and its options
