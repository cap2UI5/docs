# The User Exit

Everything the framework renders or sends — the tab title, the theme, the tab
icon, the UI5 bootstrap URL, the Content-Security-Policy, the response headers,
how long drafts live, whether the CSRF gate is armed — comes from one config
object. The **user exit** is the one supported way to change it.

It is a single class implementing `z2ui5_if_exit`, and it is the framework's
only extension point of this kind: there is no config file, no environment
variable for these values, and nothing to register. You write the class, the
framework finds it.

## The smallest exit

```js
// srv/app/my_exit.js
class my_exit {

  set_config_http_get(s_context, s_config) {
    s_config.title = "Order Management";
    s_config.theme = "sap_horizon_dark";
    return s_config;
  }

  set_config_http_post(s_context, s_config) {
    return s_config;
  }
}

module.exports = my_exit;
```

That is the whole contract. Both methods must exist, but either may simply hand
back what it was given.

::: warning `z2ui5_if_exit` is a contract, not a base class
Unlike `z2ui5_if_app`, it is **not** something to `extend` — it is a plain
object holding the method names, and `class my_exit extends z2ui5_if_exit`
throws at load time. The framework matches an exit by those method names alone.
If you want the check written down, assert it explicitly:

```js
const z2ui5_if_exit = require("abap2UI5/z2ui5_if_exit");
z2ui5_if_exit.check_implements(my_exit.prototype);   // throws if one is missing
```
:::

## How the framework finds it

`z2ui5_cl_ui5_user_exit` is the framework's own implementation of the same
interface. On the first request it scans the registered app directories for
**any other** class implementing `z2ui5_if_exit`, instantiates the one it
finds, and keeps it for the life of the process.

