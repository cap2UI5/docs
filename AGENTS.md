# AGENTS.md — cap2UI5 docs

Guidance for AI agents and contributors. Read before making any change.

## What this repo is

The VitePress documentation site for cap2UI5 (`docs/` holds the content,
`docs/.vitepress/config.mjs` the nav/sidebar). Build locally with
`npm ci && npx vitepress build docs`; dev server via `npx vitepress dev docs`.

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

- framework classes: `core/srv/z2ui5/` (layers `00/` utils, `01/` core
  plumbing, `02/` public API, `99/` add-ons like the pop helpers)
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
