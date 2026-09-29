# Troubleshooting

Before anything else: press **`Ctrl+F12`**. The [developer tools](./devtools)
answer most of what follows in one look — which app is serving, what the last
roundtrip sent and received, and whether something threw.

## Setup problems

### The `cds` command is not found

`npm i -g @sap/cds-dk` succeeded, but the shell answers that `cds` is not
recognized. A terminal that was open during the install does not see the new
command yet — open a new one. `cds version` must then list
`@sap/cds-dk (global)` with a `10.x` version.

On Windows PowerShell the error can instead say that *running scripts is
disabled on this system*: PowerShell refuses the `cds.ps1` shim npm installed.
Allow locally installed scripts for your user once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### `EACCES` on `npm i -g`

On macOS and Linux, a Node.js installed system-wide keeps its global packages
in a directory your user cannot write. Do not work around it with `sudo`:
install Node.js with [nvm](https://github.com/nvm-sh/nvm), which keeps
everything in your home directory, and run `npm i -g @sap/cds-dk` again.

### `port 4004 is already in use`

```
[EADDRINUSE] - port 4004 is already in use by another server process.
```

Another `cds watch` still runs, usually in a different terminal. Stop it with
`Ctrl+C` there, or start this one on another port with
`cds watch --port 4005` — the `[cap2ui5]` lines then print the new address.

### The browser asks for a login

That is expected: the route requires a user, and `cds watch` uses CAP's
mocked authentication. Log in as **`alice` with an empty password** — the
startup line names it: `[cap2ui5] - development login: alice (empty password)`.
Only cancelling the dialog is refused, with a `401`, and the next attempt asks
again.

Mocked authentication lets other names in as well, but a draft belongs to the
user who created it — log in as someone else and a running session starts
over. The details are under *401 or 403 on the roundtrip* below.

## "App with name X not found"

Apps are registered by **`defineApp`**, not found by file name:

1. **The name is the first argument to `defineApp`**, uppercased —
   `defineApp("ZCL_HELLO", …)` is started with `?app_start=ZCL_HELLO`. The file
   name is irrelevant, and one file may register several apps.
2. **The file must be in the scanned directory** — `srv/apps` by default, or
   whatever `cds.requires.cap2ui5.apps` points at. Every `.js`, `.mjs` and `.cjs` in it
   is imported once the runtime is up.
3. **The plugin says how many it loaded.** On startup:

   ```
   [cap2ui5] - 5 app module(s) loaded from srv/apps
   ```

   A count of `0`, or no line at all, is a path problem rather than a code
   problem — the directory does not exist where the plugin looked.

4. **A `defineApp` that throws takes its file with it.** A class without a
   `main( client )` method throws at registration, and the message names the
   app.

`client.nav_app_call()` with a name no app is registered under is refused
where you called it — rather than failing later as `NAV_APP_TARGET_NOT_BOUND`.

## The server does not start: `require is not defined in ES module scope`

`cds watch` stops before it listens, and the error names an app file:

```
ReferenceError: require is not defined in ES module scope, you can use import instead
```

The project is an **ES module project** (`"type": "module"` in
`package.json`, which is what `cds init --nodejs` creates), and an app file in
it uses `require("@cap2ui5/cds-plugin")`. The plugin loads the apps before the
server listens, and an app module that fails to load fails the start — as a
service implementation does. Write
`import { defineApp } from "@cap2ui5/cds-plugin"` instead, or rename the file
to `.cjs`, where `require` stays valid.

The same holds for any other error an app module throws while it loads: the
start fails and the log names the module.

## The draft cannot be restored

Symptom: `NO_DRAFT_ENTRY_OF_PREVIOUS_REQUEST_FOUND`, or the app restarts from
scratch on every interaction.

- **The server restarted.** The most common case in development: you saved a
  file, `cds watch` restarted with a fresh in-memory database, and the tab
  still holds the id of a draft that no longer exists. Reload the tab. To keep
  drafts across restarts, use a SQLite file — see
  [Persistence](./persistence#keep-the-data-across-restarts).
- **A different user is asking.** Draft rows are bound to their owner and are
  not readable by anyone else — by design (see [Database](../reference/database)).
  A draft id from someone else's session, or from before you logged in as
  someone else, will not load.
- **The row expired.** Drafts older than `draft_exp_time_in_hours` (4 hours by
  default) are deleted on the next roundtrip. Raise it in your
  [user exit](./user-exit#onroundtrip) while debugging — the cleanup follows
  the same number, so the rows stay as long as the framework will resume them.
- **The app class is gone.** Restoring revives the app named in the row; if
  the `defineApp` id has been renamed, or the file no longer loads, the row is
  readable but not revivable.
- **The table is empty after a restart.** `cap2ui5.Drafts` is an ordinary CDS
  entity, so it lives wherever your project's database does. With an in-memory
  SQLite (`cds.requires.db.kind: sql` in development) every restart is a fresh
  database — which is a database setting, not a cap2UI5 one.

## A white page

The bootstrap HTML arrived but UI5 never started.

- **Open the browser console first** — a CSP violation or a failed load of
  `sap-ui-core.js` shows there immediately.
- **The server has no outbound internet access.** The page embeds the
  abap2UI5 frontend, not UI5 itself: it bootstraps from
  `https://sdk.openui5.org/…/sap-ui-core.js`, and there is no `/resources`
  route to fall back to. In an air-gapped or egress-restricted deployment,
  host a UI5 distribution yourself and point `cfg.src` at it in your
  [user exit](./user-exit#onpage) — the CSP has to
  allow that origin too.
- **A proxy or the CSP blocks the CDN.** The default policy allow-lists the
  SAP and OpenUI5 hosts; if you tightened it, or a corporate proxy rewrites
  the origin, the console says which directive refused.
- **The app uses commercial SAPUI5 controls.** `sdk.openui5.org` serves the
  open-source libraries only. Anything under `sap.suite.*`, `sap.gantt`,
  `sap.ui.comp` needs the SAPUI5 CDN — point `cfg.src` at it in your
  [user exit](./user-exit#onpage).
- **A CSP `EvalError` on old UI5.** The 1.71 `ui5loader` needs
  `'unsafe-eval'`; if you tightened the policy, that is why.

## The control is missing or renders wrong

Almost always a UI5 version problem rather than a cap2UI5 one: the control,
property, aggregation, enum value or icon does not exist in the release you
are running. **System → Environment** shows the UI5 version in use. Check the
control against that version's API reference — a name added in 1.120 is simply
absent in 1.71 and UI5 renders nothing rather than complaining.

## Nothing happens when I click

- **The event has no handler.** Check **Roundtrips → Request**: if the event
  name is in the payload, the server got it and your `on_event` did not match
  it. If it is not, the binding never fired.
- **The handler ran but built no view.** A roundtrip that returns without
  calling `view_display` leaves the previous view in place, which looks
  exactly like nothing happening. **Roundtrips → Response** shows whether a
  view came back.

## 401 or 403 on the roundtrip

**401** means the caller is not logged in. The route requires an authenticated
user by default — `cds.requires.cap2ui5.roles` is `["authenticated-user"]`. In development CAP's mocked auth applies, so any
configured user works (`alice` with an empty password in a stock project). In
BTP the approuter must forward the token (`HTML5.ForwardAuthToken`).

**403** from the plugin means the user is logged in but has none of the roles
in `cds.requires.cap2ui5.roles`; the error names the roles. (A 403 that carries
`x-csrf-token: Required` comes from the approuter instead — see the next
section.)

The decision happens **before** the body is read, so an unauthenticated POST is
refused without the payload being buffered. To open the route deliberately, set
`roles` to `any` — and read what that costs in
[Configuration](../reference/configuration).

## 403 on the roundtrip behind the approuter

The page loads, the first click fails with `403`, and the response carries
`x-csrf-token: Required`. That is the approuter, not the plugin: the route
`cds add approuter` generates has `"csrfProtection": true`, and the abap2UI5
frontend in the pinned runtime sends no CSRF token. Give the roundtrip path a
route of its own with `"csrfProtection": false` — the exact route, and why it
is safe, are in [Deployment](../reference/deployment#the-approuter-needs-one-extra-route-today).

## Two users see each other's state

Almost always one cause: **`cds.requires.cap2ui5.roles` is `any` or `null`.** Every caller is
then CAP's anonymous user, and the draft store binds a session to
`cds.context.user.id` — so all anonymous visitors share one owner and therefore
each other's sessions. That is the documented consequence of turning
authentication off, not a defect.

With authentication on, a draft answers to its creator and to nobody else. If
you see otherwise with `roles` set, that is a bug worth reporting — check
the `owner` column of `cap2ui5.Drafts` first:

```sql
SELECT id, owner FROM cap2ui5_Drafts ORDER BY createdAt DESC LIMIT 5;
```

An `owner` reading `anonymous` where you expected a user name means the caller
was not authenticated, not that the binding failed.

## Still stuck

Collect from **Roundtrips**: the request payload, the response, and the error
from **Problems**. Then see [where to report it](./ecosystem#where-to-report) —
which repository takes the issue depends on which layer produced it.
