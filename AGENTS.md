# AGENTS.md — cap2UI5 docs

Guidance for AI agents and contributors. Read before making any change.

## What this repo is

The VitePress documentation site for cap2UI5 (`docs/` holds the content,
`docs/.vitepress/config.mjs` the nav/sidebar). Build locally with
`npm ci && npx vitepress build docs`; dev server via `npx vitepress dev docs`.

Before committing, run `npm run check` — that is `verify-refs` followed by the
VitePress build. It is also what CI runs, on every pull request
(`.github/workflows/check.yml`) and on deploy. verify-refs checks that

- every path, class and `?app_start=` named in the prose resolves in a real
  cap2UI5 checkout,
- every `require("abap2UI5/…")` **inside a code fence** resolves through the
  exports map of `core/package.json` and onto a file that exists,
- every internal anchor exists.

The verifier needs a checkout: `CAP2UI5_DIR=/path/to/cap2UI5`, or a sibling
clone. It skips itself when there is none, so a green run without a checkout
proves only that the site builds.

Exceptions — placeholder class names, paths in other repos — go in
`docs/.verify-refs-ignore`, **with a reason**. An unexplained entry there is
indistinguishable from suppressing a real defect.

## Ground truth — the cap2UI5 repo layout (since the monorepo split, 2026-07)

When documenting paths or linking sources, these are the facts (verify
against the repos, don't guess):

| Repo | Role |
|---|---|
| [cap2UI5/cap2UI5](https://github.com/cap2UI5/cap2UI5) | the deployable CAP app at the repo root — **generated** by builder-cap2UI5; framework vendored at `core/` (npm package `abap2UI5`, dep `"file:./core"`) |
| [cap2UI5/builder-abap2UI5-js](https://github.com/cap2UI5/builder-abap2UI5-js) | ABAP→JS transpiler + sync pipelines (update_samples/update_backend/update_frontend); generates the core package |
| [cap2UI5/builder-cap2UI5](https://github.com/cap2UI5/builder-cap2UI5) | assembles the app from its `src/` + the mirrored core; `update_cap` publishes into the app repo |
| [cap2UI5/builder-cap2UI5-web](https://github.com/cap2UI5/builder-cap2UI5-web) | browser-build tooling (formerly `web-cap2UI5`) |
| [cap2UI5/web-cap2UI5-build](https://github.com/cap2UI5/web-cap2UI5-build) | the built static site; GitHub Pages: https://cap2ui5.github.io/web-cap2UI5-build/ |

Path conventions inside the app repo:

- framework classes: `core/srv/z2ui5/` — exactly three layers: `00/` utils,
  `01/` core plumbing (including the shipped apps in `01/04/` since the
  2026-08 upstream rename) and `02/` public API. There is no `99/`: upstream's
  frozen legacy package is deliberately not carried into the port, so
  `z2ui5_cl_xml_view`, `z2ui5_cl_xml_view_cc` and the `z2ui5_cl_pop_*` popups
  do not exist here. The one view builder is `z2ui5_cl_ui5_view_builder`.
- the vendored release is pinned: `z2ui5_if_app.version` says which one
  (1.142.0 today). On it `_bind` is one-way and `_bind_edit` two-way —
  upstream merged the two in 1.143.0, so upstream material can disagree with
  what this core does.
- bundled demo samples (pipeline-owned, flat): `core/srv/app/samples/`
- user apps: `srv/app/` (or any folder via `Z2UI5_APP_DIRS` /
  `require("abap2UI5/register-apps")(dir)`)
- webapp: `app/z2ui5/webapp/`; service: `srv/z2ui5-service.cds/.js`;
  server wiring: `srv/server.js`; draft table: `db/schema.cds`
  (`cap2ui5.z2ui5_t_01`)

## Rules

- Recommend `srv/app/` (never the samples folder) as the place for user
  apps — pipeline-owned folders are overwritten on every sync/publish.
- Deep links must use the new repo roots (no `cap2UI5/cap2UI5/…/cap2UI5/…`
  monorepo-subfolder links); verify every linked path exists.
- Run `npx vitepress build docs` before committing — it catches dead links.
