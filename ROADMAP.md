# cap2UI5 — Analysis & Improvement Roadmap

*Status: 2026-08-21 · produced from a full-ecosystem review of all six cap2UI5
repos plus upstream `abap2UI5/abap2UI5` (each repo read at its current HEAD,
test suites executed, numbers measured rather than quoted). This is a
maintainer planning document, not a site page — it is deliberately outside
`docs/` so it is not published or scanned by `verify-refs`.*

> [!IMPORTANT]
> **Phases 0–4 have since been implemented.** See
> [§7 What was executed](#7-what-was-executed) for what landed, and — more
> usefully — for the four findings below that turned out to be **wrong** once
> someone tried to fix them. The analysis is left as written so the
> corrections are visible rather than quietly edited away.

---

## 1. Where the project stands

**What is genuinely strong** (worth saying first, because the plan below
should not destroy it):

- The six-repo pipeline (upstream ABAP → `builder-abap2UI5-js` transpile →
  core package → `builder-cap2UI5` app assembly → app repo →
  `builder-cap2UI5-web` → GitHub Pages) is fully automated, diff-reviewable
  (committed trees), self-healing on races (slot-vs-HEAD arbitration), and
  watched by independent freshness/health crons.
- The builder scripts are defensively engineered where it counts:
  `builder-cap2UI5`'s assemble guardrails (residual-string sweep, lock-drift
  guard), `publish-cap.js`'s target-identity gate, the web build's shell
  sanity gate and deterministic `BUILD_INFO.json`.
- The app's tests are behavioural security regressions (owner isolation,
  401s, port contract), not coverage theatre. The docs repo's
  `verify-refs` checker is exemplary tooling, and its ignore file is a model
  of how to keep exceptions reviewable.
- Documentation prose quality is unusually high across all repos
  (AGENTS.md files, recorded policies, honest READMEs).

**The five findings that matter most**, across everything reviewed:

| # | Finding | Where | Severity |
|---|---|---|---|
| 1 | The pipeline is **red right now**: upstream's new favicon contract (`<link rel="icon" …>`) is not emitted by the hand-ported `z2ui5_cl_ui5_http_handler.js`; 1 of 221 jest tests fails, `build_core` cannot commit `core/`, and the whole downstream chain stalls until a human intervenes | builder-abap2UI5-js | **P0 — blocking** |
| 2 | **BTP deployment is likely broken**: `mta.yaml` defines an `abap2UI5-srv` destination, but `app/z2ui5/xs-app.json` has no route to it — its catch-all sends `/rest/root/z2ui5` roundtrips to the static HTML5 repo, and no CI runs `mbt build` or a deploy smoke test to catch it | cap2UI5 | **P0** |
| 3 | **Dual draft-store model**: the async platform store is wired to CDS, but the ABAP-shaped instance path (`create/read/count_entries_total/cleanup`) silently falls back to an unbounded process-global in-memory store with a column set that does not exist in `db/schema.cds` — the start page's draft count and `cleanup()` operate on phantom data | cap2UI5 / core | **P0** |
| 4 | `assemble-core.js` **deletes modules that fail to load and still exits 0** — a missing `adapters/cap/node_modules` (never checked) silently guts the shipped package; the transpile/publish steps have no size floors | builder-abap2UI5-js | **P0** |
| 5 | **There is no consumable artifact**: the core package is `"private": true`, named `abap2UI5` (uppercase — npm would reject it), never versioned, never published; users onboard by cloning a generated repo they are told not to edit; README and AGENTS.md give opposite advice about `srv/app/` | ecosystem | **P1 — strategic** |

Everything else in this document hangs off these five.

---

## 2. Findings by area (condensed)

### 2.1 builder-abap2UI5-js (transpiler + core build)

- **Ratchet health**: `upstream-units.known-failures.json` has **113 entries**
  (22 % of 510 executed upstream tests). The "list only shrinks" property
  holds mechanically but not socially — the 2026-08 rename wave hand-added
  +103 in one commit. Categories: 74 `port-deviation`, 17 `js-limit`,
  13 `port-gap` (5 concrete missing APIs), **6 `port-bug`**, 3 `async-boundary`.
- **The 6 `port-bug` entries are real shipped framework defects hidden in a
  green build** — most notably `_bind` does not walk nested structures
  (stops at level 1, three entries) and resolves attributes to the first
  structure member. Nothing escalates these.
