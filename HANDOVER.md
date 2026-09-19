# Handover — the final round, step by step

Everything that could be done without organisation rights, an npm token or a
merge is done and pushed on `claude/happy-turing-qt6ljo` in three repositories.
This page is the list of what only a person can do, in the order that works,
with the text and commands ready. The reasoning is in [ROADMAP.md](ROADMAP.md)
§§8–16 and in `builder-abap2UI5-js/docs/adr-008-host-not-port.md`.

## Where things are

| repo | branch `claude/happy-turing-qt6ljo` carries |
|---|---|
| `abap2UI5/abap2UI5` | the four seams (`z2ui5_if_ui5_draft_store`, `z2ui5_if_ui5_app_serializer`, the guarded codepage fallback, `c_protocol`) and the `runtime` job in `release.yaml` + `node/package.json` |
| `cap2UI5/builder-abap2UI5-js` | the conformance gate, ADR-006/007/008, and `docs/prototypes/open-abap-cap/` — the plugin workspace with 15 tests, cold test, bench, browser test, `prototype.yml` |
| `cap2UI5/docs` | ROADMAP §§8–16, this page |

## Step 1 — upstream: open and merge the seams PR

Repository `abap2UI5/abap2UI5`, base `main`, head `claude/happy-turing-qt6ljo`.
Five commits; the last one adds the `runtime` job. Lead with Naht 3: it is a
reproducible bug, not a feature request.

Suggested title: **Four seams for hosting the framework outside SAP, and the transpiled runtime as a package**

Suggested body:

> **Why.** abap2UI5 already runs on Node (`npm run express`). Hosting it in
> anything else — a CAP plugin is the case in hand, see cap2UI5 — needed four
> small openings in the framework, none SAP-specific, plus a way to consume
> `node/output` without cloning and transpiling the repository.
>
> **1. `z2ui5_if_ui5_draft_store`** — the draft persistence behind an
> interface, `z2ui5_cl_ui5_srv_draft=>set_instance( )` to swap it. The default
> is byte-identical to today (a fresh `NEW` per call). Owner-binding contract
> documented in ABAP Doc.
>
> **2. `z2ui5_if_ui5_app_serializer`** — `all_xml_stringify`/`all_xml_parse`
> behind an interface (`REF TO object` on both ends: an interface may not
> reference a class here, `cyclic_oo`). The default is the existing
> `CALL TRANSFORMATION id`.
>
> **3. Guarded codepage fallback** — `conv_get_string_by_xstring` /
> `conv_get_xstring_by_string` chained both failures into
> `UNSUPPORTED_CODEPAGE_API`, and `z2ui5_cl_ui5_view_builder` degrades with
> `CLEAR gv_escape_controls` instead of failing. **This is a bug fix:** on a
> runtime without the codepage class the previous code hung the view builder;
> `build_core` in cap2UI5 produced a hanging core for weeks without any gate
> noticing. Reproduction: cap2UI5's `test/core-runnable.test.js`, red before,
> green after.
>
> **4. `c_protocol`** — `S_FRONT.PROTOCOL` on every response,
> `app/webapp/core/Server.js` checks it. The `S_ACTION` envelope replacing
> `S_FRONT.PARAMS` was exactly the kind of change this now names; a host
> pairing halves of different ages fails loudly instead of reading an empty
> key.
>
> **5. `@abap2ui5/runtime`** — a second job in `release.yaml` packs
> `node/output` + `node/setup/setup.mjs` + `app/webapp` as an npm package at
> the framework's version, uploads the tarball as an artefact on every run and
> publishes only from a tag and only with an `NPM_TOKEN` (warns without one,
> stays green). Dry run: 1,307 files, 1.5 MB packed. No `type` field in
> `node/package.json` on purpose — the playwright configs beside it are CJS.
>
> All gates green locally (`check:abapgit`, `check:naming`, `check:atc`,
> `check_visibility`, `check:dynamic`, `check:standard`, `check:cloud`,
> `check:app2abap`, `check:eslint`, `check:conventions`, `agents-commands`).
> AGENTS.md documents each seam and the package.

If the organisation does **not** want to publish to npm, merge without the
last commit (`3006336`) and tell cap2UI5; the fallback is a `cap2UI5/runtime`
repository that clones-and-publishes (ADR-008 names it as the fallback only).

## Step 2 — upstream org: the npm token, then a release

