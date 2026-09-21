# Handover — what is left

Everything that could be done without an npm token or organisation rights is
done, merged and green. **Two things remain, and they are in order**: publish
the runtime package, then point cap2UI5 at it.

The reasoning behind all of it is in [ROADMAP.md](ROADMAP.md) §§8–22 and in
`cap2UI5/cap2UI5:docs/adr/adr-008-host-not-port.md`.

## Done — verified 2026-09-21

| | |
|---|---|
| upstream, the four seams + the runtime package job | [abap2UI5/abap2UI5#2772](https://github.com/abap2UI5/abap2UI5/pull/2772) merged |
| the plugin repository | [cap2UI5/cap2UI5#72](https://github.com/cap2UI5/cap2UI5/pull/72) merged, plus #75 (CI ref) and #76 (the user exit) |
| the conformance gate, the prototype, the ADRs | [cap2UI5/builder-abap2UI5-js#29](https://github.com/cap2UI5/builder-abap2UI5-js/pull/29) merged |
| this site, migrated to the plugin | [cap2UI5/docs#20](https://github.com/cap2UI5/docs/pull/20), [#21](https://github.com/cap2UI5/docs/pull/21), [#22](https://github.com/cap2UI5/docs/pull/22) merged |
| the cutover (ADR-008 steps 3–5) | `update_cap` and `build web` disabled, `generated-app-final` tagged at `595c76f`, `builder-cap2UI5`, `builder-cap2UI5-web` and `web-cap2UI5-build` archived |
| the documentation rewrite | all 36 pages; `verify-refs` rewritten for the plugin and reading two checkouts |

`cap2UI5/cap2UI5` `main` is green end to end — runtime built from upstream
`main`, lint, 36 tests, cold test, bench, browser.

## Step 1 — the npm token, then a release

**Nothing is published yet.** `npm view @abap2ui5/runtime` and
`npm view cap2ui5` both answer 404 today, and the newest abap2UI5 release is
`1.144.0` from 2026-08-31 — before the seams merged. So the pack-and-publish
steps have never run.

The `@abap2ui5` scope on npm **already exists** and carries
`@abap2ui5/linter`, `@abap2ui5/render-runtime` and `@abap2ui5/mcp-server`, so
there is nothing to create — and nobody outside the org can take the
`@abap2ui5/runtime` name.

1. npmjs.com → the `abap2ui5` organisation → Access Tokens → **Granular**,
   packages & scopes `@abap2ui5/*`, read & write.
2. GitHub → `abap2UI5/abap2UI5` → Settings → Secrets and variables → Actions →
   `NPM_TOKEN`.
3. Cut a release as usual. `backend-prebuilt.yaml` runs on `release: published`
   and already downports, transpiles and proves the tree for the release
   tarball; the pack and publish are two steps at the end of that same job, so
   the package costs no extra build. The version comes from `package.json`, so
   the npm version is the release version.

Without the token the job packs the `.tgz`, uploads it as a workflow artefact
and emits a `::warning::` — it stays green, and the release is created before
it runs, so neither a missing token nor a registry failure can touch the
release.

## Step 2 — cap2UI5: switch to the published package

In `cap2UI5/cap2UI5`, after step 1. Today the repository runs on a **stand-in**
`runtime/` that `scripts/assemble-runtime.sh` fills from a source build; the
point of this step is to stop doing that.

```bash
scripts/assemble-runtime.sh --package X.Y.Z   # the real package, not a build
npm install && npm run lint && npm test && npm run cold-test
```

Then, in one PR:

- `plugin/package.json`: pin `"@abap2ui5/runtime": "^X.Y.Z"` instead of `"*"`.
- `.github/workflows/ci.yml`: set the `runtime_version` input's default to
  `X.Y.Z`. `upstream_ref` already defaults to `main`, so the job builds from
  source until you do. **Keep the `permissions: contents: read` block** — it is
  what bounds a job that runs another repository's build scripts.
- `runtime/README.md` and `runtime/package.json`: drop the "stand-in" wording.
- The docs say `1.144.0` in two places
  (`reference/configuration`, `reference/deployment`). `verify-refs` reads
  the pin out of `runtime/package.json`, so a bump fails this repository's
  check until the prose follows — that is the gate doing its job, not a
  problem to work around.

Publishing `cap2ui5` itself is the same shape and can follow whenever you want
`npm i cap2ui5` to work; nothing else depends on it.

## Still open — decisions that are yours, not mine

- **`requires: "authenticated-user"` as the plugin default.** Anonymous callers
  get 401. A demo site wants `null`. I chose the closed default; overrule in
  `plugin/package.json#cds.cap2ui5.requires`. Note what `null` costs: every
  caller is then `anonymous` and therefore shares one draft owner — the
  documented consequence of turning authentication off, not a defect.
- **Whether `renderArg` should bound the output as well as the walk.**
  Upstream's cap stops the *walk* at 1,000 nodes; a 3,000-key lookup still
  produces ~49 KB before the 2,000-character cut, because the markers are about
  as long as the values they replace. Giving objects the head-plus-marker
  treatment arrays already get would fix that. It is a behaviour change, so it
  is yours to want.
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
- Anything on npmjs.com or in repository settings — no rights, which is what
  step 1 is.
- Reach `app-template`, `samples`, `samples-controls` or `samples-stack` — they
  are outside this session's repository access.
- Render against the **current** UI5 release: this sandbox reaches npm but no
  CDN, and `openui5-dist` on npm stops at 1.108. CI renders against the CDN on
  a runner and is green there — `ci.yml` in `cap2UI5/cap2UI5`, browser tests
  green, screenshots uploaded as an artefact on every run.