- **Transpiler**: `scripts/abap2js.js` is a single 4,001-line file;
  `emitStatement` alone is ~1,266 lines. 39 unit tests / ~40 % statement
  coverage of `scripts/`; real confidence comes only from full re-transpiles.
  Several constructs emit **silently wrong semantics** rather than TODOs:
  range-table `IN` ignores sign `E` (exclude → opposite result), unsupported
  comparisons emit `false /* TODO */`, unresolved superclasses become empty
  class stubs.
- **Sharpest fragility**: `clientSignature()` (`abap2js.js:710-740`) parses
  the hand-written client port with a whitespace-sensitive regex to derive
  the ABAP↔JS calling convention for all 104 samples; a reformat silently
  breaks apps at runtime. No completeness test exists.
- **SRTTI family (`00/02/z2ui5_cl_srt_*`) is the convergence point of three
  debt signals**: 76 of 127 lint warnings (`no-undef`, `constructor-super`),
  34 of 82 shipped `TODO(abap2js)` markers, 0 % coverage — and it is already
  backlog item #1 in `docs/HANDOFF.md`.
- **Pipeline scripts that decide what ships are untested** (`assemble-core`,
  `publish-core`, `mirror-input`, `transpile-tree`, `prepare-app`,
  `patch-frontend`, `check-no-frozen`). `patch-frontend.js` has four silent
  no-op paths (exact-literal and regex matches over upstream files that warn
  and exit 0, one printing "already patched" when it patched nothing).
  `check-port-drift.js` auto-accepts drift in default mode and mutates a
  tracked baseline even on a report run; it currently shows 3 unreconciled
  drifts, one of which is finding #1.
- **Sanity floors are far below reality**: units floor `>150` vs actual 510;
  smoke floor vs actual 104; `transpile-tree.js` and `publish-core.js` have
  none at all.
- The weekly **oracle** (`oracle-classify.js`) can *prove* which baseline
  entries are achievable in JS, but writes only to an expiring Actions step
  summary nobody reads.
- Stale numbers everywhere prose quotes a count (roadmap says baseline "low
  twenties" vs 113; "19 suites/~225 tests" vs 21/221; TODO counts off by an
  order of magnitude; `transpiler-roadmap.md` still describes the
  pre-monorepo-split layout).

### 2.2 cap2UI5 app + builder-cap2UI5

- **Auth**: the roundtrip is *not* open — `@(requires: 'authenticated-user')`
  is enforced and regression-tested. But the `$XSAPPNAME.User` scope declared
  in `xs-security.json` is never referenced, so role collections do nothing.
- **CSRF is off by default**: `server.js` answers `X-CSRF-Token: disabled`;
  the core's gate is opt-in and never enabled; the check itself allows
  requests with neither Origin nor Referer (fails open).
- **Input validation**: the action body is `@open type object {}` — no schema,
  no explicit size limit (the express default applies by accident). Security
  headers are applied to the GET bootstrap only, not POST responses or the
  CDS-served webapp statics. `z2ui5_cl_ui5f_index_html.js` interpolates
  config values into HTML unescaped (latent XSS for any exit that reflects
  request data).
- **Draft table**: append-only, one row per roundtrip, `LargeString` payload;
  retention job exists (24 h TTL) but is unindexed (full scan on HANA), runs
  on every instance concurrently, and disagrees with the framework exit's
  own 4 h `draft_exp_time_in_hours` — the two are unconnected.
- **Multi-instance**: sticky handlers, the in-memory port store and exit
  config are all process-global; no session affinity is configured; >1 CF
  instance means intermittent silent state loss. Two tabs of one user share
  a sticky slot and clobber each other; the tab-close beacon kills the other
  tab's state.
- **Concurrency**: no locking/versioning; concurrent roundtrips fork the
  draft chain silently; interleaved sticky requests mutate one handler's
  request JSON in place.
