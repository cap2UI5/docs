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

---

## 8. 2026-09-18 — what a wire-conformance gate found

*Added after building the gate §5 of the earlier analysis called for. Method:
upstream's own Node runtime (official @abaplint transpiler over open-abap-core,
`npm run express`) booted as a reference implementation, identical roundtrip
sequences driven against it and against cap2UI5's engine, responses diffed.
Everything below is measured from live responses, not read from source.*

### The headline

**The published package's frontend and backend speak different protocols.**
Upstream delivers frontend instructions as `S_FRONT.S_ACTION` action rows; the
port still emits the superseded `S_FRONT.PARAMS` record. The bundled webapp is
mirrored 1:1 from upstream and reads `S_ACTION` — `grep -c PARAMS` over
`app/z2ui5/webapp/core/Server.js` returns **0**, in the builder and in the
published app repo.

Why every existing gate is green anyway, which is the part worth internalising:

- `apps-smoke` inspects the **backend** response for an error marker. It never
  loads the webapp, so a frontend/backend protocol split is invisible to it.
- the app's `starter.test.js` drives the hand-written minimal `app/index.html`,
  not the mirrored webapp.
- the `upstream-units` ratchet grades transpiled ABAP testclasses against the
  port's internals — a different question entirely.

Nothing in six repositories was asking "do these two halves still fit together?"

### The second P0

**The repository cannot rebuild its own deliverable.** `npm run build_core` on a
clean checkout, with no source change, produces a core whose first roundtrip
never returns: the freshly transpiled view builder reaches a dynamic
`CALL METHOD (`CONVERT`)` that this port permanently cannot implement,
`stringify()` throws, and the handler's retry is synchronous — so it spins
rather than crashing. The nightly's "only commit `core/` on green" rule then
froze `core/` at the last good build. That rule did its job, and it is also why
nothing looked red: **the published package kept working while the repository
lost the ability to rebuild it.**

### They are one event, not three

The protocol change, the 17 unreconciled hand-port drifts (3,271 changed
upstream lines across `z2ui5_cl_ui5_handler`, `_client`, `_srv_model`,
`_http_handler`, `if_client` …) and the view-builder breakage all arrive from
the same upstream wave — the mirror commit that last wrote
`port-drift.baseline.json` is the one that introduced `S_ACTION` into the
webapp.

### Correction to §1 of this document

§1 called the six-repo pipeline "fully automated, diff-reviewable and watched by
independent freshness/health crons". The automation and the diff-reviewability
hold. The watching does not: the health crons watch each hop's own success, and
every hop succeeded while republishing a frozen artefact whose frontend and
backend no longer agree. Freshness of a *pipeline* is not freshness of a
*product*.

### Correction to the 2026-09-17 analysis that preceded this work

That analysis recommended shrinking the transpiler to samples only, calling the
41 transpiled framework classes "neither maintained nor understood". Measured:
**none of the 41 is shadowed by a hand-port** — they are all fill-ins, including
`z2ui5_cl_ui5_view_builder`, the six `z2ui5_if_ajson*` interfaces and 33
`ui5f_*_js` frontend modules. Removing them would gut the package. The
recommendation was wrong on the facts and was not executed.

### Where the work is tracked

