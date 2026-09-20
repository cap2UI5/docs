# The User Exit

Everything the framework renders or sends that is not an app's business — the
theme, the UI5 bootstrap URL, the Content-Security-Policy, the response
headers, how long drafts live, whether the CSRF gate is armed — comes from one
config structure. The **user exit** is the one supported way to change it.

A project has **one**, registered with `defineExit`:

```js
// srv/apps/exit.js
const { defineExit } = require("cap2ui5");

defineExit({
  onPage(cfg, ctx) {                 // the bootstrap page, once per page load
    cfg.theme = "sap_horizon_dark";
  },
  onRoundtrip(cfg, ctx) {            // every roundtrip after it
    cfg.draft_exp_time_in_hours = 24;
  },
});
```

Both hooks are optional; register the one you need. The file goes in your apps
directory (`srv/apps/` by default) and is loaded with the apps, before the
first request.

`cfg` arrives **fully populated** with the framework's defaults, so you
override what you care about and leave the rest alone. Only the fields you
actually change are written back.

::: warning One exit, not one per concern
The exit decides the Content-Security-Policy and every security header, so
which one wins must not depend on module load order. A second `defineExit`
call throws rather than silently replacing the first. Merge them.
:::

## Why you register it instead of the framework finding it

In ABAP, abap2UI5 *discovers* the exit: it asks the class repository which
classes implement `z2ui5_if_ui5_exit` and instantiates the one it finds. That
lookup is `SEO_INTERFACE_IMPLEM_GET_ALL` on standard ABAP and XCO on cloud —
and [open-abap](./where-it-comes-from), which the transpiled runtime runs on,
has neither. The call raises, the framework's own `CATCH cx_root` turns that
into "no exit configured", and the shipped defaults stand.

Measured, before `defineExit` existed: with an exit class sitting in the
runtime's class table, `get_user_exit_class( )` answered the empty string and
`get_instance( )` handed back the default exit. Every value on this page was
unreachable from a CAP project.

So the host binds the exit rather than being asked for it — the same seam the
[draft store](../reference/database) uses, and the same static the framework's
own `exit_instantiate( )` writes to. `examples/bookshop/test/exit.test.mjs`
measures the effects over the wire: the theme on the page, an added header on
both the page and the roundtrip response, and the CSRF gate still armed
because the exit did not touch it.

## The request context

The second argument describes the request being answered:

| Field | What it is |
|---|---|
| `path` | the request path |
| `app_start` | the `?app_start=` value — trimmed, upper-cased, namespace unpacked |
| `t_params` | the URL query parameters, as `[{ n, v }]` |

So the config can depend on the request — a different theme per app:

```js
onPage(cfg, ctx) {
  if (ctx.app_start === "ZCL_JS_BOOKS") cfg.theme = "sap_horizon_dark";
}
```

::: tip `app_start` is empty on a POST
The frontend posts to the manifest URI, and an app named by the hash route
never reaches the server at all. `app_start` is a hint for the page request,
not the authority on which app is running — do not branch security decisions
on it.
:::

## `onPage` — the bootstrap page {#onpage}

This hook builds the HTML page that boots UI5. It runs once per full page
load, not once per roundtrip.

| Field | Default | Effect |
|---|---|---|
| `src` | `https://sdk.openui5.org/resources/sap-ui-cachebuster/sap-ui-core.js` | the UI5 bootstrap — the OpenUI5 CDN |
| `theme` | `sap_horizon` | any UI5 theme id |
| `content_security_policy` | a full `<meta>` tag | see below |
| `t_security_header` | 5 headers | `[{ n, v }]`, applied to **every** response the handler sends, the roundtrip POST included |
| `t_add_config` | `[]` | extra `data-sap-ui-*` bootstrap attributes, as `[{ n, v }]` |
| `styles_css` | `""` | CSS injected into the page |
| `custom_js` | `""` | JavaScript injected into the page |
| `title` | `""` | **no longer read.** The page carries a constant `<title>`; an app sets the tab title itself, with `cs_event-set_title`. The field stays because it is part of the published contract — assigning it compiles, runs, and does nothing |

::: warning UI5 comes from the CDN
The plugin serves the abap2UI5 shell (`/z2ui5/webapp`), not UI5 itself —
there is no `/resources` route, and `src` points at `sdk.openui5.org` out of
the box. **A server without outbound internet access renders nothing.** If
that is your deployment, host a UI5 distribution yourself and point `src` at
it; the CSP has to allow that origin too.
:::

