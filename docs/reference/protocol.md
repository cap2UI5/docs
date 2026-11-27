# HTTP Protocol

One endpoint, one POST per interaction, JSON both ways. The protocol is
**abap2UI5's own** — cap2UI5 does not define it, translate it or version it
independently, because the backend answering it *is* abap2UI5.

::: tip This page used to carry a warning. It no longer needs to.
It used to say that the page described what cap2UI5 emitted and not what
abap2UI5 emitted — the two had drifted apart, and a hand-maintained port was
still writing a superseded envelope. That cannot happen now: the backend and
the frontend come from one upstream commit. The measurements below are from a
running server rather than from a specification.
:::

::: warning This page describes protocol 3 — plugin 0.8.0, not released yet
abap2UI5 `1.151.0` breaks the wire: its protocol is **3**. Plugin 0.8.0, which
hosts that runtime, is prepared but **not released yet**; the newest release
on npm, 0.7.0, hosts runtime 1.149.0 and speaks protocol 2. What differs is
said where it stands. An app changes nothing for it — a frontend, a test or a
tool that reads the response does.
:::

## The endpoint

| | |
|---|---|
| `POST /rest/root/z2ui5` | a roundtrip |
| `POST /sap/bc/z2ui5` | the same door, under its ABAP-side name |
| `GET  /rest/root/z2ui5?app_start=<APP>` | the HTML page: a small loader that boots UI5 and starts an app |
| `GET  /rest/root/z2ui5?z2ui5-bundle=<version>` | the UI5 frontend — every module, view and stylesheet of the component — as one JavaScript bundle, which the page loads |

There is no static frontend route: what the browser needs from the server
comes from the roundtrip route itself (UI5 comes from the CDN). Both paths are
configurable — see [Configuration](./configuration).

Up to plugin 0.7.0 the page embedded the whole frontend. With 0.8.0 it is a
loader, and the frontend is the bundle. Measured with cap2UI5's example on
runtime `1.151.0`:

| | plain | gzipped |
|---|---|---|
| the page | 9.7 kB | 3.4 kB |
| the bundle, `?z2ui5-bundle` | 194 kB | 57 kB |

The page names the bundle by its build hash, `?z2ui5-bundle=<hash>`, and that
answer carries `Cache-Control: private, max-age=31536000, immutable`, so a
browser that has it asks once. Asked for without the hash, the bundle is
answered `private, no-cache`. `/z2ui5/webapp/index.html` still answers 404.

## Request

```json
{
  "value": {
    "S_FRONT": {
      "ID": "<the draft id of the previous roundtrip, empty on a start>",
      "APP": "ZCL_JS_HELLO",
      "EVENT": "GO",
      "T_EVENT_ARG": ["red"],
      "SEARCH": "?app_start=ZCL_JS_HELLO",
      "PATHNAME": "/rest/root/z2ui5",
      "ORIGIN": "http://localhost:4004",
      "HASH": "",
      "CONFIG": {}
    },
    "XX": {},
    "MODEL": { "NAME": "Ada" }
  }
}
```

| | |
|---|---|
| `ID` | which draft to continue. Empty starts a new app |
| `EVENT`, `T_EVENT_ARG` | what the user did, and the arguments the control carried — `client.get_event()` and `client.get_event_arg(i)` |
| `MODEL` | the bound data as the browser has it; applied to the app instance before `main` runs |
| `ROUTE` | protocol 3, and only on a request that starts an app from a route: what the URL hash asks to restore, parsed by the frontend's router — `{ "APP": …, "DRAFT": … }` for `#/app/<APP>/<draft>`, `{ "APP_STATE": … }` for an app-state link. The backend reads no route out of `HASH`, which still travels for the app (`client.get().s_config.hash`) |

## Response

Measured against the example on runtime `1.151.0`, a start of `ZCL_JS_HELLO`:

```json
{
  "S_FRONT": {
    "APP": "ZCL_JS_HELLO",
    "ID": "FB4BF186944547CE8114AB778FE71B4A",
    "PROTOCOL": 3,
    "VIEWS": {
      "MAIN": { "XML": "<mvc:View …><Button text=\"Go\" press=\".eB(['GO'])\"/>…</mvc:View>" },
      "POPOVER": { "DESTROY": true },
      "POPUP": { "DESTROY": true }
    }
  },
  "MODEL": { "NAME": "" }
}
```