[builder-abap2UI5-js `docs/adr-006-conformance.md`](https://github.com/cap2UI5/builder-abap2UI5-js/blob/main/docs/adr-006-conformance.md)
— decision, the five-item worklist, and how to grow the corpus from 2 apps to 11
using upstream's own `zcl_tst_*` framework exercises.
[`docs/adr-007-repo-consolidation.md`](https://github.com/cap2UI5/builder-abap2UI5-js/blob/main/docs/adr-007-repo-consolidation.md)
— six repos to two, deliberately sequenced *after* the worklist: reorganising
the delivery of a broken artefact reorganises the delivery of a broken artefact.

---

## 9. 2026-09-18 — the hostability seams, and what the serializer spike proved

Two seams landed upstream in `abap2UI5/abap2UI5` (branch
`claude/happy-turing-qt6ljo`), each behaviour-identical on a system by
construction rather than by inspection.

| seam | what it opens | surface |
|---|---|---|
| `z2ui5_if_ui5_draft_store` | where drafts live — a CDS entity instead of `Z2UI5_T_01` | 9 SQL statements, 1 class, 9 call sites |
| `z2ui5_if_ui5_app_serializer` | how app state becomes a string — JSON instead of asXML | 2 methods on `z2ui5_cl_ui5_app_cont` |

Both are wired so that a system installing nothing keeps the old semantics
exactly: the factory answers a fresh default instance per call, which is what
each call site did before, and the cached reference is left unbound rather than
pre-filled.

### The spike

§8's open question was whether cap2UI5 could run **open-abap for the logic** with
a thin host wrapper — and the blocker was that `all_xml_stringify( )` is ABAP's
type system (S-RTTI + `CALL TRANSFORMATION id`), which has no JavaScript
counterpart. The serializer seam makes that testable, so it was tested.

A serializer written in plain JavaScript was registered in the transpiled
runtime and installed through `z2ui5_cl_ui5_app_cont=>set_serializer( )`. Two
roundtrips of `hi_world` were driven against it: init, then `BUTTON_POST`
carrying `NAME = "Ada"`. The answer came back

```json
{"T_CUSTOM":[["MESSAGE_BOX","show","Your name is Ada",{"title":"Information"}]]}
```

so the app state survived a full roundtrip **with no `CALL TRANSFORMATION` and no
S-RTTI anywhere in the path**. The seam carries it.

### What the spike does NOT prove — read this before planning on it

The spike's serializer kept the live container object in a `Map` and handed out
the key as the document. That proves the *seam* carries state; it does not prove
a host can **project and rebuild** it — serialize to JSON and reconstruct the
app object from it on a later, colder request. Reconstruction is where the type
question actually bites, and it is untested.

So the honest status of the hybrid option is: **the blocker named in §8 is no
longer a blocker, and the next unknown is one step further in.** The follow-up
spike is a serializer that round-trips through real JSON, in a fresh process.
Until that one runs, "open-abap for the logic" is promising rather than proven.

### Not done

No issue or pull request was opened at `abap2UI5/abap2UI5`. Its CONTRIBUTING
asks for feature requests to be discussed in an issue first, and each seam has
to be argued on **upstream's** benefit — which is real for both (upstream's own
`node/srv/express.mjs` deployment recreates the draft table in SQLite today, and
its skip list already records `CREATE DATA … TYPE REF TO data` failing in the
Node runtime), but is a conversation to have rather than a patch to push.

---

## 10. 2026-09-18 — seams 3 and 4, and the P0 that closed

Two more seams landed upstream on `claude/happy-turing-qt6ljo`. The first one
closes §8's second P0 outright.

### Naht 3 closes "the repository cannot rebuild its own deliverable"

§8 reported that `npm run build_core` on a clean checkout produced a core whose
first roundtrip never returned. Root cause, upstream: `conv_get_string_by_xstring( )`
falls back from `CL_ABAP_CONV_CODEPAGE` to `CL_ABAP_CONV_IN_CE`, and **the
fallback was the body of the first `CATCH`** — so when it failed too, a raw
dynamic-call exception left the utility. The view builder calls it, lazily, to
build its control-character set, so every render died; the port's handler then
retried synchronously and spun.

The fallback now has its own `TRY`, both failures chain into a named
`UNSUPPORTED_CODEPAGE_API`, and the view builder catches it and degrades — the
control-character set stays empty and `&`, `<`, `>`, `"`, newline, CR and tab
escape exactly as before.

Measured, not assumed: the modified upstream was mirrored into
builder-abap2UI5-js, re-transpiled and rebuilt, and

- `test/core-runnable.test.js` **passes** — the rebuilt core answers a roundtrip
  instead of hanging;
- the `hi_world` `displayBlock`/`height`/`Post` fix from §8 finally reaches the
  package, because there is a package again.

Worklist item 4 of ADR-006 is therefore closed at the source. The generated
trees were NOT committed in builder-abap2UI5-js: they encode upstream code that
exists only on the branch, and the nightly would revert them.

### Naht 4 makes the remaining P0 loud instead of silent

Responses now carry `S_FRONT.PROTOCOL` (`z2ui5_if_ui5_types=>c_protocol`), and
the webapp compares it before reading anything else. A response without the
field is let through — a backend older than the field cannot be told apart from
one that is merely older — so only a number that is present and different is a
mismatch.

This does not fix §8's protocol break; it fixes the *silence*. Today the port
pairs a frontend reading `S_ACTION` with a backend writing `PARAMS` and renders
an empty page with no error anywhere. Once the port carries this field, the same
pairing says so.

### Status of the four seams

| | what it opens | state |
|---|---|---|
| 1 `z2ui5_if_ui5_draft_store` | drafts in a CDS entity | on the branch |
| 2 `z2ui5_if_ui5_app_serializer` | JSON instead of asXML; spike proved a JS serializer carries app state | on the branch |
| 3 guarded codepage fallback | **closes ADR-006 worklist item 4** | on the branch |
| 4 `c_protocol` on the wire | a version mismatch reports itself | on the branch |

Still open in the port itself: worklist items 1–3 (response envelope, model
shape, app-name casing) and the 17 hand-port drifts. Still not done: an issue or
pull request at `abap2UI5/abap2UI5` for any of the four.

---

## 11. 2026-09-18 — a JavaScript class CAN be an abap2UI5 app

The open question from §10. Measured in one process, with a transpiled ABAP app
as the control on every run — the previous attempt at this produced a throw for
BOTH the subject and the control, which proves nothing and was nearly read as an
answer.

### Result

A plain JavaScript class, registered in `abap.Classes`, runs as an app on
upstream's transpiled runtime:

```
CONTROL (ABAP hi_world)   roundtrip 1  MODEL {"NAME":""}   view action
                          roundtrip 2  ["MESSAGE_BOX","show","Your name is Ada",…]
SUBJECT (JS class)        roundtrip 1  MODEL {"NAME":""}   view action
                          roundtrip 2  ["MESSAGE_BOX","show","Hello Ada",…]
                          app log      bind="{/NAME}"   event-sees-name="Ada"
```

So `client->_bind( this.name )` resolves to `{/NAME}` over a JavaScript field,
the two-way delta lands on the JS object, and the state survives the roundtrip.

**With `db_load_buffer_clear( )` between the two roundtrips**, so the second one
cannot be served from `z2ui5_cl_ui5_app_cont`'s process buffer and has to come
back through the draft document. Both control and subject still pass.

### The one thing that makes it work

`static ATTRIBUTES` on the class, in the shape a transpiled ABAP class carries:

```js
static ATTRIBUTES = {
  "NAME": { type: () => new abap.types.String({ qualifiedName: "STRING" }),
            visibility: "U", is_constant: " ", is_class: " " },
};
```

Without it the framework answers `BINDING_ERROR - No class attribute for binding
found`. That is not a crash but the framework's own diagnostic: RTTI derives
`mt_attri` from this map, and a JavaScript class has nothing else to derive from.

**So a cap2UI5 app is "a plain class plus a schema declaration".** That is a
deliberate API rather than a derivation, and arguably the better one for
JavaScript — but it is an API decision to make consciously, and the raw shape
above is too noisy to put in front of users. A helper (`defineApp({ name:
"string" })`) or generation from TypeScript types is the obvious wrapper.

### What is still not proven

A genuinely COLD process. The buffer clear forces the draft read, but both
roundtrips share one runtime, and the default store is @abaplint's SQLite client,
which is in-memory only (its constructor takes `{trace}` and no filename). A
two-process test therefore needs a persistent store — which is the CDS-entity
store (Naht 1) that is the next work item anyway.

### What this settles for the product

| | |
|---|---|
| JS app class | **works**, with a declared schema |
| CDS entity as the draft store | next item — `z2ui5_if_ui5_draft_store` + `set_instance( )` |
| clean CAP integration | already proven in §10 (48 lines) |

The remaining design work is an ergonomic app API, not a feasibility question.

---

## 12. 2026-09-18 — drafts in a CDS entity, and the cold-restart proof

The last open item from §11, and the one that turns the spike into something
shaped like the product.

### What was built

`cap2ui5.Drafts` — an ordinary CDS entity — plus a ~90-line JavaScript
implementation of `z2ui5_if_ui5_draft_store` (Naht 1) installed with one
`set_instance( )` call at boot. The framework's session state now lives in the
project's own database, under the project's connection, transactions and
authorization, next to every other CAP entity. Reads are owner-scoped through
`cds.context.user`, failing closed with the same "not found" the interface
contract prescribes, so a leaked draft id cannot restore somebody else's state.

Worth noting for anyone who reads the port's dual-store note: **async is fine
here**. The transpiled ABAP awaits every call, so a CDS-backed store — which is
inherently async — drops straight in. The hand-written port could not do that;
its transpiled code is synchronous, which is why its store had to be too.

### The cold-restart proof

Process A boots CAP, runs roundtrip 1 and is killed with SIGKILL. Process B is a
fresh boot — new ABAP runtime, empty `app_cont` buffer, nothing in memory. The
only thing bridging them is the row in `cap2ui5.Drafts`.

```
CONTROL (transpiled ABAP app)   A: MODEL {"NAME":""}  ->  B: ["MESSAGE_BOX","show","Your name is Ada",…]
SUBJECT (plain JS class)        A: MODEL {"NAME":""}  ->  B: ["MESSAGE_BOX","show","Hello Ada",…]
VERDICT  control=ok   js-app-cold-restart=true
```

Afterwards the table holds four rows, `owner=anonymous` (no auth configured in
the spike), each ~2.2 KB of asXML.

This is what the two earlier spikes could NOT show and were explicitly flagged
for: the JS-serializer probe kept the live object in a `Map`, and the JS-app
probe shared one runtime. Neither proved reconstruction. This does.

### Where that leaves the three requirements

| | |
|---|---|
| JS app class | **works** — plain class + a declared `ATTRIBUTES` schema |
| Persistence as a CDS entity | **works** — and survives a restart |
| Clean CAP integration | **works** — 48-line wrapper, ordinary `cds-serve` |

All three are now demonstrated end to end, in one running CAP server, against
upstream's unmodified transpiled framework.

### Honest boundaries

- **The UI has never rendered in a browser here.** Everything above is the wire.
  Chromium in this sandbox cannot reach the UI5 CDN (the proxy answers 405), and
  serving UI5 locally means the 611 MB `openui5-dist`. The frontend/backend
  protocol match is structural — both come from upstream — but it is unproven.
- **No authorization was exercised.** `owner=anonymous` because the spike
  configures no auth. The store reads `cds.context.user`, which is the right
  seam, but a real `@requires`/role test has not been run.
- **The `ATTRIBUTES` map is raw.** Usable, but not an API to put in front of
  users; it wants a `defineApp({ name: "string" })` helper or generation from
  TypeScript types.
- **The spike lives in a scratchpad**, not committed anywhere. It is evidence,
  not a deliverable.
- Nothing here changes the fact that the four upstream seams are unmerged, and
  that the existing cap2UI5 port remains broken (§8, worklist items 1-3).

---

## 13. 2026-09-19 — the app API, and where the prototype now lives

§12 left one item: the `ATTRIBUTES` schema was real but too raw to put in front
of users. It is gone, and so is every `await`.

### An app is now this

```js
defineApp("ZCL_JS_HELLO", class {
  name = "";                                   // plain field, plain value

  main(c) {                                    // no async
    if (c.isInitial) {
      c.view(`… <Input value="${c.bind("name")}"/>
               <Button text="Go" press="${c.event("GO")}"/> …`);
    } else {
      c.messageBox(`Hello ${this.name}`);
    }
  }
});
```

No `ATTRIBUTES`, no `INTERNAL_TYPE`, no `abap.types.*`, no `async`, no `await`.
The cold-restart test stays green, control included.

### How the schema derives itself

A field's type is already there: `name = ""` is a string, `true` a boolean, `1`
an integer. `defineApp` boxes each declared field at construction and builds the
`ATTRIBUTES` map RTTI needs from the same pass. Numbers are the one real
ambiguity — ABAP has I, P and F and they render differently — so an integer
becomes I, a fractional number F, and a decimal amount has to say so with
`t.packed(12, 2)`. Fields with no type at construction (`null`, objects, arrays)
are **reported**, not silently dropped:

> `[defineApp] ZCL_JS_HELLO: cannot type notes — null/undefined and objects carry no ABAP type.`

Booleans reach the app as real `true`/`false`, not ABAP's `"X"` / `" "`.

### How the awaits went away

They were never real. `_bind( )` and `_event( )` await nothing but their own
internal calls — measured — and every method is `async` only because the
transpiler marks all of them so. The only obstacle left was that JavaScript
cannot unwrap a promise synchronously, and that is sidestepped from both ends:

- **queries** answer a value the app uses inline, so they are resolved BEFORE
  `main( )`: `c.isInitial` is a boolean, and every bind path is resolved for
  every field up front. `c.event( )` cannot be — its names are invented by the
  app — so it returns a placeholder token and the real wire string is
  substituted in at flush time.
- **commands** answer nothing the app reads, so `c.view( )`, `c.messageBox( )`
  and `c.messageToast( )` are recorded synchronously and replayed in order after
  `main( )` returns.

An `async main` still works — the wrapper awaits it either way — so an app that
does want to call a CAP service keeps that option without changing anything for
the others. The one consequence to know: between `c.event("GO")` and the flush
the app holds a token, not the wire format. Embedding it in markup is the point
and works; parsing or comparing it does not.

`this` inside `main` is a **Proxy** over the instance: reads unwrap the box,
writes write through it. An earlier draft replaced the fields with their plain
values instead, and `_bind( )` answered `BINDING_ERROR` — rightly, since the box
was then no longer an attribute of the object and there was nothing left to match
by identity (its signature has no name parameter; it matches by value).

### The prototype is committed now

It lived only in a scratchpad, which for the most substantial part of this work
was the wrong place. It is now
[`builder-abap2UI5-js/docs/prototypes/open-abap-cap/`](https://github.com/cap2UI5/builder-abap2UI5-js/tree/main/docs/prototypes/open-abap-cap)
— the 548 hand-written lines plus a README with reproduction steps. The 19 MB of
transpiled framework and the webapp are gitignored, because any checkout can
rebuild them.

Nothing in that repository builds, tests or depends on it, and that is
deliberate: `core/`, the pipeline and every gate are unaffected. It is evidence,
not a deliverable. It is still linted — `no-undef` stays an error there, since
prototype code is the least exercised in the tree and needs that check most.

### Still open

- **The UI has never rendered in a browser.** All of this is the wire.
- **No authorization exercised** — `owner` came out `anonymous`.
- **Objects and arrays as app state** are unsupported: a structure or table type
  cannot be derived from `{}` or `[]`. Scalars only, and that is the next real
  piece of work on the API.
- **The facade is a stub** — no popups, navigation or tables.
- **The four upstream seams are unmerged.** If they are declined, everything from
  §10 onwards is a record of what was tried rather than a plan. No issue or pull
  request has been opened at `abap2UI5/abap2UI5`.
- The existing cap2UI5 port remains broken (§8, worklist items 1-3).

## 14. 2026-09-19 — the plugin shape, a real defect, and the ABI gate

§13 closed with a prototype that worked. A review against the two criteria —
*as little own code as possible* and *open-abap logic into CAP* — found the
shape wrong and one defect in it. Both are fixed; the third item is a test
that names the design's one hazard.

### The plugin shape

The prototype was an express app with CAP around it: a `server.js` that
replaced `cds.server`, a setup hook of its own, apps imported by hand. That
collides with any project that has a `server.js`, and it is not what would
ship. It is now an npm workspace of the three packages exactly as they would:

```
runtime/   @abap2ui5/runtime   what UPSTREAM would publish — a stand-in
plugin/    cap2ui5             cds-plugin.js, index.cds, lib/
example/   a CAP project       consumes cap2ui5 like any dependency
```

`npm i cap2ui5` is the installation: CAP loads `cds-plugin.js` from the
dependency, `index.cds` reaches the model through
`package.json#cds.requires.cap2ui5.model`, `cds deploy` creates
`cap2ui5.Drafts` next to the project's own entities, and the project's own
`server.js` is untouched. The plugin resolves the runtime from the project's
`node_modules`, so the version the project installed wins.

The `runtime/` stand-in is the concrete form of the one thing not in our hands:
upstream's `release.yaml` already cuts a `X.Y.Z-702` tag as a function of each
release; `node/output` + `node/setup/setup.mjs` + `app/webapp` published as
`@abap2ui5/runtime` is the same kind of artefact, ~30 lines of workflow and an
npm token. Until it exists, `scripts/assemble-runtime.sh` fills the directory
from a downported, transpiled checkout.

### The defect: every draft was `anonymous`

§12 reported `owner` came out `anonymous` and blamed it on "no auth configured".
That was wrong. The route was mounted straight on express, and CAP creates
`cds.context` — and with it `cds.context.user` — only in
`cds.middlewares.before`, which it mounts per service path and never globally.
So the store could **never** see a user on that route. Measured before the fix:
two roundtrips authenticated as alice, both stored as `anonymous`; and bob,
sending alice's draft id, was answered *"Hello Ada"*. The owner binding the
interface promises was void.

The fix is the route running behind the same middleware chain as every CAP
service, plus a one-line guard (`cds.cap2ui5.requires`, default
`authenticated-user`). `example/test/auth.test.mjs` proves it: no credentials
→ 401; bob with alice's id → `NO_DRAFT_ENTRY_OF_PREVIOUS_REQUEST_FOUND`; alice →
*"Hello Ada"*; the stored row carries `alice`. The test was verified to
discriminate: with the middleware removed and the guard off, all three fail
with exactly the leak — *"bob was served alice's draft"*, owner `anonymous`.

### The ABI gate

cap2UI5 does not couple to a documented abap2UI5 API. It couples to what
`@abaplint/transpiler` **emits**: the static `ATTRIBUTES`/`METHODS` maps and
their entry shape, `constructor_( )`, `~` becoming `$` in interface method
names, the `abap.types.*` boxes. None of that is a published contract, so a
bump can change it without a compile error — the failure would be a
`BINDING_ERROR` on the wire, the same class of hazard as the
`clientSignature( )` regex the port was bitten by.

`example/test/abi-gate.test.mjs` names every touchpoint `plugin/lib` has —
10 runtime globals, 6 `z2ui5_if_client` and 7 `z2ui5_if_ui5_draft_store`
methods with the parameter names passed to them, the draft structure
components, the five emitted statics, the framework fields — and checks each
against a class the transpiler itself produced. A transpiler or upstream bump
that changes the emission fails there, with the touchpoint named.

### Where that leaves the count

Hand-written, in the plugin: `define-app.js` 213, `draft-store.js` 122,
`cds-plugin.js` ~65, `runtime.js` ~60, `index.cds` 19 — **under 500 lines**,
against 12,588 + 4,286 in the port and its translator. Tests and the example
are on top of that and are not framework code.

### Still open

- **The UI has never rendered in a browser.** All of this is the wire.
- **Objects and arrays as app state** are unsupported. Scalars only; the next
  real piece of work on the API.
- **The facade is a stub** — no popups, navigation, tables; `c.event` is not
  readable as a value.
- **`@abap2ui5/runtime` does not exist.** Nobody has asked upstream yet.
- **Whether SQLite is still needed** once the store is installed — a
  measurement, not yet made.
- **The four upstream seams are unmerged.** No issue or pull request has been
  opened at `abap2UI5/abap2UI5`.
- The existing cap2UI5 port remains broken (§8, worklist items 1-3).

## 15. 2026-09-19 — everything that could be done without an org owner

§14's review had five items. All five are done, and what the numbers say is
below. What is left is exactly the set of things that need a human with
rights — that list closes the section.

### Done

- **Tables and structures as app state.** `t.table({ …row… })` and plain
  objects are boxed the way the transpiler emits them; rows cross as plain
  objects; components are UPPERCASE in the model. `books.js` fills a table
  from `SELECT.from(Books)` inside `main` and the framework carries it through
  the draft into the next roundtrip (four roundtrips, `books.test.mjs`).
- **`c.eventName` and `c.modelUpdate( )`.** The facade is now: `isInitial`,
  `eventName`, `bind`, `event`, `view`, `modelUpdate`, `messageBox`,
  `messageToast`, `raw`.
- **SQLite measured.** With the CDS store installed, 200 roundtrips send the
  runtime's private SQLite **no SQL** — only `rollback` and `endTransaction`,
  two per roundtrip. It stays for ABAP apps' own Open SQL; a CAP-backed
  `DatabaseClient` for those is a later step, not a precondition.
- **Performance measured.** **14 ms per roundtrip**, sequential, over HTTP, on
  SQLite (`bench.mjs`). The number nobody had.
- **Concurrency tested.** The transpiled framework keeps CLASS-DATA in
  process-global statics (`z2ui5_cl_ui5_app_cont=>mt_buffer` is the obvious
  one; it is cleared per request by the handler and stays at one entry across
  200 roundtrips). Three users interleaved in one process, twice, every answer
  to its owner (`concurrency.test.mjs`).
- **`@abap2ui5/runtime` as a job in upstream's `release.yaml`** (on the seams
  branch): `node/package.json` is the manifest; the tarball is a workflow
  artefact on every run; `npm publish` only from a tag and only with an
  `NPM_TOKEN`, warning loudly without one. Dry run: 1,307 files, 1.5 MB
  packed, 16.4 MB unpacked.
- **ADR-008** records the decision — host, not port — the repository plan
  (four archived, one repurposed, none created) and the cutover; ADR-007 is
  superseded. **`prototype.yml`** rebuilds and runs the whole proof from a
  scratch build of upstream, nightly and on every change.

### Hand-written framework code, final count for this round

`define-app.js` 300, `draft-store.js` 122, `cds-plugin.js` 66,
`runtime.js` 59, `index.cds` 19 — **566 lines**, against 16,874 in the port
and its translator. Tests, example and bench are on top and are not framework
code.

### What needs a person

Nothing below can be done from a pull request or from this session.

1. **Upstream: merge the seams branch** (`abap2UI5/abap2UI5`,
   `claude/happy-turing-qt6ljo`: the four seams and the `runtime` release job).
   No issue or PR has been opened; Naht 3 is the one to lead with — a
   reproducible upstream bug, `test/core-runnable.test.js` red to green.
2. **Upstream org: store an `NPM_TOKEN`** (automation token, `@abap2ui5`
   scope) and cut a release; the first `@abap2ui5/runtime@X.Y.Z` appears.
3. **`prototype.yml` → `main`**, and the `runtime/` stand-in → the published
   package (a PR, after 1 and 2).
4. **Render it in a browser.** Needs the UI5 CDN or a local `openui5-dist`;
   the sandbox has neither. Frontend and backend come from one commit, so
   the expectation is that it simply works — expectation, not proof.
5. **cap2UI5 org: the repository cutover** (ADR-008 steps 3–5): tag and
   repurpose `cap2UI5/cap2UI5`, move the Pages source, archive the four
   builder repos and `builder-abap2UI5-js`, rotate the four deploy keys out.
6. **Decide the facade's next slice** — popups, navigation, nested views —
   against real apps, not in the abstract. `c.raw` covers everything until
   then.

## 16. 2026-09-19 — it renders, and the final round is prepared

### It renders

The last "unproven" is gone. `examples/bookshop/test/browser.e2e.mjs` opens,
in a real Chromium, the page the framework itself serves on GET — the
ABAP-generated index with the inlined webapp modules, bootstrapping UI5 from
`sdk.openui5.org` — types into the hello app and gets its MessageBox, searches
in the Books app and gets its table row. The sandbox reaches no CDN, so the
CDN requests were answered from disk with OpenUI5 **1.108**, the newest
`openui5-dist` on npm; the page itself was not touched. The CI workflow runs
the same test against the real CDN. Screenshots are in the session.

### Prepared, so that the final round is short

- **`cap2UI5/cap2UI5`, branch `claude/happy-turing-qt6ljo`** carries the
  plugin repository in its final layout — `plugin/`, `examples/bookshop/`,
  `runtime/`, `scripts/`, `docs/adr/`, `.github/workflows/ci.yml`, README,
  AGENTS — with the generated app removed (439 files, −82,806 lines). Lint
  clean, 13/13, cold test, both browser tests green in that tree.
- **`scripts/assemble-runtime.sh --package X.Y.Z`** — ADR-008 cutover step 2
  in one flag, for the day `@abap2ui5/runtime` exists. `ci.yml` takes a
  `runtime_version` input for the same purpose.
- **[HANDOVER.md](HANDOVER.md)** — the manual steps in the order that works,
  with the PR texts for upstream and for `cap2UI5/cap2UI5` ready to paste,
  the npm-token steps, and the warning that matters: disable
  builder-cap2UI5's `update_cap` before merging, or it overwrites the plugin
  the next night.

### What remains is only what needs a person

Upstream merge, the npm token and a release, the two merges on the cap2UI5
side, the archiving, and three decisions (the auth default, the facade's next
slice, where the docs live). All of it is in HANDOVER.md.

## 17. 2026-09-19 — the facade's second slice, and three defects it exposed

§16 left "the facade is a stub — no popups, navigation or nested views" as the
next real piece of work. It is done, and building it turned up three things
that were already wrong.

### What an app can do now

```
lifecycle   isFirstRun  isDisplay  canGoBack  eventName  eventArg(i)  prevApp
screen      popup / popupClose     nest(into, xml, {insert, clear}) / nestClose
navigation  navTo(app)             navBack({event, data, app})
binding     event(name, [args])    — args come back as eventArg(1..n)
```

`examples/bookshop/srv/apps/pick.js` is the worked case: one app calls another,
the called app hands a choice back, and the caller reads it through
`c.prevApp`. Proven on the wire (`nav.test.mjs`, 4 tests) and in Chromium — the
popup is a real `sap.m.Dialog`, and after the round trip the screen reads
*chosen: red / picks: 1*.

### The three defects

**1. `c.isInitial` was the wrong question under the right-sounding name.** It
was wired to `check_on_navigated( )` and named after `check_on_init( )`. Those
are different: `check_on_init( )` is the first roundtrip of *this instance*,
while `check_on_navigated( )` is also true every time the app gets the screen
back. `z2ui5_if_client`'s own ABAP Doc calls confusing them *"the most common
way to end up with a screen that does not refresh"*. An app author putting
one-time seeding behind a name meaning "initial" would have had it re-run on
every navigation return — latent while the facade had no navigation, live the
moment it got some.

**2. `c.modelUpdate()` did nothing.** It called `view_model_update( )`, which
the interface declares *"obsolete — does NOTHING"*: changed bound data is
pushed automatically, to an open popup and a nested view too. It shipped in the
tables commit (§15) and `books.js` called it. The books test passed the whole
time — because the automatic push did the work the call was taking credit for.

Both are gone and throw an error naming the replacement, rather than quietly
changing meaning or answering `undefined`. The ABI gate now also asserts the
retired methods still take no parameters, so if upstream ever gives them
behaviour the refusal is re-read instead of silently kept.

**3. The browser test found what the wire test could not.** `nav.test.mjs` was
green while Chromium was not: both picker buttons fired one event with **no
argument**, and the wire test had hand-fed `T_EVENT_ARG` — simulating a
frontend that would never have sent it. `c.event(name, args)` carries `t_arg`
now, and the wire test asserts the composed markup so the cheap test fails next
time too. The rule is in the plugin repo's AGENTS.md: *a facade method that
composes view XML needs a browser test, not only a wire test.*

### Where the work lives

All of it in `cap2UI5/cap2UI5` (`claude/happy-turing-qt6ljo`), which is the
plugin's home now — the copy under `builder-abap2UI5-js/docs/prototypes/` is
the record of how the measurements were made and says so.

### Still open, unchanged

Everything in [HANDOVER.md](HANDOVER.md): the upstream merge, the npm token,
the switch to the published package, the repository cutover, and the two
decisions that are the maintainer's (the auth default, where the docs live).
Nested structures and tables of tables as app state are still unsupported, and
`c.raw` is still the escape hatch for anything the facade does not cover.

## 18. 2026-09-19 — the claim the project rests on, finally tested

Turn 12 of the session that started all this asked for one thing above the
others: *"Es soll sich sauber ins Cap einfügen damit man auch parallel andere
Cap Apps bauen kann mit der gleichen Datenbank und authorization usw."*

That claim was in the README, in ADR-008 and in a pull request body, and it was
demonstrated nowhere. `examples/bookshop` had **no CAP service at all** — only
cap2UI5 apps, which is precisely the configuration in which the claim cannot
fail and cannot be believed either.

`srv/catalog-service.cds` is one now, as plain as a CAP service gets: one
projection over the project's own `Books`, `@requires: 'authenticated-user'`,
and nothing in it knows cap2UI5 exists. `coexistence.test.mjs` drives it and
asserts the three things the claim actually means.

| | |
|---|---|
| **One authorization, two doors** | anonymous → 401 from the OData service *and* 401 from the z2ui5 route; alice → 200 from both |
| **The session state does not leak** | `cap2ui5.Drafts` is in the project's model and `cds deploy` creates the table, but a service exposes only what it projects: `/odata/v4/catalog/Drafts` is **404** and the metadata names no draft entity |
| **One database, both directions** | the Books app writes through `cds.ql` and the OData client sees the row at once; a row POSTed through OData is found by the app's next search |

The middle one is the one worth having. Session state reachable through
somebody's OData service would be the worst kind of surprise, and "a service
exposes only what it projects" is a thing one believes about CAP rather than a
thing anyone had checked here.

The Books app gained an `ADD` event for it — which also makes the example an
app that *writes* the project's entities, not only reads them.

**21 tests**, lint clean, CI green.

### Still open

Unchanged, and all of it in [HANDOVER.md](HANDOVER.md): the upstream merge, the
npm token, the switch to the published package, the repository cutover, and the
two decisions that are the maintainer's. On the API: nested structures and
tables of tables as app state are still unsupported, and `c.raw` is still the
escape hatch for whatever the facade does not cover.

## 19. 2026-09-19 — "unsupported" turned out to mean "not attempted"

Three of these sections, the README and a pull request body all said the same
thing: nested structures and tables of tables as app state are **unsupported**.
§13 put it as *"a structure or table type cannot be derived from `{}` or `[]`"*,
which reads like a property of the framework.

It was a property of my code. `unwrap( )` and `wrap( )` in `define-app.js` had
recursed through structures and tables all along, and the framework's model
carries the whole tree. What refused it was one guard in the type derivation —
*"a structure component must be a scalar"* — written when only scalars had been
tried. Removing it was the whole change; the measurement is `nested.test.mjs`:

```
ORDER: { ID: "4711",
         CUSTOMER: { NAME: "Ada", CITY: "London" },
         LINES: [ { SKU: "A-1", QTY: 2, PRICE: 9.5 },
                  { SKU: "B-2", QTY: 1, PRICE: 0.5 } ] }
```

— a structure inside a structure and a table inside a structure, decimals
included, written in one assignment and read back as plain values on a **later**
roundtrip, so it came out of the draft and not out of memory.

The guard is replaced by a depth limit of 8, which is a *cycle* guard and not a
judgement: an object that contains itself would otherwise recurse until the
stack went. An untypeable field is reported **by its path**
(`order.self.self.…`) and left out, the app runs without it.

The lesson is in the plugin repo's AGENTS.md, because the fix is worth less than
it: **"unsupported" must say whose limitation it is, and before writing that
something cannot be done, try it.** Three documents carried my untried guess as
a fact about somebody else's framework.

**23 tests**, lint clean, cold test green on all three cases.

### Still open

Only what needs a person, all of it in [HANDOVER.md](HANDOVER.md): the upstream
merge, the npm token, the switch to the published package, the repository
cutover, and the two decisions that are the maintainer's. `c.raw` remains the
escape hatch for whatever the facade does not cover.

## 20. 2026-09-19 — a security review of my own authorization code

Everything else here had been reviewed for whether it worked. The owner binding
had never been reviewed for whether it could be *defeated*, and it is the one
piece of the plugin that decides who sees whose data — so I ran a security
review over the branch diff and treated my own code as the suspect.

It found a real one.

### The defect: a truthiness check in an access decision

All three ownership checks in `draft-store.js` were guarded by the *truthiness*
of the stored owner rather than by its presence:

```js
if (r.owner && r.owner !== who()) throw await notFound();      // #read
const ok = !!r && (!r.owner || r.owner === who());              // check_exists
if (owner && owner.owner && owner.owner !== row.owner) throw …  // create
```

A `cap2ui5.Drafts` row whose `owner` is `NULL` or `""` therefore belonged to
**everybody**: any authenticated caller presenting its id was served it, and
`create( )`'s collision path would overwrite it. A draft row is not a small
object — it carries the serialized model of another user's running app.

Proof of concept, against the example project:

```
alice draft id: D46139087B1241DBBD701D4DC02F13AA
owner as stored          : "alice"
bob BEFORE (owner=alice) : refused          ← NO_DRAFT_ENTRY_OF_PREVIOUS_REQUEST_FOUND
owner after blanking     : ""
bob AFTER  (owner='')    : SERVED: ["MESSAGE_BOX","show","Hello Ada", …]
VERDICT empty-owner-readable-by-foreign-user=true
```

bob replayed alice's draft id and was handed alice's app instance. The only
difference between the refused request and the served one is the emptiness of
one column.

Two ways such a row arises, neither exotic. `who( )` was
`String(cds.context?.user?.id ?? "anonymous")`, and `?? ` catches `null` and
`undefined` but not `""` — `new cds.User({id:''}).id === ''` is permitted by
`@sap/cds` 9.9.3, so a strategy yielding an empty id would have published that
user's drafts to everyone. And `cap2ui5.Drafts` is an ordinary entity in the
*project's* model, so rows can arrive from a seed, a migration or another
handler with no owner at all.

The fix is the comparison the interface's own ABAP Doc always described:
`r.owner !== who()` in all three places, `owner` in the `UPDATE`'s `WHERE` so a
write cannot cross a change of hands, `not null` on the column, and a `who( )`
that refuses an empty identity loudly instead of storing a draft under an owner
it cannot tell from anybody else's. `create( )` also stops treating *every*
INSERT failure as a key collision: with no colliding row it re-raises the
original error rather than turning it into an update.

`auth.test.mjs` grew the case, and it discriminates — red on the old condition
(`not ok 3`), green on the new, with the other three assertions unmoved either
way.

### Three smaller ones, fixed in the same pass

- **Internal error text reached the client.** `res.send(String(e?.message))`
  relayed CDS, driver and runtime messages — entity names, SQL fragments,
  deployment paths. Now the detail goes to the log and the caller gets
  `roundtrip failed (<cds.context.id>)`.
- **The body was buffered before the guard.** `express.raw` sat in front of the
  authorization check, so an unauthenticated caller could make the server
  buffer 10 MB before the 401 was decided. The guard reads `cds.context` and
  nothing else, so it moved in front.
- **CI ran another repository's code with an unbounded token.** `ci.yml` checks
  out `abap2UI5/abap2UI5` at a mutable personal branch and runs `npm ci` plus
  three build scripts from it — arbitrary execution by whoever can push there —
  and declared no `permissions:`, so on `push: main` and the nightly schedule
  that code ran with a write-capable `GITHUB_TOKEN`. Now `permissions:
  contents: read` for the workflow and `persist-credentials: false` on that
  checkout. A `workflow_dispatch` input interpolated into a `run:` moved to the
  environment.

### What the review cleared

Worth recording, because each looked like a finding until it was checked:
`cds.ql` tagged templates parameterize (no SQL injection in the example apps);
the event-token substitution cannot be forged from app state; and
`@abap2ui5/runtime` is **not** a dependency-confusion target — the package is
unpublished, but the `@abap2ui5` npm scope is already claimed and carries three
packages, so only that org can publish the name.

Also measured and left alone: `cds.middlewares.before` contains two inert
`{factory}` placeholder objects that the spread passes to `app.all`. They are
accepted and harmless, and the auth middleware in the chain is a real function
that does run — anonymous gets 401, alice 200. It is a fragility (the chain's
shape is an undocumented `@sap/cds` internal, exercised here only against the
development auth kinds) rather than a vulnerability.

**24 tests**, lint clean, cold test green on all three cases.

### The lesson

In the plugin repo's AGENTS.md, because it outlives the fix: **an authorization
check compares presence, never truthiness.** `&&` in front of a comparison in
an access decision turns a missing value into a wildcard. I wrote that line
three times in the same file and reviewed it twice for whether it worked.

## 21. 2026-09-20 — "it fails on main too" is an attribution, not a diagnosis

Three red checks across two pull requests had the same note against them:
*fails identically on `main`, therefore not this branch's*. True in all three
cases, and verified by checking `main` out and running them. But it answers
only whose they are, and a reviewer reading it still has to do the work of
finding out **what** they are before deciding anything. So I did that instead.

### `devtoolsConsole › bounds the nodes of a map-shaped object`

`git log` on the two files ends in the same commit for both:

```
1f2cccb Fix start page second roundtrip and lazy-load OData model (#2771)
```

which is `main`'s **head**, and which added `MAX_NODES` and this test together.
The test has therefore never passed — not a flake, not environment-specific,
the two possibilities I could not rule out before.

The cause is a property a `JSON.stringify` replacer cannot have:

```js
expect(text).not.toContain(`"k${max * 3 - 1}"`);
```

A replacer answers a key's **value**; it cannot remove the key. For a
map-shaped object every one of the 3,000 keys is emitted whatever the node
budget does — the bounded ones simply carry `"[...]"` in place of their
object. The sibling test one block up passes because an *array* is bounded by
the `MAX_ITEMS` slice, which really does drop items.

The implementation does what #2771 claims for it — *"MAX_NODES caps the
walk"* — and I measured what that is worth:

| | without the cap | with it |
|---|---|---|
| 3,000 × `{i}` (the test's own input) | 54,781 chars | 48,779 — **11%** |
| 3,000 × `{id, name, city, amount}` | 205,930 chars | 99,878 — **52%** |

The patch is three lines and asserts the property the cap has: the last key's
*value* is the marker, not the object. Verified green (29/29) and verified to
**discriminate** — disabling the `++nodes > MAX_NODES` branch turns it red
again. It is proposed on the PR and deliberately not carried on the branch:
a frontend test fix inside a 27-file ABAP diff is a finding buried, not a
finding fixed.

Worth separating, and left as a decision rather than a patch: the cap bounds
the **walk**, not the **output**. 3,000 `"[...]"` markers are about as long as
the values they replace, which is why the first row above reads 11%.

### `shared-file-gate`

Not a mystery either — **#2771 predicted half of it in its own commit
message**: *"check:shared stays red until that follow-up lands"*, about the
`app-template` mirror of `building-apps.md`. The other three of the four
drifts are `sync-shared.yaml` against the samples repositories, introduced by
**#2719 on 2026-09-05**, a fortnight before this branch existed; those
repositories re-sync on a weekly cron.

### And a correction I owed

Re-measuring the `builder-abap2UI5-js` ratchet to check my proposed patch was
still right, I found I had read one of two arrays and reported the total as if
it were the one:

| | I wrote | it is |
|---|---|---|
| `regressions` | 161 | **104** |
| `fixedButStillListed` | 0 | **57** |

57 entries on the 131-entry known-failures list now **pass** — the newer
mirror fixed them and nobody was told, because the suite reports both
directions in one assertion. That makes the re-baseline recommendation better
than I described it: it *tightens* the ratchet by 57 as well as recording 104.
In the same pass, `cs_event` turned out to carry 42 constants on both sides,
not 42 against 36 — six are renamed, which is what my prose had said and my
numbers had not.

Both corrections are posted on the PR, where the wrong numbers are.

### The lesson

Establishing that a failure is not yours is the *first* half of the work and
reads like the whole of it, because the PR goes quiet either way. The second
half is cheap here — `git log` on the failing file found both causes in
minutes — and it is the half that lets somebody else act.

## 22. 2026-09-20 — the documentation is correct today and wrong on merge day

I rewrote HANDOVER.md this morning because it had gone stale, and then wrote a
step 4 for the repository cutover that said nothing about the 5,434 lines of
documentation the cutover invalidates. The same failure I had just fixed, one
section further down.

Measured over `docs/`: **36 pages, 5,434 lines, of which 27 pages describe the
port.** Only ROADMAP.md, HANDOVER.md and a single line of
`reference/database.md` know the plugin exists.

It is not a matter of stale paths. The whole guide teaches the port's app API,
and the plugin's is a different one rather than a renamed one:

```js
class my_app extends z2ui5_if_app {     // the plugin: defineApp("ZCL_X", class {
  async main(client) {                  //   main(c) {           <- synchronous
    if (client.check_on_init()) { … }   //     if (c.isFirstRun) { … }
    client.view_display(xml);           //     c.view(xml);
  }                                     //   }
}                                       // })
```

The audit is in [HANDOVER.md](HANDOVER.md) under step 4, split three ways: 12
pages of structure and reference to write from scratch (1,949 lines), 15 pages
of app-authoring API to write against `defineApp` (2,416), and 9 that survive
with corrections (1,069) because their arguments hold even where their
mechanics do not.

One finding worth naming on its own: **`docs/guide/samples.md` is generated and
its generator breaks.** `scripts/gen-samples.mjs` line 39 hardcodes
`…/cap2UI5/blob/main/core/srv/app/samples` as its source and lines 122/188
write that path into the prose. The plugin PR deletes that folder, so the
page's 98 rows lose their input — a build script that fails silently into a
stale page, not a compile error.

### What I did NOT do, deliberately

I did not rewrite any of it. These pages are **correct today**: they describe
the cap2UI5 that is published and working. Rewriting them into the future
tense would replace accurate documentation with speculative documentation, and
if the approach is rejected the repository would have lost both. The trigger is
the merge, not my having the knowledge in hand.

The maintainer decision about where the docs live should also come first, since
it decides whether 3,400 lines land here or in the plugin repository — and
nobody wants to write them twice.

### The lesson

Twice today the same shape: a page or a job I had "handled" while looking only
at the part I expected. The handover I rewrote, and then under-scoped by one
section. The job I diagnosed, and then read one failing step of. Both times the
thing I missed was adjacent to the thing I fixed.

## 23. 2026-09-20/21 — the merge day §22 predicted, and what writing the docs found

The four pull requests merged, the cutover ran, and the rewrite §22 said to
wait for happened: **all 36 pages**, plus `verify-refs` rewritten for the
plugin, in [docs#21](https://github.com/cap2UI5/docs/pull/21). The prediction
held — 27 pages did describe the port, and none of the rewriting could honestly
have been done a day earlier.

What §22 did not predict is that the rewrite would find defects in the code.

### The user exit was unreachable, and nothing said so

Writing `guide/user-exit.md` meant answering "how does a project install one?"
The port's answer (scan the app directories for a JS class implementing
`z2ui5_if_exit`) died with the port. Upstream's answer is *discovery*: ask the
class repository which classes implement `Z2UI5_IF_UI5_EXIT`,
`SEO_INTERFACE_IMPLEM_GET_ALL` on standard ABAP, XCO on cloud.

open-abap has no class repository. Measured, with an exit class sitting in
`abap.Classes`:

```
get_user_exit_class -> ""
get_instance        -> z2ui5_cl_ui5_user_exit      (the shipped default)
rtti lookup         THREW
```

The framework's own `CATCH cx_root` turns that raise into "no exit
configured". So the Content-Security-Policy, the five security headers, the
UI5 bootstrap URL, the theme, the draft expiry, the CSRF gate and the
forwarded-host trust were **not configurable from a CAP project at all** —
with no error anywhere. A project that had to tighten the CSP, or serve UI5
from its own host instead of the CDN, could not.

`defineExit( )` binds the exit to the same static `exit_instantiate( )` writes
to. And the first defect uncovered a second: the CDS draft store's `cleanup( )`
deleted on a hard-coded four hours while the shipped ABAP store asks the exit
for `draft_exp_time_in_hours` — so a project raising the expiry got drafts the
framework would have resumed and the cleanup had already deleted.

### Six things the old page asserted that measurement contradicted

Not stale paths — claims:

| the page said | the framework does |
|---|---|
| a `favicon` config field | no such field exists |
| `title` sets the tab title | the field exists and is **no longer read**; the app sets the title |
| `src` is the locally served runtime, "which keeps the stack working offline" | `src` is the **OpenUI5 CDN**. A server without outbound internet renders nothing |
| seven security headers | five; the caching ones come from the handler |
| context: `method`, `session_id`, `tenant`, `body` | `path`, `app_start`, `t_params` |
| — | two roundtrip fields missing entirely: `check_trust_forwarded_host`, `check_hide_error_details` |

The CDN one propagated: Troubleshooting told readers to reinstall
`openui5-dist` and check a `/resources` route that 404s.

**The lesson, now a rule in both AGENTS.md files:** the runtime is upstream's
ABAP on open-abap, and not everything upstream does works here. Boot it and
measure before porting a claim from abap2UI5's documentation. Writing the
documentation was the most effective code review this project has had — because
documenting a mechanism means asking how a reader would *use* it, and that is
a question the tests were not asking.

### The gate that knew the old repository

`verify-refs` reported ten problems after the cutover, all of them its own:
paths under `core/ srv/ db/ app/`, classes as files in the cap2UI5 checkout,
imports through `core/package.json`'s exports map. Disabling it would have
reintroduced the defect class it exists to catch.

The ground truth had split in two, so it now reads two checkouts — cap2UI5 for
paths, app ids, the plugin's exports and options and the runtime pin; abap2UI5
for the framework class names, which are **not in cap2UI5 at all**. Resolving
those against the assembled runtime would have passed on a laptop, where
`runtime/output` exists, and checked nothing in CI, where it does not.

Then I made the same mistake one level up: `check.yml` got the second checkout
and `deploy.yml` did not — and deploy runs the *lenient* `npm run check`, which
skips what a missing checkout needs and exits 0. The deploy went green while
checking no `z2ui5_*` class at all, and published once in that state. Same
failure the file's own comment describes, reached from the other direction: not
by losing a checkout, but by **adding a requirement to the checker and not to
the workflow**. §22's lesson, third instance: the thing I missed was adjacent
to the thing I fixed.

### A green CI run is one sample

Merging meant merging `main`, which had just taken a dependency bump — `@sap/cds`
9→10, `@cap-js/sqlite` 2→3, `express` 4→5 — with a **green** CI run on it.

Six runs of `npm test` on `main` itself, nothing of my branch in the tree:

```
run 1  28/28     run 3  27/28     run 5  27/28
run 2  25/28     run 4  27/28     run 6  27/28
```

Five of six red, on a suite CI had just called green. The cause, once the test
server's output was kept: `@cap-js/sqlite` 3 moved to node's built-in
`node:sqlite`, whose busy timeout defaults to **zero**. WAL keeps readers out
of the way; writers still serialize, and every cap2UI5 roundtrip writes a
draft, so the second writer in the same millisecond got `SQLITE_BUSY` instead
of waiting two milliseconds. better-sqlite3 had waited.

One line of project config (`"client": { "timeout": 5000 }`, passed straight to
the driver) took `main` to 6/6 green over the same six runs. Not my branch's
defect — but my branch added eight more server-backed tests, so pushing them
onto a known race would have made it worse and the next red run would have
looked like mine.

**The lesson:** a single green run proves a suite *can* pass. When a
dependency bump lands under a suite that talks to a database over more than
one process, run it several times before believing it.
