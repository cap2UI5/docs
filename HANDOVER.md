# Handover — the final round, step by step

Everything that could be done without organisation rights, an npm token or a
merge is done and pushed on `claude/happy-turing-qt6ljo` in four repositories.
This page is the list of what only a person can do, in the order that works.
The reasoning is in [ROADMAP.md](ROADMAP.md) §§8–21 and in
`cap2UI5/cap2UI5:docs/adr/adr-008-host-not-port.md`.

Every pull request already carries its own description — this page does **not**
repeat them, it says what to do with them.

## Where things are

| repo | branch `claude/happy-turing-qt6ljo` carries |
|---|---|
| `abap2UI5/abap2UI5` | the four seams — `z2ui5_if_ui5_draft_store`, `z2ui5_if_ui5_serializer`, the guarded codepage fallback, `c_protocol` — and the `@abap2ui5/runtime` npm package, packed by two steps at the end of `backend-prebuilt.yaml` from the manifest `node/setup/runtime.package.json` |
| `cap2UI5/cap2UI5` | **the plugin itself**: `plugin/` (774 lines, 485 of them code), `examples/bookshop/` (7 test files, 24 tests, cold test, bench, browser), `runtime/`, `scripts/assemble-runtime.sh`, `.github/workflows/ci.yml` |
| `cap2UI5/builder-abap2UI5-js` | the conformance gate, ADR-006/007/008 and the prototype the plugin grew out of — the record of how it was measured |
| `cap2UI5/docs` | ROADMAP §§8–21, this page |

## The pull requests

All four are open. None can be merged by me.

