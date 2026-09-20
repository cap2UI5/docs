# HTTP Protocol

One endpoint, one POST per interaction, JSON both ways. The protocol is
**abap2UI5's own** — cap2UI5 does not define it, translate it or version it
independently, because the backend answering it *is* abap2UI5.

::: tip This page used to carry a warning. It no longer needs to.
It used to say that the page described what cap2UI5 emitted and not what
abap2UI5 emitted — the two had drifted apart, and a hand-maintained port was
still writing a superseded envelope. That cannot happen now: the backend and
the shell come from one upstream commit. The measurements below are from a
running server rather than from a specification.
:::

## The endpoint

| | |
|---|---|
| `POST /rest/root/z2ui5` | a roundtrip |
| `POST /sap/bc/z2ui5` | the same door, under its ABAP-side name |
| `GET  /rest/root/z2ui5?app_start=<APP>` | the composed HTML page that boots UI5 and starts an app |
| `GET  /z2ui5/webapp/**` | the shell's assets, straight from the runtime package |

Both POST paths are configurable — see [Configuration](./configuration).

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
| `EVENT`, `T_EVENT_ARG` | what the user did, and the arguments the control carried — `c.eventName` and `c.eventArg(i)` |
| `MODEL` | the bound data as the browser has it; applied to the app instance before `main` runs |

## Response

Measured against the example, a start of `ZCL_JS_HELLO`:

```json
{
  "S_FRONT": {
    "APP": "ZCL_JS_HELLO",
    "ID": "D46139087B1241DBBD701D4DC02F13AA",
    "PROTOCOL": 2,
    "S_ACTION": { "T_SYSTEM": [["VIEW_SLOTS", "display", "<mvc:View …>"]] }
  },
  "MODEL": { "NAME": "" }
}
```

| | |
|---|---|
| `ID` | the **new** draft id — every roundtrip writes a new one and the browser carries it forward |
| `PROTOCOL` | the wire version, see below |
| `S_ACTION.T_SYSTEM` | ordered framework actions: render a view, open a popup, show a message box, navigate |
| `S_ACTION.T_CUSTOM` | app-issued frontend actions |
| `MODEL` | the bound data as the server has it after `main` |

`S_ACTION` is an **ordered list**, which is why two `c.messageToast()` calls
arrive in the order you wrote them.

## `PROTOCOL` — the wire carries its own version

`S_FRONT.PROTOCOL` is stamped from `z2ui5_if_ui5_types=>c_protocol` and the
shell compares it against its own before reading anything else. It is **not**
the product version and does not move with a release; it moves when a response
can no longer be read by a frontend written for the previous number.

It exists because of exactly the failure this project hit: the `S_ACTION`
envelope replaced an older `S_FRONT.PARAMS` shape, and a frontend written for
the old one looked for a key the backend no longer wrote — then rendered its
empty result, silently. A mismatch is now reported to the user.

A response *without* the field is let through: a backend older than the field
cannot be told apart from one that is merely older.

For a cap2UI5 project the check is belt and braces — both halves come from one
`@abap2ui5/runtime` — but it protects anyone pairing them by hand.

## Errors

An unhandled error answers `500` with `roundtrip failed (<cds.context.id>)`.
The detail goes to the server log under the same id; see
[Configuration](./configuration).

Authentication is decided **before** the body is read: an unauthenticated
caller gets `401` without the server buffering the payload.

## Next

- [**Architecture**](./architecture) — what sits behind the endpoint
- [**Configuration**](./configuration) — routes and authentication
