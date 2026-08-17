# Troubleshooting

Before anything else: press **`Ctrl+F12`**. The [developer tools](./devtools)
answer most of what follows in one look — which app is serving, what the last
roundtrip sent and received, and whether something threw.

## "App with name X not found"

The class lookup matches **files by name**, so:

1. **The file must be named exactly `<className>.js`.** A class
   `my_app` in `apps.js` is invisible.
2. **The file must be in a searched directory.** In order: the framework
   folders (`core/srv/z2ui5/01/04/`, `02/`, `99/02/`), the core's app folder
   (`core/srv/app/`, including `samples/`), anything registered via
   `register_app_dir` / `register-apps`, and everything in `Z2UI5_APP_DIRS`.
   Subfolders are searched recursively.
3. **Names are case-insensitive.** `MyApp` and `myapp` collide — the lookup
   lowercases both.

Check the **System → Registry** tab: it lists exactly what the lookup can
resolve. If your class is not in that list, it is a path or naming problem,
not a code problem.

## The draft cannot be restored

Symptom: `NO_DRAFT_ENTRY_OF_PREVIOUS_REQUEST_FOUND`, or the app restarts from
scratch on every interaction.

- **A different user is asking.** Draft rows are bound to their owner and are
  not readable by anyone else — by design (see [Database](../reference/database)).
  A draft id from someone else's session, or from before you logged in as
  someone else, will not load.
- **The row expired.** Retention deletes drafts older than
  `Z2UI5_DRAFT_TTL_HOURS` (24h default). Set it to `0` while debugging.
- **The class moved.** Restoring deserializes into the class named in the row;
  if the file has been renamed or moved out of the lookup path since it was
  written, the row can be read but not revived.
- **No store is injected.** If the log says *"no draft store injected — using
  a volatile in-memory store"*, drafts die with the process. The CAP app wires
  one in `srv/server.js`; a custom host has to call `engine.set_store(...)`.

## A white page

The bootstrap HTML arrived but UI5 never started.

- **Open the browser console first** — a CSP violation or a 404 on
  `/resources/sap-ui-core.js` shows there immediately.
- **`/resources` 404s.** The local UI5 runtime comes from the `openui5-dist`
  dependency. Run `npm ci`. The server now fails at startup with an explicit
  message when it cannot resolve it.
- **The app uses commercial SAPUI5 controls.** `openui5-dist` ships only the
  open-source libraries. Anything under `sap.suite.*`, `sap.gantt`,
  `sap.ui.comp` needs the SAPUI5 CDN — point `s_config.src` at it in your
  [user exit](../reference/configuration#the-user-exit).
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

`POST /rest/root/z2ui5` and the OData services require an authenticated user;
`GET`/`HEAD` do not (they serve only the bootstrap shell). In development the
mocked users from `package.json` apply — the reference project ships `alice`
and `bob`. In BTP the approuter must forward the token
(`HTML5.ForwardAuthToken`).

## Two users see each other's state

That is a misconfiguration, not the design. Retained sticky app state is keyed
per session by the identity provider; with no provider installed every user
shares one key. Check that `engine.set_identity(...)` is wired — see
[Configuration](../reference/configuration#identity).

## The playground behaves differently from my app

The [playground](./playground) is the same framework with no backend: drafts
live in browser memory (bounded, so deep back-navigation eventually drops the
oldest), there is no database, no OData, and no remote calls. Differences in
persistence and anything server-side are expected there.

## Still stuck

Collect from **Roundtrips**: the request payload, the response, and the error
from **Problems**. Then see [where to report it](./ecosystem#where-to-report) —
which repository takes the issue depends on which layer produced it.