| | | state |
|---|---|---|
| upstream, the four seams + the runtime package | [abap2UI5/abap2UI5#2772](https://github.com/abap2UI5/abap2UI5/pull/2772) | 20/22 green; 2 red are `main`'s, root-caused below |
| the plugin repository | [cap2UI5/cap2UI5#72](https://github.com/cap2UI5/cap2UI5/pull/72) | green, `clean` |
| the conformance gate, the prototype, the ADRs | [cap2UI5/builder-abap2UI5-js#29](https://github.com/cap2UI5/builder-abap2UI5-js/pull/29) | `conformance` + `prototype` green; `test` red on `main` too |
| these pages | [cap2UI5/docs#20](https://github.com/cap2UI5/docs/pull/20) | green |

## Step 1 — upstream: review and merge #2772

Nine commits. **Lead the review with seam 3**: it is a reproducible bug, not a
feature request, and it is the one that cost a downstream project weeks.

The PR body is written and current — read it there rather than here. One thing
in it needs a **decision and not a review**: part 5 publishes
`@abap2ui5/runtime` to npm. If the organisation does not want that, drop that
commit and the four seams stand on their own; tell cap2UI5, whose fallback
(ADR-008) is a `cap2UI5/runtime` repository that clones and publishes.

### The two red checks are not the branch's, and here is why

Both were root-caused on 2026-09-20 and the evidence is in
[a comment on the PR](https://github.com/abap2UI5/abap2UI5/pull/2772). The
branch touches none of the four files involved.

- **`test_unit_js` → `devtoolsConsole › bounds the nodes of a map-shaped
  object`.** The test was **merged red by `1f2cccb` (#2771), which is `main`'s
  head** — that commit added both `MAX_NODES` and this test, so it has never
  passed. Its third assertion asks a `JSON.stringify` replacer to remove a
  *key*, which a replacer cannot do: it answers a key's **value**. A
  three-line patch that asserts the property the cap actually has is in the
  comment, verified green (29/29) and verified to discriminate.
- **`check_gates` → `shared-file-gate`.** Four drifts, and #2771's own commit
  message predicts one of them: *"check:shared stays red until that follow-up
  lands"* (the `app-template` mirror of `building-apps.md`). The other three
  are `sync-shared.yaml` against `samples`, `samples-controls` and
  `samples-stack`, introduced by **#2719 on 2026-09-05**, two weeks before this
  branch existed; those repositories re-sync on a weekly cron, so the gate goes
  green on their next run. Nothing to fix in `abap2UI5` — it is the source of
  truth for that file already.

## Step 2 — upstream org: the npm token, then a release

The `@abap2ui5` scope on npm **already exists** and carries `@abap2ui5/linter`,
`@abap2ui5/render-runtime` and `@abap2ui5/mcp-server`, so there is nothing to
create — and nobody outside the org can take the `@abap2ui5/runtime` name.

1. npmjs.com → the `abap2ui5` organisation → Access Tokens → **Granular**,
   packages & scopes `@abap2ui5/*`, read & write.
2. GitHub → `abap2UI5/abap2UI5` → Settings → Secrets and variables → Actions →
   `NPM_TOKEN`.
3. Cut a release as usual. `backend-prebuilt.yaml` already downports,
   transpiles and proves the tree for the release tarball; the pack and publish
   are two steps at the end of that same job, so the package costs no extra
   build. Without the token the job uploads the `.tgz` as a workflow artefact
   and warns — it stays green, and the release is created before it runs, so
   neither a missing token nor a registry failure can touch the release.

## Step 3 — cap2UI5: switch to the published package (PR)

In **`cap2UI5/cap2UI5`** — not in the builder repo; the plugin moved here — 
after step 2:

```bash
scripts/assemble-runtime.sh --package X.Y.Z   # replaces the stand-in with the real package
npm install && npm run lint && npm test && npm run cold-test
```

Then:

- `plugin/package.json`: pin `"@abap2ui5/runtime": "^X.Y.Z"` instead of `"*"`.
- `.github/workflows/ci.yml`: set the `runtime_version` input's default to
  `X.Y.Z`, or set `upstream_ref` to `main` once #2772 has merged. The comment
  on that step is its ticket. **Keep the `permissions: contents: read` block**
  — it is what bounds a job that runs another repository's build scripts.
- `runtime/README.md`: delete the "stand-in" paragraph.

One PR.

## Step 4 — cap2UI5 org: the repository cutover (ADR-008 steps 3–5)

Order matters: the builders push into `cap2UI5/cap2UI5` nightly and would
overwrite the plugin.

1. **Disable the writers first**: `builder-cap2UI5` → Actions → `update_cap` →
   Disable workflow; `builder-cap2UI5-web` → `build web` → Disable.
2. `cap2UI5/cap2UI5`: tag the current `main` as `generated-app-final`, so the
   published-artefact history stays reachable.
3. Merge [cap2UI5/cap2UI5#72](https://github.com/cap2UI5/cap2UI5/pull/72). Its
   body is current; there is no text to paste from here.
4. Settings → Pages: source = GitHub Actions (the docs site moves later, or
   stays in `cap2UI5/docs` — taste, and it is one of the decisions below).
5. Archive `builder-cap2UI5`, `builder-cap2UI5-web`, `web-cap2UI5-build`.
   Then `builder-abap2UI5-js` **after** its ADRs and the conformance suite have
   been copied where they should live — the plugin repo already has the ADRs.
6. Delete the four deploy keys (`ACTION_KEY_CAP`, `ACTION_KEY_APP`,
   `ACTION_KEY_WEB`, `BUILT_DEPLOY_KEY`) from the archived repositories'
   secrets.

### What the cutover does to THESE pages — the part I had left out

Merging the plugin invalidates most of this repository's documentation on the
same day, and step 4 above said nothing about it. Measured, not estimated: of
`docs/`'s 36 pages and 5,434 lines, **27 pages describe the port**. Only
ROADMAP.md, HANDOVER.md and one line of `reference/database.md` know the
plugin exists.

It is not a matter of stale paths. The whole guide teaches the port's app API:

```js
class my_app extends z2ui5_if_app {     // the plugin: defineApp("ZCL_X", class {
  async main(client) {                  //   main(c) {           <- synchronous
    if (client.check_on_init()) { … }   //     if (c.isFirstRun) { … }
    client.view_display(xml);           //     c.view(xml);
  }                                     //   }
}                                       // })
```

| | pages | lines | what happens |
|---|---|---|---|
| **A** structure & reference | 12 | 1,949 | rewritten from scratch — `getting-started`, `project-structure`, `architecture`, `database`, `protocol`, `configuration`, `deployment`, `persistence`, `playground`, `samples`, `ecosystem`, `where-it-comes-from`. Every one describes `core/`, `srv/z2ui5-service.cds`, `z2ui5_t_01`, `file:./core` or the nightly generation — none of which survives |
| **B** app-authoring API | 15 | 2,416 | rewritten against `defineApp` — `lifecycle`, `data-binding`, `events`, `navigation`, `popups`, `views`, `user-exit`, all of `api/`, all of `examples/`. The API is not a rename: synchronous `main`, `c.isFirstRun`/`c.isDisplay` instead of the two `check_on_*` predicates, `c.bind`/`c.event`, `t.table( )` for state |
| **C** survives with corrections | 9 | 1,069 | `why-cap2ui5`, `what-is-cap2ui5`, `vs-abap2ui5`, `vs-fiori-elements`, `migration-from-abap2ui5`, `troubleshooting`, `devtools`, `roadmap`, `index` — the arguments hold, the mechanics in them do not |

Two things follow for the order of work:

- **`docs/guide/samples.md` is generated and its generator breaks.**
  `scripts/gen-samples.mjs` line 39 hardcodes
  `…/cap2UI5/blob/main/core/srv/app/samples` as its source, and lines 122/188
  write that path into the prose. The plugin PR deletes that folder, so the
  page's 98 rows have no input left. Either the generator is repointed at the
  example project, or the page goes with the samples it indexes.
- **Do not rewrite these pages before the plugin merges.** They are *correct
  today* — they describe the cap2UI5 that is published and working. Rewriting
  them into the future tense would replace accurate documentation with
  speculative documentation, and if the approach is rejected the repository
  loses both. The trigger is step 4.3, not this page.

The decision in step 5 about where the docs live should be taken **before**
this rewrite, not after: it decides whether the work lands here or as a folder
in the plugin repository, and nobody wants to do 3,400 lines twice.

## Step 5 — decisions that are yours, not mine

- **`requires: "authenticated-user"` as the plugin default.** Anonymous callers
  get 401. A demo site wants `null`. I chose the closed default; overrule in
  `plugin/package.json#cds.cap2ui5.requires`. Note what that flag now costs:
  with it `null`, every caller is `anonymous` and therefore shares one draft
  owner, which is the documented consequence of turning authentication off and
  not a defect.
- **Whether `renderArg` should bound the output as well as the walk** (see
  step 1). Upstream's cap stops the *walk* at 1,000 nodes; a 3,000-key lookup
  still produces ~49 KB before the 2,000-character cut, because the markers are
  about as long as the values they replace. Giving objects the head-plus-marker
  treatment arrays already get would fix that — and would make #2771's original
  assertion true as written. It is a behaviour change, so it is yours to want.
- **Where the docs live** — `cap2UI5/docs` stays, or becomes a folder in the
  plugin repo.
- **The two red suites in `builder-abap2UI5-js`** (`cs_event` constants, the
  `upstream-units` ratchet). Both are `main`'s, both have a proposed patch on
  [#29](https://github.com/cap2UI5/builder-abap2UI5-js/pull/29), and both are
  work on a repository ADR-008 archives. Worth deciding whether to fix them at
  all, or to let the archive settle it.

## What I could not do, and why

- Merge anything, or approve my own pull requests.
- Anything on npmjs.com or in repository settings (no rights).
- Reach `app-template`, `samples`, `samples-controls` or `samples-stack` — they
  are outside this session's repository access, so the `shared-file-gate`
  analysis above is from the `abap2UI5` side only.
- Render against the **current** UI5 release: this sandbox reaches npm but no
  CDN, and `openui5-dist` on npm stops at 1.108. CI renders against the CDN on
  a runner and is green there — `ci.yml` in `cap2UI5/cap2UI5`, 3/3 browser
  tests, screenshots uploaded as an artefact on every run.