- **Hygiene gaps**: no eslint config in the app repo at all (`src/app/**`
  is ignored even at source); `dependabot.yml` covers only `github-actions`
  — npm deps (including `openui5-dist@1.113.0`, `@sap/cds ^10`) are never
  updated; no `npm audit`/CodeQL/coverage; `deploy-check` deliberately skips
  `mbt build` (which is why finding #2 is invisible); no CONTRIBUTING/issue
  templates in the app repo's only hand-owned folder.
- ~14k LOC of the webapp is duplicated byte-identical at `core/app/z2ui5/webapp`
  and `app/z2ui5/webapp` — two copies that can drift.
- builder-cap2UI5 itself is the strongest-engineered repo (496 script lines,
  604 test lines, guardrails designed in). Residual risks: the ordered
  string-rewrite pairs (second pattern is a substring of the first — order
  is enforced only by an after-the-fact guardrail), no composed
  assemble+publish test, and no check that the *published* tree installs
  and boots.

### 2.3 Web build + deployed site

- Toolchain is solid (28 unit tests, real end-to-end smoke, post-deploy live
  smoke, daily health + 48 h freshness watchdogs). Deploy is current; all
  104 samples ship; bundle is 522 KB min / 116 KB gzip.
- **Risks**: unpinned OpenUI5 CDN bootstrap (up to 24 h blank-page window
  between a bad release and the health cron; no fallback, no SRI, resolved
  version recorded nowhere); registry can silently collapse to ~6 built-ins
  if the samples dir moves (smoke only exercises `hi_world`); `build.mjs`'s
  HTML patching (329 lines) has zero unit tests; sample auto-exclusions are
  only a `console.warn`; interceptor ignores `AbortSignal`; no cache-busting
  on the stable `z2ui5-web.js` filename; `crypto.randomUUID()` throws on
  plain-HTTP LAN previews.
- **Missed product opportunity**: the playground has no sample browser — the
  only entry to 104 samples is hand-typing `?app_start=…`. An in-browser
  editor (register a user-authored class via the already-in-tab engine)
  would be a genuinely differentiated feature vs. upstream.

### 2.4 Docs

- 32 pages / ~24k words, zero orphans, local search, good API coverage
  (59/65 client methods), working deployment guide.
- **Gaps**: no roadmap page; no sample catalogue (the single highest-value
  missing page — trivially generatable from the registry walk); migration
  from abap2UI5 is a ~180-word buried section, not a page; zero coverage of
  testing app classes, i18n, user-exit as an extension point, addons, FAQ,
  release notes; no sitemap config.
- **Stale claims invisible to `verify-refs`**: playground bundle "~1.2 MB"
  (real: 522 KB), "weekly" rebuild cadence (now event-driven per push),
  arithmetic around the 12 MB comparison. `verify-refs` checks identifiers,
  not numbers or method names, and exits 0 without a checkout (CI supplies
  one, but nothing enforces that).
- The app README still teaches `_bind_edit` in its examples while upstream
  has migrated every caller off it and schedules removal (~mid-2027).

### 2.5 Upstream tracking

- Upstream `main` moves fast (50 commits in 3 weeks) while releases are now
  quarterly-or-slower; "merging to main is the release" for abapGit readers.
  The port's pin is already 4 commits behind, and those 4 commits are an API
  break (interface retirements into `src/99`, which the port excludes
  entirely — retired classes simply *vanish* here rather than
  deprecate-then-remove).
- Upstream's `docs/removal-plan.md` is the single best divergence-tracking
  input for the port: 8 frontend custom controls already `// OBSOLETE:`
  (should not be carried forward), `_bind_edit` and friends scheduled out,
  the `eF('…')` legacy action parser blocked on the same `IS SUPPLIED`
  transpiler defect the port's backlog names.
- The port pins `openui5-dist@1.113.0` — *between* upstream's classic floor
  (1.71, heavily gated) and its v2 track (1.136+). None of upstream's
  version gates protect the port: it sits in an unguarded middle, and
  dependabot never proposes a bump.
- Upstream has explicitly parked a named action API
  (`frontend-action-named-api`, deferred) — **the port must not invent one
  either**; that design space is reserved upstream.

---

## 3. The roadmap

Four phases, ordered so that each unblocks the next. Within a phase, items
are independent workstreams. "Done when" lines are the acceptance criteria.

### Phase 0 — Stop the bleeding (now; days)

Correctness and pipeline-integrity fixes. Nothing else matters while the
pipeline can silently ship a wrong or gutted package — or nothing at all.

| # | Item | Repo | Done when |
|---|---|---|---|
| 0.1 | Port the favicon contract into `z2ui5_cl_ui5_http_handler.js` | builder-abap2UI5-js | `npm test` green (221/221 minus deliberate skips); `build_core` commits and `trigger_cap` fires again |
| 0.2 | Add the `/rest/**` (and `/health`) route to the CAP srv destination in `app/z2ui5/xs-app.json`; add an `mbt build` (or CF deploy smoke) job to `deploy-check` | builder-cap2UI5 `src/` | a deployed approuter roundtrip reaches the CAP service; CI fails if the route disappears |
| 0.3 | Resolve the dual draft model: wire `engine.set_db_store` to CDS *or* delete the ABAP-shaped instance path from the CAP build; align `db/schema.cds` with whichever survives | builder-abap2UI5-js + builder-cap2UI5 | draft count / cleanup operate on the real table; no code path writes to the process-global `InMemoryStore` in the CAP app |
| 0.4 | `assemble-core.js`: hard-fail when `adapters/cap/node_modules` is missing; exit non-zero when any module is skipped/deleted; record the skip list in the report | builder-abap2UI5-js | a gutted assemble can no longer exit 0 |
| 0.5 | Raise sanity floors to near-reality (units ≥ ~480 of 510, smoke ≥ ~100 of 104) and add floors to `transpile-tree.js` and `publish-core.js` | builder-abap2UI5-js | losing ⅔ of the test corpus or publishing an empty tree turns CI red |
| 0.6 | `check-port-drift.js`: stop mutating the baseline in plain report mode; make default (nightly) mode fail or file a visible record instead of auto-accepting drift | builder-abap2UI5-js | drift requires an explicit `--update`; a report run leaves the tree clean |
| 0.7 | Promote the 6 `port-bug` ratchet entries (esp. the three nested-`_bind` failures) into tracked GitHub issues; link the baseline entries to them | builder-abap2UI5-js | every `port-bug` entry carries an issue URL; ratchet policy documented: `port-bug` may not be baselined without one |

### Phase 1 — Security hardening (next; 1–2 weeks)

The README's honesty about its own gaps is a strength — now close them.

| # | Item | Repo | Done when |
|---|---|---|---|
| 1.1 | Turn `check_csrf_active` on by default; make `_check_csrf_rejected` fail **closed** when both Origin and Referer are absent; stop sending `X-CSRF-Token: disabled` | builder-abap2UI5-js (core) + builder-cap2UI5 | CSRF gate unit-tested (the function was made pure for exactly this) and exercised in the app suite |
| 1.2 | Enforce the `$XSAPPNAME.User` scope on the z2ui5 action (xs-security.json already declares it); document the role-collection step | builder-cap2UI5 `src/` | 403 without the role; README security table updated |
| 1.3 | Explicit request body-size cap on the roundtrip; apply `t_security_header` to POST responses and webapp statics | builder-cap2UI5 `src/` | headers asserted in tests for GET and POST |
| 1.4 | HTML-escape `title` and `t_add_config` interpolation in `z2ui5_cl_ui5f_index_html.js`; add an escaping helper for exits | builder-abap2UI5-js | reflected-input test passes |
| 1.5 | Draft-table ops: index `createdAt` (+`owner`); single-instance or jittered retention; reconcile the 24 h job with the exit's 4 h `draft_exp_time_in_hours` (one config, one owner) | builder-cap2UI5 `src/` | retention delete uses the index; one documented TTL knob |
| 1.6 | Document (README security section) the multi-instance/sticky limitation honestly; declare `instances: 1` in `mta.yaml` until affinity or a shared store exists | builder-cap2UI5 `src/` | no silent state-loss surprise for BTP adopters |
| 1.7 | CI hygiene: npm ecosystem in `dependabot.yml` (app + builders), `npm audit` gate, eslint config for the app repo (stop ignoring `src/app/**` at source), CodeQL on the builders | all | each repo's PR gate covers lint + audit |

### Phase 2 — Become adoptable: distribution & DX (1–2 months)

The strategic phase. Today there is no supported way to *start* a cap2UI5
project except cloning a build artifact. This is the ceiling on adoption.

| # | Item | Repo | Done when |
|---|---|---|---|
| 2.1 | **Decide and execute the npm question**: rename the core `abap2UI5` → `abap2ui5` (or a scope, e.g. `@cap2ui5/core`), drop `private`, adopt real versioning (mirror upstream's `X.Y.Z` + a port counter), publish from `build_core` on green. The name is baked into the 38-entry exports map, `path-map.js`, every generated `require()`, and all four adapter manifests — the cost only grows | builder-abap2UI5-js | `npm i` works from the public registry; nightly publishes carry a version bump; README stops calling an unpublished folder "the published package" |
| 2.2 | Ship a **`cds-plugin`** entry so `npm i` + zero config contributes the service, bootstrap and draft wiring to any CAP project — eliminating the hand-copied `srv/server.js` / `z2ui5-service.*` skeleton | builder-cap2UI5 `src/` → package | a fresh `cds init` project + one install + `Z2UI5_APP_DIRS` renders an app; the generated app repo becomes the *demo*, not the delivery mechanism |
| 2.3 | Hand-written `.d.ts` for the top of the API: `engine`, `z2ui5_if_app`, `client`, `z2ui5_cl_ui5_view_builder` (a fluent chain is the API most improved by IntelliSense) | builder-abap2UI5-js `src/` | types ship in the package; a TS consumer gets completion on the view-builder chain |
| 2.4 | Template/scaffold: a GitHub template repo or `cds add cap2ui5`; fix the `srv/app/` contradiction (README says "put apps here", AGENTS.md says "overwritten every publish") with one recommended layout | builder-cap2UI5 + docs | onboarding is: create from template → `npm i` → write one class |
| 2.5 | Docs to match: standalone migration-from-abap2UI5 page (per-construct mapping table), generated **sample catalogue** page (id → title → playground deep link → source link), user-exit extension-point page, testing-your-app page, FAQ; fix the stale playground numbers; add sitemap | docs | catalogue generated from the same walk `gen-registry.mjs` does; `verify-refs` extended to method names + a small numeric-claims check |
| 2.6 | README positioning: state the value proposition ("UI5 apps from pure backend code — no frontend build, no OData annotations") against Fiori Elements / plain UI5 / CAP+annotations; move the 220-line samples section into docs | builder-cap2UI5 `src/` | a first-time visitor knows in 30 seconds why this exists |

### Phase 3 — Pay down structural debt (2–4 months, interleavable)

| # | Item | Repo | Done when |
|---|---|---|---|
| 3.1 | **SRTTI first**: rewrite/complete `00/02/z2ui5_cl_srt_*` — it is simultaneously 76 lint warnings, 34 shipped TODOs, 0 % coverage and HANDOFF backlog item #1; follow with the `CALL TRANSFORMATION`/sxml shim in `z2ui5_cl_ui5_util_context` (36 TODOs) | builder-abap2UI5-js | lint `no-undef`/`constructor-super` bucket ≈ 0; `TODO(abap2js)` in shipped `core/` < 20; upstream `port-gap` entries for these classes delisted |
| 3.2 | Split `abap2js.js` (4,001 lines; `emitStatement` ~1,266) into modules (statements / expressions / OpenSQL / emit); raise transpiler unit coverage on the way; replace `clientSignature()`'s source-regex with reflection over the required client class, plus a map-completeness test | builder-abap2UI5-js | no function > ~300 lines; a client-port reformat cannot silently break the calling convention |
| 3.3 | Make silently-wrong emissions loud: range-table sign `E`, `false /* TODO */` comparisons, empty-superclass stubs → either implement or fail the transpile with a clear message (allow-list consciously) | builder-abap2UI5-js | no construct emits a wrong *answer* silently |
| 3.4 | Test the ship-deciding scripts (`assemble-core`, `publish-core`, `transpile-tree`, `patch-frontend` — make its four silent no-ops hard failures, `mirror-input` excludes) against temp fixtures, the way builder-cap2UI5 already does | builder-abap2UI5-js | every script that writes what ships has negative tests |
| 3.5 | Ratchet governance: `apps-smoke` entries get the same `category`+`why` schema (and the two "correct behaviour" entries move to an expected-diffs list, not a failures list); commit the weekly oracle classification to a tracked file so the 74 `port-deviation` entries become *proven*, diffable, and burn-downable | builder-abap2UI5-js | baseline changes are reviewable diffs with reasons; oracle output survives log retention |
| 3.6 | Fix jest coverage semantics (child-process suites are invisible → 21 % is structurally wrong): instrument the out-of-process runners or document/replace the number; add thresholds once it means something | builder-abap2UI5-js | the coverage number measures what actually runs |
| 3.7 | Upstream-divergence tracking as CI: a small gate that diffs upstream's `docs/removal-plan.md` obsolete list against what the port ships (the 8 `// OBSOLETE:` custom controls, `_bind_edit` in port README examples, retired interfaces) and turns red on new divergence | builder-abap2UI5-js | divergence is a red check, not archaeology |
| 3.8 | De-duplicate the 14k-LOC webapp (single source of truth, or a build-time copy with a byte-identity check); decide `openui5-dist` pin strategy (1.113.0 sits in an unguarded middle between upstream's 1.71 floor and 1.136+ v2 track) and let dependabot propose bumps behind the jest gate | builder-abap2UI5-js + builder-cap2UI5 | one webapp source; a documented, tested UI5 pin policy |
| 3.9 | Doc-number drift killer: a tiny `check-doc-numbers` script asserting the handful of counts quoted in AGENTS.md/roadmap/eslint comments (`<!-- count:X -->` markers); rewrite `transpiler-roadmap.md` onto the post-split layout | builder-abap2UI5-js, docs | stale numbers become CI failures, not folklore |

### Phase 4 — Product polish (opportunistic)

| # | Item | Repo | Done when |
|---|---|---|---|
| 4.1 | Playground **sample browser**: landing page listing the 104 samples (titles + deep links + GitHub source) — the cookbook the docs already claim exists | builder-cap2UI5-web | a visitor finds and opens any sample without typing a class name |
| 4.2 | Playground **editor**: an in-tab pane that registers a user-authored app class via the already-loaded engine — a feature upstream cannot match without a WASM ABAP runtime | builder-cap2UI5-web | write-a-class → run, entirely in the browser |
| 4.3 | Web-build resilience: record the resolved OpenUI5 version in `BUILD_INFO.json`, add a bootstrap `onerror` fallback to a known-good version, registry-count floor + exclusion list in the artifact, cache-busted bundle filename, unit-test the extracted HTML patcher, honor `AbortSignal` in the interceptor | builder-cap2UI5-web | a bad OpenUI5 release degrades gracefully instead of 24 h of blank page; a silent registry collapse is impossible |
| 4.4 | PWA/offline for the playground (service worker precaching bundle + webapp, runtime-caching the CDN) | builder-cap2UI5-web | returning visitors work offline |
| 4.5 | Publish the four adapters (node/express/web) once 2.1 lands, with the shared-store caveat documented; make the adapter test gate hard-fail in CI when `node_modules` is missing instead of skipping green | builder-abap2UI5-js | adapters installable; a missing CI install step cannot pass silently |
| 4.6 | Public roadmap page in the docs (this document, maintained), plus release notes per core version once 2.1 exists | docs | users can see where the project is going |

---

## 4. Sequencing rationale

- **Phase 0 before everything**: items 0.1–0.6 are the difference between
  "the pipeline ships what we think it ships" and "green means nothing".
  They are each hours-to-a-day of work.
- **Phase 1 before Phase 2**: publishing to npm (2.1) multiplies the blast
  radius of every security default; harden first, then distribute.
- **Phase 2 is where the strategy lives.** Everything in it serves one
  sentence: *a CAP developer can adopt cap2UI5 with `npm i` in five minutes
  without ever seeing the build pipeline.* The 2.1 rename decision gates
  2.2/2.3/4.5 and gets more expensive every month of generated history.
- **Phase 3.1 (SRTTI) is the single highest-leverage code change** in the
  ecosystem: one body of work retires four independent debt signals and
  unlocks several baselined upstream tests.
- The ratchet + oracle + drift-gate items (0.6, 0.7, 3.5, 3.7) together
  change the port's relationship to upstream from *reactive archaeology* to
  *contract with alarms* — which is what a fast-moving upstream `main`
  (50 commits/3 weeks) demands.

## 5. Measures of success

| Metric | Today | Target (post-P3) |
|---|---|---|
| Pipeline test state | 1 red (blocked publish) | green, with floors near real corpus sizes |
| Units ratchet baseline | 113 (6 known product bugs inside) | < 90, zero `port-bug` category entries |
| Shipped `TODO(abap2js)` in `core/` | 82 | < 20 |
| Lint warnings (builder) | 127 | < 30, gate on error for fixed classes |
| Consumable artifact | none (`private`, unpublishable name) | versioned npm package + cds-plugin |
| Onboarding path | clone a generated repo | template / `npm i` in any CAP project |
| BTP deploy | untested, likely broken routing | CI-gated `mbt build` + deploy smoke |
| CSRF | off by default, fails open | on by default, fails closed, tested |
| Docs numeric claims | 3 known stale | asserted by CI |

---

*Sources: full reads of AGENTS.md and code in `builder-abap2UI5-js`,
`builder-cap2UI5`, `cap2UI5`, `builder-cap2UI5-web`, `web-cap2UI5-build`,
`docs`, and upstream `abap2UI5/abap2UI5` (incl. `backlog/` and
`docs/removal-plan.md`); executed: the builder jest suite (216/221 + 1 fail),
eslint (127 warnings), coverage, and `verify-refs` (clean). File/line
references for every finding live in the review notes behind this document.*

---

## 7. What was executed

All five phases were implemented on the branch
`claude/cap2ui5-analysis-roadmap-kcf9qc` across six repositories. This section
records what landed and, more importantly, **where the analysis above was
wrong** — four of its findings did not survive contact with the code, and one
of them was the document's headline claim.

### 7.1 Four corrections to the analysis

**`_bind` nested-structure binding is NOT broken.** §2.1 reported six
`port-bug` ratchet entries as "real shipped framework defects hidden in a green
build", the worst being "`_bind` does not walk nested structures". Five of the
six are one inherent JS limitation, and it is not reachable from a real app:
`REF #( ms_struc-s_02-input )` transpiles to a *value copy* of an empty string,
so the lookup matches the first attribute that is also empty and answers
`{/MS_STRUC/INPUT}`. Every one of those tests initialises its fields to `""`,
which is why they all return the same wrong path. The app-facing API takes the
member path explicitly, and
`main_two_way(client, val, { name: "ms_struc-s_02-s_03-input" })` answers
`{/XX/MS_STRUC/S_02/S_03/INPUT}` — verified at every depth. The entries are now
categorised `js-limit` with that evidence. The sixth was genuine (a one-line
lifecycle-latch gap in `db_save`) and is fixed, so the baseline now holds
**zero** `port-bug` entries. The miscategorisation was the actual defect: it
had read as user-facing breakage for months.

**The "dual draft-store model" is a cache, not a rival store.** §1/§2.2 called
it "the single largest correctness debt". `db_load` composes the two
deliberately — process buffer, then the synchronous store (transpiled ABAP
cannot `await`), then a fall-through to the durable CDS store. A miss is a
fall-through, not a wrong answer, which is also why back-navigation survives a
cold process. Nothing said so anywhere, which is why it read as a bug. What
*was* real: the cache was unbounded, holding every draft payload the process
had ever written. Now bounded (500 rows/table, oldest evicted), which is safe
precisely because of the fall-through.

**Five of the five smoke-baseline entries describe correct behaviour.** §2.1
counted them as outstanding failures. They are components and sub-apps that
cannot be started standalone — a confirm dialog that leaves immediately when
started with no event, sub-apps needing a parent, a sample that reads browser
device info a headless run cannot supply. They now carry `expected: true` and a
reason each.

**The stricter CSRF rule was wrong and was reverted.** Phase 1 proposed failing
closed when neither `Origin` nor `Referer` is present. Implemented, it
contradicted a published upstream contract
(`ltcl_test_http_handler~test_csrf_no_headers` pins the lenient answer) and
broke callers that post without either header. Reverted, with the reasoning
recorded at the function: the vector it aimed at is closed a layer up, since
CDS accepts an action call only as `application/json` — which a cross-site
form cannot produce — and the approuter forwards a JWT.

### 7.2 What a live probe found that no unit test could

Booting a real CAP 9 server against the package (rather than trusting the test
suite) surfaced three defects that were invisible from inside:

1. **`@sap/cds` was resolved from the wrong tree.** The package is normally a
   `file:` dependency, npm symlinks those, and Node resolves from the *real*
   path — so the plugin reported "@sap/cds not resolvable" while running inside
   a live CAP server.
2. **The CSRF gate never saw a header.** It read `req.req || req._.req`; CAP 9
   exposes the express request as `req.http.req`. The gate was active, correct,
   and passed empty strings — which its lenient branch reads as "nothing to
   compare, allow". A cross-origin POST was answered **200** before the fix and
   **403** after it, confirmed over real HTTP. The same bug meant user exits
   never saw request context at all.
3. **A rejection was returned as a value**, so CDS serialised it as a
   *successful* action result: HTTP 200 carrying `{status_code: 403}` in the
   body. Every client that checks the status read a blocked request as
   completed.

None of the three could have been caught by the existing suites, and the first
two were introduced *by this work* — which is the argument for the probe.

### 7.3 What landed, by phase

**P0 — correctness and pipeline integrity.** Favicon contract ported (the
pipeline was red and the publish chain stalled); the missing approuter route
added with `test/approuter-routes.test.js` pinning it; `assemble-core` now
exits non-zero on a skipped file and refuses to run the load gate without its
dependencies; size floors added to transpile and publish and raised to near the
real corpus (units 150 → 480 of 511); `check-port-drift` no longer rewrites the
baseline on a report run.

**P1 — security.** CSRF on by default; the `User` role enforced instead of bare
`authenticated-user`; security headers on the data endpoints; an explicit body
cap; HTML escaping for all exit-supplied config with a shipped
`abap2UI5/z2ui5_html` helper; retention reconciled to one TTL and one instance;
`createdAt`/`owner` indexed as HANA artifacts; npm added to dependabot; an
audit job on the shipped lock.

**P2 — distribution.** The package now wires itself into CAP: `cds-plugin.js`
plus a shipped model and service, so a consumer writes two `using` lines and
installs. The generated app consumes the same `activate()` rather than
duplicating it — which also fixed retention starting twice. Hand-written
`.d.ts` verified with `tsc --strict` (and against deliberate errors). The npm
rename is **decided but not executed**: `docs/adr-001-npm-publishing.md` records
the choice (`@cap2ui5/core`) and `scripts/rename-package.js` performs it across
both repos (87 files on `--dry-run`). Renaming before anyone can publish would
break every example and pin for a benefit that does not exist until a
maintainer with credentials runs `npm publish`.

**P3 — structural debt.** Three transpiler lowerings that returned *wrong
answers* now either work correctly or throw: `IN` ignored the range `sign`, so
an EXCLUDE line was evaluated as an include; `CP`/`NP` stripped the wildcards
and called `includes()`, so `A*Z` matched "ZA"; unknown operators emitted
`false`. `check-doc-numbers.js` verifies counts quoted in prose (every one had
drifted). `check-upstream-divergence.js` turns upstream's obsolescence list
into a baseline diff, so a retirement the port still ships fails the PR gate.

**P4 — product polish.** The playground gained a sample browser (104 samples,
grouped and filterable — the only way in was previously typing a class name),
a registry floor and a recorded OpenUI5 version in `BUILD_INFO.json`, an
extracted and tested HTML patcher, and `AbortSignal` support. The docs gained
the sample catalogue, a standalone migration guide, a user-exit page, a roadmap
page and a sitemap; `verify-refs` can now fail closed.

### 7.4 Numbers

| | Before | After |
|---|---|---|
| builder-abap2UI5-js suite | 21 suites, 1 failing (publish blocked) | 26 suites, 269 passing |
| cap2UI5 app suite | 23 tests | 44 tests |
| builder-cap2UI5-web suite | 28 tests | 52 tests |
| Units ratchet | 113, incl. 6 `port-bug` | 111, **0** `port-bug` |
| `TODO(abap2js)` in shipped core | 82 | 72 |
| BTP roundtrip routing | unrouted (app could not work) | routed + tested |
| CSRF | opt-in, never enabled | on by default, 403 verified over HTTP |

### 7.5 Still open

- **`npm publish`** — needs a maintainer with registry credentials; everything
  else is prepared (§7.3, P2).
- **The SRTTI family** (`00/02/z2ui5_cl_srt_*`) — still the convergence point
  of the remaining lint warnings, most of the shipped `TODO(abap2js)` markers
  and no coverage. It is the largest single piece of remaining work and was
  scoped as its own project rather than attempted here.
- **Splitting `abap2js.js`** (~4,000 lines) — the comparison fixes landed
  without it; the refactor itself remains.
- **The 74 `port-deviation` baseline entries** — the weekly oracle can *prove*
  which are achievable in JS, but its output still expires with the Actions log
  rather than being committed.