- The scan uses the same app-directory search as app classes, so put the exit
  where your apps are: [`srv/app/`](./project-structure#srv-app), or any
  directory named in `Z2UI5_APP_DIRS` / registered via
  `require("abap2UI5/register-apps")`.
- The file name must match the class name, as it must for app classes.
- **If more than one exit exists, exactly one wins** — the first by class name,
  sorted. That is deliberate rather than a race: the chosen exit controls the
  CSP and every security header, so which one wins must not depend on the order
  the file system happens to return. Ship one exit.
- If none exists, the framework defaults apply unchanged.

The framework runs its own defaults **first** and calls your exit **after**, so
`s_config` arrives fully populated. You override what you care about and leave
the rest alone. ABAP's `CHANGING` semantics map to either style in JavaScript:
mutate `s_config` in place, return it, or both — the framework accepts all
three.

## The request context

The first argument describes the request being answered:

| Field | What it is |
|---|---|
| `path` | the request path |
| `method` | the HTTP method |
| `t_params` | the URL query parameters, as `[{ n, v }]` |
| `app_start` | the `?app_start=` value, lifted out of `t_params` for convenience |
| `session_id` | the session key the framework isolates state by |
| `tenant` | the tenant, when the platform supplies one |
| `body` | the raw request body |

So the config can depend on the request — a different theme per app, for
instance:

```js
set_config_http_get(s_context, s_config) {
  if (s_context.app_start === "z2ui5_cl_smp_app_000") {
    s_config.theme = "sap_horizon";
  }
  return s_config;
}
```

The context is **per request**, not process-global: two roundtrips in flight at
the same time each see their own, so an exit cannot read the other request's
parameters.

## `set_config_http_get` — the bootstrap page

This hook builds the HTML page that boots UI5. It runs once per full page
load, not once per roundtrip.

| Field | Default | Effect |
|---|---|---|
| `title` | `abap2UI5` | the browser tab title |
| `theme` | `sap_horizon` | any UI5 theme id |
| `favicon` | an inline SVG data URI | the tab icon; set your own, or clear it and the page emits no icon link at all (the browser then falls back to `/favicon.ico`) |
| `src` | `/resources/sap-ui-core.js` | the UI5 bootstrap — the locally served runtime by default, which is what keeps the stack working offline |
| `content_security_policy` | a full `<meta>` tag | see below |
| `t_security_header` | 7 headers | `[{ n, v }]`, applied to the bootstrap response |
| `t_add_config` | — | extra `data-sap-ui-*` bootstrap attributes, as `[{ n, v }]` |

::: tip Escaping
Values are escaped for the context they land in — text, attribute or URI — so a
title with an apostrophe or an ampersand renders as written. Attribute *names*
in `t_add_config` are restricted rather than escaped: a name outside
`[A-Za-z_][A-Za-z0-9_:.-]*` is dropped.
:::

### Content-Security-Policy

The default policy allows `'unsafe-eval'` for one specific reason: the OpenUI5
1.71 `ui5loader` evaluates module source as a string, and without it that
bootstrap fails with a CSP `EvalError`. Modern UI5 does not need it. If you pin
a modern release, tighten the policy:

```js
set_config_http_get(s_context, s_config) {
  s_config.content_security_policy = s_config.content_security_policy
    .replace(" 'unsafe-eval'", "");
  return s_config;
}
```

The policy also allow-lists the public UI5 CDNs plus jsDelivr and cdnjs, and
permits `data:` — which is what makes the default inline-SVG favicon work. If
you serve everything locally, those hosts can go too.

### Security headers

The seven defaults are `cache-control: no-cache, no-store, must-revalidate`,
`Pragma: no-cache`, `Expires: 0`, `X-Content-Type-Options: nosniff`,
`X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`
and a `Permissions-Policy` allowing geolocation, microphone and camera for the
same origin only. Replace or extend the array to add your own — HSTS, for
instance, on a deployment that terminates TLS itself.

## `set_config_http_post` — the roundtrip

This hook runs on the roundtrip endpoint, the POST that every user interaction
goes through.

| Field | Default | Effect |
|---|---|---|
| `draft_exp_time_in_hours` | `4` | how long a draft stays resumable |
| `check_csrf_active` | `true` | the cross-origin POST gate |

### Draft expiry

```js
set_config_http_post(s_context, s_config) {
  s_config.draft_exp_time_in_hours = 24;
  return s_config;
}
```

A value of zero or less is ignored and the default restored — an expiry of
"never" is not something a typo should be able to configure.

::: tip One knob, not two
The CAP app's retention job deletes draft rows on the same clock: it asks this
exit for `draft_exp_time_in_hours` and follows it, so raising the expiry here
also keeps the rows around longer. `Z2UI5_DRAFT_TTL_HOURS` overrides both when
it is set — see [Configuration](../reference/configuration).
:::

### CSRF

The gate compares the `Origin` header — falling back to `Referer` — against the
app's own `Host`, and rejects a mismatch with `403 Forbidden`. The frontend
posts from the same origin, so first-party traffic is unaffected.

Two properties are worth knowing before you rely on it:

- It is **on by default** since the 2026-08 security pass. It used to be
  opt-in, and nothing opted in. If you are looking at a core vendored before
  that change, `set_config_http_post` in
  `core/srv/z2ui5/01/04/z2ui5_cl_ui5_user_exit.js` tells you which one you
  have.
- It is **lenient when there is nothing to compare**: a request carrying
  neither `Origin` nor `Referer` is allowed through, so that proxies which
  strip those headers do not lock users out. It is a defence against
  cross-origin form posts, not a complete CSRF defence, and it does not replace
  authentication.

Turn it off — in front of your own gateway, say — the same way you turn
anything else off:

```js
set_config_http_post(s_context, s_config) {
  s_config.check_csrf_active = false;
  return s_config;
}
```

## What the exit is not for

- **Not app configuration.** It is called for every request, for every app. App
  state belongs on the app instance; see [App Lifecycle](./lifecycle).
- **Not a request filter.** It shapes config, it does not accept or reject
  requests. Authentication and authorisation belong on the CAP service
  (`@requires`, `@restrict`) — see [Deployment](../reference/deployment).
- **Not a place for per-user secrets.** The instance is created once and shared
  by every request in the process; only the context argument is per request.

→ Related: [Configuration](../reference/configuration) for environment
variables, identity and the draft store; [Architecture](../reference/architecture)
for where `z2ui5_cl_ui5_user_exit` sits in the stack.