### Content-Security-Policy

The default allows `'unsafe-eval'` for one specific reason: the OpenUI5
`ui5loader` evaluates module source as a string, and without it the bootstrap
fails with a CSP `EvalError`. It allow-lists the SAP and OpenUI5 hosts,
permits `data:` and `blob:`, and closes `object-src` and `base-uri`.

If you pin a UI5 release that does not need `eval`, tighten it:

```js
onPage(cfg) {
  cfg.content_security_policy =
    cfg.content_security_policy.replace(" 'unsafe-eval'", "");
}
```

Serving UI5 yourself? Then the CDN hosts can go too — build the tag rather
than patching it, so what the page carries is what you wrote.

### Security headers

The five defaults are `X-Content-Type-Options: nosniff`,
`X-Frame-Options: SAMEORIGIN`,
`Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy`
allowing geolocation, microphone and camera for the same origin only, and
`Cross-Origin-Resource-Policy: same-origin`. (The caching headers on the
response come from the handler itself, not from here.)

Append rather than replace, unless dropping one is the point:

```js
onPage(cfg) {
  cfg.t_security_header = [
    ...cfg.t_security_header,
    { n: "Strict-Transport-Security", v: "max-age=31536000; includeSubDomains" },
  ];
}
```

## `onRoundtrip` — every request after the page {#onroundtrip}

| Field | Default | Effect |
|---|---|---|
| `draft_exp_time_in_hours` | `4` | how long a draft stays resumable |
| `check_csrf_active` | `true` | the cross-origin POST gate |
| `check_trust_forwarded_host` | `true` | whether `X-Forwarded-Host` is trusted when the gate compares origins |
| `check_hide_error_details` | `false` | answer framework errors with a generic 500 instead of the exception text |

### Draft expiry

```js
onRoundtrip(cfg) { cfg.draft_exp_time_in_hours = 24; }
```

This governs how long the framework will *resume* a draft. Deleting the rows
is a separate job on its own clock — see [Database](../reference/database).

### CSRF

The gate compares the `Origin` header — falling back to `Referer` — against
the app's own host, and rejects a mismatch with `403 Forbidden`. The frontend
posts from the same origin, so first-party traffic is unaffected.

Two properties are worth knowing before you rely on it:

- It is **lenient when there is nothing to compare**: a request carrying
  neither `Origin` nor `Referer` is allowed through, so that proxies which
  strip those headers do not lock users out. It is a defence against
  cross-origin form posts, not a complete CSRF defence, and it does not
  replace authentication.
- Behind a reverse proxy the "own host" is the `X-Forwarded-Host` the proxy
  wrote, and that header is client-suppliable. If your deployment is **not**
  behind a proxy that sets it, harden the gate:

```js
onRoundtrip(cfg) { cfg.check_trust_forwarded_host = false; }
```

Turning the gate off — in front of your own gateway, say — is
`cfg.check_csrf_active = false`.

### Error detail

`check_hide_error_details` applies to errors the **framework** answers with.
Errors the plugin's own route catches are already generic: the detail goes to
the server log and the caller gets a correlation id, because CDS and driver
messages carry entity names, SQL fragments and deployment paths.

## What the exit is not for

- **Not app configuration.** It is called for every request, for every app.
  App state belongs on the app instance; see [App Lifecycle](./lifecycle).
- **Not a request filter.** It shapes config, it does not accept or reject
  requests. Authentication and authorisation belong on the CAP service
  (`@requires`, `@restrict`) and on `cds.cap2ui5.requires` — see
  [Deployment](../reference/deployment).
- **Not a place for per-user secrets.** The object is registered once and
  shared by every request in the process; only the context argument is per
  request.

::: tip A hook that throws does not take the request down
The framework's defaults are already in `cfg` when your hook runs, so a hook
that raises is logged and the request is answered with those defaults. That is
deliberate — a typo in a theme name must not make the app unreachable — but it
means a hook you rely on for a *security* header can fail quietly. Check the
server log, and assert the header in a test, as the example does.
:::

→ Related: [Configuration](../reference/configuration) for the plugin's own
options; [Architecture](../reference/architecture) for where the exit sits in
the stack.
