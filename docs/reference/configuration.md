# Configuration

Two mechanisms cover almost everything you can configure: **environment
variables** for the platform wiring, and the **user exit** for anything the
framework renders or sends.

## Environment variables

| Variable | Default | Effect |
|---|---|---|
| `Z2UI5_APP_DIRS` | — | extra directories to search for app classes, separated by the platform path separator |
| `Z2UI5_DRAFT_TTL_HOURS` | `24` | how long draft rows are kept; `0` disables the retention job entirely |
| `PORT` | `4004` (CAP) | the port the server listens on |

```bash
Z2UI5_APP_DIRS=/srv/my-apps:/srv/more-apps npx cds-serve
Z2UI5_DRAFT_TTL_HOURS=4 npx cds watch
```

An unparseable `Z2UI5_DRAFT_TTL_HOURS` falls back to 24 hours rather than
disabling cleanup — a typo must not silently turn retention off.

## Registering app directories in code

The equivalent of `Z2UI5_APP_DIRS`, for when the path is known at startup:

```js
// srv/server.js
require("abap2UI5/register-apps")(__dirname + "/my-apps");
```

Both are additive and searched recursively; a file at the top level of a
directory wins over one in a subfolder. Classes can also be registered
directly, bypassing the filesystem entirely — that is how the browser
playground works with no filesystem at all:

```js
const engine = require("abap2UI5/engine");
engine.register_app_class(MyApp);              // by constructor name
engine.register_app_class("my_alias", MyApp);  // under a chosen name
```

## The user exit

The user exit is a class implementing `z2ui5_if_exit`. The framework finds it
by scanning for an implementation — you do not register it anywhere. Its two
methods are called after the framework defaults, so you receive a fully
populated config object and change only what you care about.

```js
const z2ui5_if_exit = require("abap2UI5/z2ui5_if_exit");

class my_exit extends z2ui5_if_exit {
  set_config_http_get(s_context, s_config) {
    s_config.title = "My Application";
    s_config.theme = "sap_horizon_dark";
    return s_config;
  }
}
module.exports = my_exit;
```

### What `set_config_http_get` controls

| Field | Default | Notes |
|---|---|---|
| `title` | `abap2UI5` | the browser tab title |
| `theme` | `sap_horizon` | any UI5 theme id |
| `src` | `/resources/sap-ui-core.js` | the UI5 bootstrap — the local runtime by default, so the stack works offline |
| `content_security_policy` | a full `<meta>` tag | see below |
| `t_security_header` | 7 headers | `[{n, v}]`, applied to the bootstrap response |

The default security headers are `cache-control: no-cache, no-store,
must-revalidate`, `Pragma: no-cache`, `Expires: 0`,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
`Referrer-Policy: strict-origin-when-cross-origin` and a `Permissions-Policy`
that allows geolocation/microphone/camera for same-origin only.

### CSP

The default policy allows `'unsafe-eval'` for one specific reason: the
OpenUI5 1.71 `ui5loader` evaluates module source as a string, and without it
the 1.71 bootstrap fails with a CSP `EvalError`. Modern UI5 releases do not
need it. If you pin a modern UI5, tighten the policy in your exit:

```js
set_config_http_get(s_context, s_config) {
  s_config.content_security_policy = s_config.content_security_policy
    .replace(" 'unsafe-eval'", "");
  return s_config;
}
```

The policy also allow-lists the public UI5 CDNs and jsDelivr/cdnjs. If you
serve everything locally you can strip those hosts too.

### `set_config_http_post`

The same idea for the roundtrip response — the hook to add response headers
or to switch on the CSRF gate, which is **off by default**:

```js
set_config_http_post(s_context, s_config) {
  s_config.check_csrf_active = true;
  return s_config;
}
```

## Identity

Who the framework thinks it is acting for — `sy-uname`, the draft `owner`
column, and the key that isolates retained sticky app state per session:

```js
// srv/server.js — what the CAP app wires
engine.set_identity(() => ({
  user: cds.context?.user?.id,
  tenant: cds.context?.tenant,
}));
```

The provider is called **per use**, not once at wiring time, so it can read a
request-scoped context and one installed provider serves every concurrent
request. Without one, identity falls back to the OS account of the server
process — fine for a single-user demo, wrong for anything with more than one
user, because every user then shares one identity.

## Draft store

```js
engine.set_store({
  load: async (id) => /* → {id, id_prev, data} | null */,
  save: async (entry) => { /* persist */ },
});
```

The CAP app wires this to the `cap2ui5.z2ui5_t_01` table; the other adapters
use an in-memory Map. Without injection the framework uses a volatile
in-memory fallback and warns once — correct for tests, wrong for production.
