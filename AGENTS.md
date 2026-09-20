# AGENTS.md — cap2UI5 docs

Guidance for AI agents and contributors. Read before making any change.

## What this repo is

The VitePress documentation site for cap2UI5 (`docs/` holds the content,
`docs/.vitepress/config.mjs` the nav/sidebar). Build locally with
`npm ci && npx vitepress build docs`; dev server via `npx vitepress dev docs`.

Before committing, run `npm run check` — that is `verify-refs` followed by the
VitePress build. It is also what CI runs, on every pull request
(`.github/workflows/check.yml`) and on deploy. verify-refs checks that

- every path named in the prose exists in a cap2UI5 checkout,
- every `?app_start=` names an app something registers with `defineApp`,
- every `z2ui5_*` class or interface exists in the abap2UI5 source the hosted
  runtime is transpiled from,
- every `require("cap2ui5")` **inside a code fence** destructures names the
  package really exports (and the port's `require("abap2UI5/…")` is reported),
- every `cds.cap2ui5.<option>` is an option the plugin defines,
- every `1.x.y` release number is the pinned runtime release,
- every internal anchor exists.

The verifier needs **two** checkouts: `CAP2UI5_DIR=/path/to/cap2UI5` and
`ABAP2UI5_DIR=/path/to/abap2UI5`, or sibling clones. It skips the checks a
missing checkout would need, so a green run without them proves only that the
site builds. That leniency is right on a laptop and wrong in CI, which checks
both out — so CI runs `npm run check:ci`, the same two steps with
`verify-refs --require-checkout`, and a missing checkout is a failure there
rather than a silent pass.

Why two: cap2UI5 is a plugin, and the framework classes the docs name are not
in it. They are abap2UI5's ABAP, transpiled into `@abap2ui5/runtime`, whose
content is assembled by `scripts/assemble-runtime.sh` and gitignored — a fresh
cap2UI5 checkout has none of those names. Resolving classes against an
assembled runtime would pass on a laptop and check nothing in CI.

Exceptions — placeholder class names, paths in other repos — go in
`docs/.verify-refs-ignore`, **with a reason**. An unexplained entry there is
indistinguishable from suppressing a real defect.

## Generated pages

None. `docs/guide/samples.md` and `scripts/gen-samples.mjs` were deleted with
the plugin cutover: the sample catalogue they mirrored belongs to abap2UI5's
sample repository, not to this site.

## Ground truth — the cap2UI5 repo layout (since the plugin cutover, 2026-09)

When documenting paths or linking sources, these are the facts (verify
against the repos, don't guess):

| Repo | Role |
|---|---|
| [cap2UI5/cap2UI5](https://github.com/cap2UI5/cap2UI5) | the npm package `cap2ui5`: a CAP plugin that hosts upstream's transpiled runtime |
| [abap2UI5/abap2UI5](https://github.com/abap2UI5/abap2UI5) | the framework itself, in ABAP. Downported and transpiled, it is published as `@abap2ui5/runtime` |
| [cap2UI5/builder-abap2UI5-js](https://github.com/cap2UI5/builder-abap2UI5-js) | the ABAP→JS transpiler pipelines |

The three builder repos that generated the old CAP application
(`builder-cap2UI5`, `builder-cap2UI5-web`, `web-cap2UI5-build`) are archived.
There is no generated app, no vendored `core/`, no mirrored `app/z2ui5/webapp`.

Path conventions inside cap2UI5:

- `plugin/` — the package: `cds-plugin.js` (the route, the static shell, the
  auth guard), `index.cds` (the `cap2ui5.Drafts` entity), `index.js` (what
  `require("cap2ui5")` returns) and `lib/` (`define-app.js`, `define-exit.js`,
  `draft-store.js`, `runtime.js`)
- `examples/bookshop/` — a CAP project using it, with the test suite. Its apps
  are in `examples/bookshop/srv/apps/`
- `runtime/` — `@abap2ui5/runtime`. Only `package.json` and `README.md` are
  committed; `output/`, `setup/` and `webapp/` are **assembled** and gitignored
- `docs/adr/` — the decisions, ADR-008 being the cutover

What a READER's project looks like is a different thing and must not be
confused with the above: they install `cap2ui5`, write apps in `srv/apps/`
(configurable via `cds.cap2ui5.apps`), and get the route, the UI5 shell and
the draft entity from the plugin. `srv/`, `db/` and `app/` in the prose are
therefore **their** paths, which is why verify-refs does not check them
against the cap2UI5 repository.

## Rules

- Recommend `srv/apps/` as the place for apps — it is the plugin's default.
- The framework's own classes are **not importable**. An app requires
  `cap2ui5` and nothing else; `c.raw` is the escape hatch to the transpiled
  `z2ui5_if_client`.
- Measure before documenting a framework behaviour. The runtime is upstream's
  ABAP running on open-abap, and not everything upstream does works here —
  the user exit is discovered by a class-repository lookup in ABAP and had to
  be given a host-side registration (`defineExit`) instead. Boot the runtime
  and check rather than porting a claim from abap2UI5's documentation.
- Run `npm run check` before committing — verify-refs catches stale
  references, the VitePress build catches dead links.
