# Troubleshooting

Before anything else: press **`Ctrl+F12`**. The [developer tools](./devtools)
answer most of what follows in one look — which app is serving, what the last
roundtrip sent and received, and whether something threw.

## "App with name X not found"

Apps are registered by **`defineApp`**, not found by file name:

1. **The name is the first argument to `defineApp`**, uppercased —
   `defineApp("ZCL_HELLO", …)` is started with `?app_start=ZCL_HELLO`. The file
   name is irrelevant, and one file may register several apps.
2. **The file must be in the scanned directory** — `srv/apps` by default, or
   whatever `cds.cap2ui5.apps` points at. Every `.js`, `.mjs` and `.cjs` in it
   is imported once the runtime is up.
3. **The plugin says how many it loaded.** On startup:

   ```
   [cap2ui5] 5 app module(s) loaded from srv/apps
   ```

   A count of `0`, or no line at all, is a path problem rather than a code
   problem — the directory does not exist where the plugin looked.

4. **A `defineApp` that throws takes its file with it.** A class without a
   `main( client )` method throws at registration, and the message names the
   app.

`c.navTo()` on an unknown name is refused where you called it, listing what is
registered — rather than failing later as `NAV_APP_TARGET_NOT_BOUND`.

## The draft cannot be restored

Symptom: `NO_DRAFT_ENTRY_OF_PREVIOUS_REQUEST_FOUND`, or the app restarts from
scratch on every interaction.

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
- **The server has no outbound internet access.** The plugin serves the
  abap2UI5 shell, not UI5 itself: the page bootstraps from
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

## 401 on the roundtrip

The route requires an authenticated user by default — `cds.cap2ui5.requires` is
`"authenticated-user"`. In development CAP's mocked auth applies, so any
configured user works (`alice` with an empty password in a stock project). In
BTP the approuter must forward the token (`HTML5.ForwardAuthToken`).

The decision happens **before** the body is read, so an unauthenticated POST is
refused without the payload being buffered. To open the route deliberately, set
`requires` to `null` — and read what that costs in
[Configuration](../reference/configuration).

## Two users see each other's state

Almost always one cause: **`cds.cap2ui5.requires` is `null`.** Every caller is
then CAP's anonymous user, and the draft store binds a session to
`cds.context.user.id` — so all anonymous visitors share one owner and therefore
each other's sessions. That is the documented consequence of turning
authentication off, not a defect.

With authentication on, a draft answers to its creator and to nobody else. If
you see otherwise with `requires` set, that is a bug worth reporting — check
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