and the answer to its `GO` event:

```json
{
  "S_FRONT": {
    "ACTIONS": [["MESSAGE_BOX", "show", "Hello ", { "title": "Information" }]],
    "APP": "ZCL_JS_HELLO",
    "ID": "6329E9D03BC04A3C94913898F7EEF039",
    "PROTOCOL": 3
  }
}
```

| | |
|---|---|
| `ID` | the draft id the browser carries forward — a new one for every event |
| `PROTOCOL` | the wire version, see below |
| `VIEWS` | what the screen is: one entry per slot the roundtrip changes — `MAIN`, `NEST`, `NEST2`, `POPUP`, `POPOVER` — `{ "XML", "OPT" }` to display a view (`OPT` its options: a popover's `openById`, a nested view's `id` and methods, a transition), `{ "DESTROY": true }` to take one down. The frontend applies them in its own order, `MAIN` first |
| `NAV` | the URL intent — what `hash_set( )`, `hash_replace( )` and `app_state_set_active( )` ask for: `{ "setPushState": "/detail/1" }`, `{ "setHashReplace": "/detail/2" }`, `{ "setAppStateActive": true }` |
| `ACTIONS` | what to do on the screen, in order: message boxes, toasts, the app's follow-up actions |
| `MODEL` | the bound data as the server has it after `main` |

A section that says nothing is absent — the second answer above has no
`VIEWS` and no `MODEL`. `ACTIONS` is an **ordered list**, which is why two
`client.message_toast_display()` calls arrive in the order you wrote them.

Protocol 2 — runtime 1.149.0, plugin 0.7.0 and older — carried the same in
`S_FRONT.S_ACTION`, as the lists `T_SYSTEM`
(`["VIEW_SLOTS", "display", "<mvc:View …>"]`) and `T_CUSTOM`. Those are gone.

### An event wire

What `client._event( )` writes into a view is the frontend's `.eB( )` call.
In protocol 3 the flags of a wire — `_event( )`'s `s_ctrl` — travel as **one
object** behind the event name, where protocol 2 had positions in the array.
Measured, for an event with `check_queue_last` and `check_no_busy`:

```
.eB(['TYPED',{queueLast:true,noBusy:true}], ${$parameters>/newValue})
```

`client._event({ val, s_ctrl })` writes that form, so an app changes nothing;
a view that writes the array by hand writes the object.

## `PROTOCOL` — the wire carries its own version

`S_FRONT.PROTOCOL` is stamped from `z2ui5_if_ui5_types=>c_protocol` and the
shell compares it against its own before reading anything else. It is **not**
the product version and does not move with a release; it moves when a response
can no longer be read by a frontend written for the previous number.

It exists because of exactly the failure this project hit: an `S_ACTION`
envelope replaced an older `S_FRONT.PARAMS` shape, and a frontend written for
the old one looked for a key the backend no longer wrote — then rendered its
empty result, silently. A mismatch is now reported to the user. The move from
2 to 3, which replaced `S_ACTION` in turn, is that number doing its job.

A response *without* the field is let through: a backend older than the field
cannot be told apart from one that is merely older.

For a cap2UI5 project the check is belt and braces — both halves come from one
`@abap2ui5/node-runtime` — but it protects anyone pairing them by hand.

## Errors

An unhandled error answers `500` with `roundtrip failed (<cds.context.id>)`.
The detail goes to the server log under the same id; see
[Configuration](./configuration). Since plugin 0.6.0 an
async `main( )` that runs out of its `timeout` answers `504` with
`roundtrip timed out (<cds.context.id>)` instead. An app module that fails to load does not
get that far: it fails the server's start.

Authentication is decided **before** the body is read: an unauthenticated
caller gets `401` with the auth strategy's login challenge, an authenticated
user who lacks the configured role `403`, both without the server buffering
the payload. A body over the limit gets `413`. These three are answered by
CAP's error middleware, in CAP's error format.

## Next

- [**Architecture**](./architecture) — what sits behind the endpoint
- [**Configuration**](./configuration) — routes and authentication