1. npmjs.com → the `abap2ui5` organisation (create it if it does not exist;
   the scope is `@abap2ui5`) → Access Tokens → **Granular**, packages &
   scopes: `@abap2ui5/*`, read & write, no 2FA bypass needed for provenance
   publishes from Actions.
2. GitHub → `abap2UI5/abap2UI5` → Settings → Secrets and variables → Actions →
   `NPM_TOKEN`.
3. Cut the next release as documented in `release.yaml` (changelog section,
   `npm run check:release`, `git tag X.Y.Z && git push --follow-tags`). The
   `runtime` job publishes `@abap2ui5/runtime@X.Y.Z`. Without the token it
   uploads the tarball and warns — nothing else changes.

## Step 3 — cap2UI5: switch the prototype to the published package (PR)

In `builder-abap2UI5-js`, after step 2:

```bash
cd docs/prototypes/open-abap-cap
scripts/assemble-runtime.sh --package X.Y.Z     # replaces the stand-in with the real package
npm install && npm test && npm run --workspace example cold-test
```

Then in `.github/workflows/prototype.yml` set the upstream ref default to
`main` (the comment on it says so), and delete `runtime/README.md`'s "stand-in"
paragraph. One PR.

## Step 4 — cap2UI5 org: the repository cutover (ADR-008 steps 3–5)

Order matters: the builders push into `cap2UI5/cap2UI5` nightly and would
overwrite the plugin.

1. **Disable the writers first**: `builder-cap2UI5` → Actions → `update_cap` →
   Disable workflow; `builder-cap2UI5-web` → `build web` → Disable.
2. `cap2UI5/cap2UI5`: tag the current `main` as `generated-app-final`.
3. Merge the branch `claude/happy-turing-qt6ljo` of `cap2UI5/cap2UI5` — it
   already carries the plugin repository layout (`plugin/`,
   `examples/bookshop/`, `runtime/`, `scripts/`, `.github/workflows/ci.yml`,
   README, AGENTS). See the PR text below.
4. Settings → Pages: source = GitHub Actions (the docs site moves later, or
   stays in `cap2UI5/docs` — taste).
5. Archive `builder-cap2UI5`, `builder-cap2UI5-web`, `web-cap2UI5-build`.
   Then `builder-abap2UI5-js` **after** its ADRs and the conformance suite
   have been copied where they should live (the plugin repo has them from
   step 3 of ADR-008).
6. Delete the four deploy keys (`ACTION_KEY_CAP`, `ACTION_KEY_APP`,
   `ACTION_KEY_WEB`, `BUILT_DEPLOY_KEY`) from the archived repositories'
   secrets.

Suggested PR title for `cap2UI5/cap2UI5`: **cap2UI5 is a CAP plugin hosting @abap2ui5/runtime — replace the generated app**

> This replaces the generated app with the plugin's source: `plugin/` (the
> npm package `cap2ui5`: `cds-plugin.js`, `index.cds`, `lib/`),
> `examples/bookshop/` (a CAP project using it, with the tests), `runtime/`
> (the `@abap2ui5/runtime` stand-in until upstream publishes), `scripts/`
> and `.github/workflows/ci.yml`. The generated app is tagged
> `generated-app-final`. Decision and evidence: ADR-008 in
> builder-abap2UI5-js; measurements: 566 hand-written lines against 16,874,
> 14 ms/roundtrip, drafts owner-scoped in a CDS entity, state through
> SIGKILL, three users concurrent, rendered in Chromium.
>
> Before merging: disable `update_cap` in builder-cap2UI5, or it overwrites
> this on the next night.

## Step 5 — decisions that are yours, not mine

- **`requires: "authenticated-user"` as the plugin default.** Anonymous callers
  get 401. A demo site wants `null`. I chose the closed default; overrule in
  `plugin/package.json#cds.cap2ui5.requires`.
- **The facade's next slice** (popups, navigation, nested views). Decide on
  real apps; `c.raw` covers everything until then.
- **Where the docs live** — `cap2UI5/docs` stays, or becomes a folder in the
  plugin repo.

## What I could not do, and why

- Open pull requests or issues (not asked; outward-facing).
- Anything on npmjs.com or in repository settings (no rights).
- Render against the **current** UI5 release: the sandbox reaches npm but no
  CDN; `openui5-dist` on npm stops at 1.108. `prototype.yml` renders against
  the CDN on a runner — it has not run yet, because nothing on the branch
  triggers it until a PR exists or someone dispatches it.
