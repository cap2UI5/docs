# Handover — what is left

Both packages are **on npm** since 2026-09-27: `cap2ui5@0.1.0` and
`@abap2ui5/node-runtime@1.145.0`, which `cap2ui5` pins exactly. The two steps
this file used to list — publish the runtime package, then point cap2UI5 at
it — are done. What remains is below.

The runtime package was renamed from `@abap2ui5/runtime` before it was ever
published; older text in [ROADMAP.md](ROADMAP.md) uses the old name.

The reasoning behind all of it is in [ROADMAP.md](ROADMAP.md) §§8–25 and in
`cap2UI5/cap2UI5:docs/adr/adr-008-host-not-port.md`.

## Done — verified 2026-09-27

| | |
|---|---|
| upstream, the four seams + the runtime package job | [abap2UI5/abap2UI5#2772](https://github.com/abap2UI5/abap2UI5/pull/2772) merged |
| the plugin repository | [cap2UI5/cap2UI5#72](https://github.com/cap2UI5/cap2UI5/pull/72) merged, plus #75 (CI ref), #76 (the user exit), #77 (publishable package, consumer test) and #79 (`@abap2ui5/node-runtime`, startup addresses, trusted publishing) |
| the conformance gate, the prototype, the ADRs | [cap2UI5/builder-abap2UI5-js#29](https://github.com/cap2UI5/builder-abap2UI5-js/pull/29) merged |
| this site, migrated to the plugin | [cap2UI5/docs#20](https://github.com/cap2UI5/docs/pull/20), [#21](https://github.com/cap2UI5/docs/pull/21), [#22](https://github.com/cap2UI5/docs/pull/22) merged |
| the cutover (ADR-008 steps 3–5) | `update_cap` and `build web` disabled, `generated-app-final` tagged at `595c76f`, `builder-cap2UI5`, `builder-cap2UI5-web` and `web-cap2UI5-build` archived |
| publishing | `cap2ui5@0.1.0` and `@abap2ui5/node-runtime@1.145.0` on npm; the site's quickstart runs verbatim against them (`cds init --nodejs`, `npm install cap2ui5`, `cds watch`) |

## Open — the approuter and CSRF

`cds add approuter` generates a catch-all route with `"csrfProtection": true`,
and the frontend in runtime 1.145.0 sends no `X-CSRF-Token`, so behind that
route every roundtrip gets 403. The site documents the working setup — an
extra route for the roundtrip path with `"csrfProtection": false`, safe
because abap2UI5 refuses a cross-origin POST itself
(`docs/reference/deployment.md`).
[abap2UI5/abap2UI5#2802](https://github.com/abap2UI5/abap2UI5/pull/2802) (open)
teaches the frontend the token handshake. Once it is in a release and
`cap2ui5` pins that release, drop the extra route from the deployment page and
the known limit from `guide/roadmap.md`.

Not exercised at all so far: a real HANA or BTP deployment. The deployment
page says so.

## Still open — decisions that are yours, not mine

- **`requires: "authenticated-user"` as the plugin default.** Anonymous callers
  get 401. A demo site wants `null`. I chose the closed default; overrule in
  `plugin/package.json#cds.cap2ui5.requires`. Note what `null` costs: every
  caller is then `anonymous` and therefore shares one draft owner — the
  documented consequence of turning authentication off, not a defect.
- **Whether `renderArg` should bound the output as well as the walk** —
  now a pull request to say yes or no to:
  [abap2UI5/abap2UI5#2774](https://github.com/abap2UI5/abap2UI5/pull/2774).
  It is a behaviour change, so it stayed yours; what it gains is measured
  rather than estimated, on that tree:

  | shape | before | after |
  |---|---|---|
  | flat object, 3,000 scalar keys | 45,781 chars | **245** |
  | map-shaped, 3,000 object values | 63,654 chars | **575** |
  | array, 3,000 items | 129 | 129 |
  | array of 3,000 objects | 459 | 459 |

  All of it built on every `console.log` of such a value and then thrown away
  by the 2,000-character cut. The estimate in this file used to say "~49 KB";
  the map-shaped case is worse than that. It also makes #2771's original
  assertion true as written, and the test from #2773 says so.
- **Where the docs live** — `cap2UI5/docs` stays, or becomes a folder in the
  plugin repo. Less urgent than it was: the rewrite is done either way, and
  moving it now is a `git mv` plus the two workflows.
- **`builder-abap2UI5-js`**: still active and still running its nightly
  pipeline (it mirrored and transpiled upstream `ad0a2dd` today, and its oracle
  classification improved — 1,285 green methods, up from 1,272, because the
  seams merged). ADR-008 archives it *after* the conformance suite is copied
  where it should live. Its two red suites (`cs_event` constants, the
  `upstream-units` ratchet) are `main`'s, both have a proposed patch on
  [#29](https://github.com/cap2UI5/builder-abap2UI5-js/pull/29), and both are
  work on a repository that is going away — worth deciding whether to fix them
  at all, or to let the archive settle it.
- The four deploy keys (`ACTION_KEY_CAP`, `ACTION_KEY_APP`, `ACTION_KEY_WEB`,
  `BUILT_DEPLOY_KEY`) can go from the archived repositories' secrets.

## What I could not do, and why

- Merge anything, or approve my own pull requests. (The merges above were
  yours.)
- Anything on npmjs.com or in repository settings — no rights. Publishing was
  done by the maintainers.
- Reach `app-template`, `samples`, `samples-controls` or `samples-stack` — they
  are outside this session's repository access.
- Render against the **current** UI5 release: this sandbox reaches npm but no
  CDN, and `openui5-dist` on npm stops at 1.108. CI renders against the CDN on
  a runner and is green there — `ci.yml` in `cap2UI5/cap2UI5`, browser tests
  green, screenshots uploaded as an artefact on every run.
