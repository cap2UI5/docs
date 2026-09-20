#!/usr/bin/env node
/**
 * verify-refs — check that what the docs claim about the code is still true.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every documentation defect found in the 2026-08 audit was the same kind:
 * the docs named a file path, a class or a sample that had moved or never
 * existed. Layer paths still pointed at pre-rename locations, the most
 * prominent "try it now" link named a sample class that is not in the
 * catalogue, and a security section described an auth setup the code had
 * long since replaced.
 *
 * None of that is caught by `vitepress build`: it validates that internal
 * MARKDOWN links resolve, and nothing at all about the world outside the
 * docs. This is the docs' equivalent — it reads the same ground truth
 * AGENTS.md declares and fails when prose and repository disagree.
 *
 * WHAT CHANGED WITH THE PLUGIN (2026-09)
 * --------------------------------------
 * cap2UI5 used to be a generated CAP application with the framework vendored
 * at `core/`, and this checker knew that shape: repo paths under `core/`,
 * `srv/`, `db/`, `app/`; classes as FILES in the checkout; imports resolved
 * through `core/package.json`'s exports map. None of that exists any more.
 * cap2UI5 is a CAP plugin that hosts upstream's own transpiled runtime, so
 * the ground truth moved and split in two:
 *
 *   - the cap2UI5 checkout still answers for repository paths, for the app
 *     ids `?app_start=` may name, for what `require("cap2ui5")` exports and
 *     for which runtime release is pinned;
 *   - the FRAMEWORK CLASSES the docs name (z2ui5_cl_…, z2ui5_if_…) are not
 *     in cap2UI5 at all. They are abap2UI5's ABAP, transpiled into
 *     @abap2ui5/runtime — whose content is assembled, gitignored, and absent
 *     from a fresh checkout. So the class inventory is read from the abap2UI5
 *     source tree, which is where those names are actually defined.
 *
 * Resolving classes against the assembled runtime instead would have made the
 * check pass on a laptop (where runtime/output exists) and silently check
 * nothing in CI (where it does not) — the precise failure mode
 * --require-checkout was added to prevent, one level down.
 *
 * WHAT IT CHECKS
 * --------------
 *   1. repository paths in backticks (`plugin/…`, `examples/…`, …) exist in
 *      a cap2UI5 checkout. Reader-owned paths (`srv/apps/…`, `db/…`) are NOT
 *      claims about this repository and are deliberately not matched.
 *   2. every `?app_start=<id>` names an app that is registered somewhere —
 *      with `defineApp("ID", …)` in the cap2UI5 checkout, or in the same
 *      documentation page (a page that teaches an app may name it).
 *   3. every z2ui5 class named in backticks exists in the abap2UI5 source
 *      the hosted runtime is built from.
 *   4. every `require("cap2ui5")` in a FENCED CODE BLOCK destructures names
 *      the package actually exports, and `require("cap2ui5/<sub>")` lands on
 *      a file that exists. Stale `require("abap2UI5/…")` — the port's package,
 *      which no longer exists — is reported by name.
 *   5. every plugin option named as `cds.cap2ui5.<key>` is a key the plugin
 *      really defines, and every three-part release number (1.x.y) is the
 *      runtime release the checkout pins, or an allowlisted historical number.
 *
 * Check 4 exists because the first three did not see the largest defect this
 * site ever had. Fenced blocks were skipped wholesale as "examples, not
 * claims" — but an example is the one claim every reader copies, and thirteen
 * pages went on teaching `z2ui5_cl_xml_view` for months after the class was
 * gone. A retired API is not visible in prose; it is visible in the import
 * line above the example, and that line is a claim about the package.
 *
 * Usage:
 *   CAP2UI5_DIR=… ABAP2UI5_DIR=… node scripts/verify-refs.mjs
 *   node scripts/verify-refs.mjs            # defaults to ../cap2UI5, ../abap2UI5
 *   node scripts/verify-refs.mjs --list     # print the resolved inventory
 *   node scripts/verify-refs.mjs --require-checkout   # missing checkout = error
 *
 * Exits 1 on the first broken claim, with the file and line to fix. When a
 * checkout is missing it says so and skips the checks that need it — a missing
 * checkout is a setup gap, not a documentation defect. That leniency is right
 * on a laptop and wrong in CI: a workflow that checks the repos out and then
 * silently loses one would go on passing while checking nothing.
 * `--require-checkout` turns every skip into a failure, and
 * .github/workflows/check.yml passes it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs");
const APP = path.resolve(process.env.CAP2UI5_DIR || path.join(ROOT, "..", "cap2UI5"));
const UPSTREAM = path.resolve(process.env.ABAP2UI5_DIR || path.join(ROOT, "..", "abap2UI5"));
const LIST = process.argv.includes("--list");
const REQUIRE_CHECKOUT = process.argv.includes("--require-checkout");

const missing = [];
const haveApp = fs.existsSync(path.join(APP, "plugin", "package.json"));
const haveUpstream = fs.existsSync(path.join(UPSTREAM, "src"));
if (!haveApp) missing.push([`cap2UI5`, APP, `CAP2UI5_DIR`, `cap2UI5/cap2UI5`]);
if (!haveUpstream) missing.push([`abap2UI5`, UPSTREAM, `ABAP2UI5_DIR`, `abap2UI5/abap2UI5`]);

if (missing.length) {
  const how = missing
    .map(([n, at, env, repo]) => `  ${n}: nothing at ${at} — set ${env}, or clone ${repo} next to this repo`)
    .join("\n");
  if (REQUIRE_CHECKOUT) {
    console.error(`verify-refs: missing reference checkout(s) — required by --require-checkout.\n${how}`);
    console.error(`\nSkipping here would mean the run checked nothing while reporting success.`);
    process.exit(1);
  }
  console.log(`verify-refs: skipping the checks that need a checkout.\n${how}`);
  if (missing.length === 2) process.exit(0);
}

// ---- inventory of the plugin repo -----------------------------------------
/** every file path in a repo, repo-relative, excluding installs and anything
 *  that is ASSEMBLED rather than committed — a path only a laptop has would
 *  otherwise pass here and fail in CI, or worse, the other way round. */
function inventory(dir, base = dir, out = new Set()) {
  const SKIP = new Set(["node_modules", ".git", "gen", "dist", ".vitepress"]);
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    const rel = path.relative(base, p).split(path.sep).join("/");
    if (/^runtime\/(output|setup|webapp)$/.test(rel)) continue;   // assembled, gitignored
    out.add(rel);
    if (e.isDirectory()) inventory(p, base, out);
  }
  return out;
}

const files = haveApp ? inventory(APP) : new Set();

/** app ids: what defineApp( ) registers in the checkout, lowercased */
const appIds = new Set();
if (haveApp) {
  for (const f of files) {
    if (!/\.(c|m)?js$/.test(f)) continue;
    const src = fs.readFileSync(path.join(APP, f), "utf8");
    for (const m of src.matchAll(/defineApp\(\s*["'`]([A-Za-z0-9_]+)["'`]/g)) appIds.add(m[1].toLowerCase());
  }
}

/** what `require("cap2ui5")` hands back — read from the package, not guessed */
const PLUGIN_EXPORTS = (() => {
  if (!haveApp) return null;
  const idx = path.join(APP, "plugin", "index.js");
  if (!fs.existsSync(idx)) return null;
  const src = fs.readFileSync(idx, "utf8");
  const m = /module\.exports\s*=\s*\{([^}]*)\}/.exec(src);
  if (m) return new Set(m[1].split(",").map((s) => s.split(":")[0].trim()).filter(Boolean));
  // `module.exports = require("./lib/x")` — read the names off that module
  const re = /module\.exports\s*=\s*require\(\s*["'`](\.[^"'`]+)["'`]\s*\)/.exec(src);
  if (!re) return null;
  const lib = path.join(APP, "plugin", re[1].replace(/^\.\//, "").replace(/\.js$/, "") + ".js");
  const inner = /module\.exports\s*=\s*\{([^}]*)\}/.exec(fs.readFileSync(lib, "utf8"));
  return inner ? new Set(inner[1].split(",").map((s) => s.trim()).filter(Boolean)) : null;
})();

/** the plugin's own configuration keys, from package.json#cds.cap2ui5 */
const PLUGIN_OPTIONS = (() => {
  if (!haveApp) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(APP, "plugin", "package.json"), "utf8"));
    return new Set(Object.keys(pkg.cds?.cap2ui5 ?? {}));
  } catch { return null; }
})();

// ---- inventory of the framework's classes ---------------------------------
// From abap2UI5's ABAP, which is what @abap2ui5/runtime is transpiled from.
// Both z2ui5_cl_* and z2ui5_if_* land here; upstream's frozen src/99 is
// included because the hosted runtime carries it (measured: the assembled
// output has z2ui5_cl_xml_view.clas.mjs). A name being present is not a
// recommendation, only a statement that it exists.
const classes = new Set();
if (haveUpstream) {
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      const m = /^([a-z0-9_]+)\.(clas|intf)\.abap$/.exec(e.name);
      if (m && !e.name.includes(".testclasses.")) classes.add(m[1].toLowerCase());
    }
  };
  walk(path.join(UPSTREAM, "src"));
}

// ---- the pinned runtime release -------------------------------------------
/* The site names the runtime release in prose ("@abap2ui5/runtime 1.144.0"),
 * and the day the pin moves, every mention goes stale at once — the exact
 * defect class the path and class checks exist for, one level up. The ground
 * truth is the package the plugin hosts. Numbers that are NOT that pin live in
 * .verify-refs-ignore with a reason: historical upstream releases stay true
 * whatever the pin says, and UI5 numbers are not framework releases at all.
 * Two-part floors like 1.71 are UI5 talk and deliberately not matched. */
const VERSION_SOURCE = "runtime/package.json";
const PINNED_RELEASE = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(APP, VERSION_SOURCE), "utf8")).version ?? null;
  } catch { return null; }
})();

if (LIST) {
  console.log(`${files.size} paths in ${APP}`);
  console.log(`${classes.size} framework classes/interfaces in ${UPSTREAM}/src`);
  console.log(`app ids (${appIds.size}): ${[...appIds].sort().join(", ")}`);
  console.log(`cap2ui5 exports: ${PLUGIN_EXPORTS ? [...PLUGIN_EXPORTS].join(", ") : "NOT FOUND"}`);
  console.log(`plugin options: ${PLUGIN_OPTIONS ? [...PLUGIN_OPTIONS].join(", ") : "NOT FOUND"}`);
  console.log(`pinned runtime: ${PINNED_RELEASE ?? "NOT FOUND"}`);
  process.exit(0);
}

// ---- scan the docs --------------------------------------------------------
function markdownFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".vitepress") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) markdownFiles(p, out);
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

const problems = [];
const add = (file, line, msg) =>
  problems.push(`${path.relative(ROOT, file)}:${line}  ${msg}`);

// A backticked token that looks like a path INTO the cap2UI5 repository.
// Deliberately narrow: only the roots that repository actually has. `srv/`,
// `db/` and `app/` are NOT here — since the plugin, those are the READER's
// project, and checking them against this repo would flag correct prose.
const PATH_ROOTS = ["plugin/", "examples/", "runtime/", "scripts/", "docs/adr/"];
const PATH_RE = /`([A-Za-z0-9_@./-]+\/[A-Za-z0-9_@./-]+)`/g;
const APP_START_RE = /app_start=([a-z0-9_]+)/gi;
const RELEASE_RE = /\b1\.\d{2,3}\.\d+\b/g;
// A backticked span that STARTS with a z2ui5 class name. It deliberately does
// not require the closing backtick to follow the identifier: the docs write
// `z2ui5_cl_xml_view.js`, `z2ui5_cl_util.register_app_dir(dir)` and
// `z2ui5_cl_xml_view=>factory( )`, and demanding a bare identifier meant every
// one of those mentions was invisible to this checker.
const CLASS_RE = /`(z2ui5_(?:cl|if|cx)_[a-z0-9_]+)(?![a-z0-9_])/gi;
// require("cap2ui5"), require("cap2ui5/lib/…"), and the port's dead package.
const REQUIRE_RE = /require\(\s*["'`](cap2ui5|abap2UI5)(?:\/([^"'`]+))?["'`]\s*\)/gi;
// `const { defineApp, t } = require("cap2ui5")` — the names, not just the path
const DESTRUCTURE_RE = /(?:const|let|var)\s*\{([^}]*)\}\s*=\s*require\(\s*["'`]cap2ui5["'`]\s*\)/g;
// `cds.cap2ui5.apps`, `cap2ui5.webapp` in prose or a config block. Case
// matters and the flag is deliberately absent: `cap2ui5.Drafts` is the CDS
// ENTITY, which the docs name constantly and which is not an option at all.
const OPTION_RE = /`(?:cds\.)?cap2ui5\.([a-z][a-z_]*)`/g;
// which app ids a PAGE defines itself: a page teaching an app may name it
const DEFINES_RE = /defineApp\(\s*["'`]([A-Za-z0-9_]+)["'`]/g;

// Tokens the docs use that are not claims about this repository — other
// repos' paths, files the reader creates, placeholder class names. Each is
// listed WITH A REASON in docs/.verify-refs-ignore, so an exception can be
// reviewed like any other statement rather than silently swallowing a defect.
const IGNORE = new Set(
  (fs.existsSync(path.join(DOCS, ".verify-refs-ignore"))
    ? fs.readFileSync(path.join(DOCS, ".verify-refs-ignore"), "utf8")
    : ""
  )
    .split("\n")
    .map((l) => l.split("#")[0].trim().toLowerCase())
    .filter(Boolean),
);

for (const file of markdownFiles(DOCS)) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  const pageApps = new Set([...text.matchAll(DEFINES_RE)].map((m) => m[1].toLowerCase()));

  // Fenced code blocks show paths a reader will create, so the path check
  // stays out of them — but the imports and the `?app_start=` URLs in an
  // example are claims about the package like any other, and are checked.
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    const n = i + 1;

    // release numbers are claims wherever they stand, prose or example
    if (PINNED_RELEASE) {
      for (const m of line.matchAll(RELEASE_RE)) {
        if (m[0] === PINNED_RELEASE || IGNORE.has(m[0])) continue;
        add(file, n, `names release ${m[0]}, but the checkout pins ${PINNED_RELEASE} `
          + `(version in ${VERSION_SOURCE}) - update the prose, or add the number `
          + `to .verify-refs-ignore with the reason it stays`);
      }
    }

    for (const m of line.matchAll(APP_START_RE)) {
      const id = m[1].toLowerCase();
      if (appIds.has(id) || pageApps.has(id) || IGNORE.has(id)) continue;
      if (!haveApp) continue;
      add(file, n, `?app_start names an app nothing registers: ${m[1]} `
        + `(no defineApp("${m[1].toUpperCase()}") in the checkout or on this page)`);
    }

    if (inFence) {
      for (const m of line.matchAll(REQUIRE_RE)) {
        const pkg = m[1];
        const sub = m[2] || ``;
        const spec = `${pkg}${sub ? `/${sub}` : ``}`;
        if (/[*…]/.test(sub)) continue;                  // a shape, not an import
        if (IGNORE.has(spec.toLowerCase())) continue;
        if (pkg.toLowerCase() === "abap2ui5") {
          add(file, n, `require("${spec}") is the RETIRED port package - the plugin is `
            + `require("cap2ui5"), and the framework's own classes are not importable`);
          continue;
        }
        if (!haveApp || !sub) continue;                  // bare require checked below
        const target = path.join("plugin", sub.endsWith(".js") ? sub : `${sub}.js`);
        if (!files.has(target.split(path.sep).join("/"))) {
          add(file, n, `require("${spec}") resolves to ${target}, which does not exist`);
        }
      }
      for (const m of line.matchAll(DESTRUCTURE_RE)) {
        if (!PLUGIN_EXPORTS) continue;
        for (const raw of m[1].split(",")) {
          const name = raw.split(":")[0].trim();
          if (!name || PLUGIN_EXPORTS.has(name) || IGNORE.has(name.toLowerCase())) continue;
          add(file, n, `require("cap2ui5") does not export ${name} `
            + `(it exports ${[...PLUGIN_EXPORTS].join(", ")})`);
        }
      }
      return;
    }

    for (const m of line.matchAll(PATH_RE)) {
      const p = m[1].replace(/^\.\//, "").replace(/\/$/, "");
      if (!PATH_ROOTS.some((r) => (p + "/").startsWith(r))) continue;
      if (IGNORE.has(p.toLowerCase())) continue;
      if (p.includes("*")) continue;             // globs describe a shape
      if (!haveApp || files.has(p)) continue;
      add(file, n, `path does not exist in cap2UI5: ${p}`);
    }

    for (const m of line.matchAll(OPTION_RE)) {
      if (!PLUGIN_OPTIONS) continue;
      const key = m[1].toLowerCase();
      if (PLUGIN_OPTIONS.has(key) || IGNORE.has(`cap2ui5.${key}`)) continue;
      add(file, n, `cap2ui5.${m[1]} is not a plugin option `
        + `(package.json#cds.cap2ui5 defines ${[...PLUGIN_OPTIONS].join(", ")})`);
    }

    for (const m of line.matchAll(CLASS_RE)) {
      const cls = m[1].toLowerCase();
      if (line[m.index + m[0].length] === "*") continue;   // glob: a family, not a class
      if (!haveUpstream || classes.has(cls) || IGNORE.has(cls)) continue;
      add(file, n, `no such class or interface in abap2UI5: ${m[1]}`);
    }
  });
}

// ---- internal anchors -----------------------------------------------------
// `vitepress build` validates that a linked FILE exists; it says nothing
// about the #fragment. A heading that gains or loses a backtick silently
// breaks every link into it, which is exactly how the four dead anchors in
// this repo happened — all of them into headings containing `code spans`.

/** VitePress' heading → slug rule, close enough for link checking. */
function slugify(heading) {
  return heading
    .trim()
    .replace(/[`*_~]/g, "")           // inline markup is dropped, not replaced
    .toLowerCase()
    .replace(/[^\w\- ]+/g, "")        // punctuation (including / and —) vanishes
    .replace(/ /g, "-");
}

/** anchors a page offers: every heading, plus explicit {#custom} ids */
function anchorsOf(file) {
  const out = new Set();
  let inFence = false;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = /^#{1,6}\s+(.*)$/.exec(line);
    if (!m) continue;
    let heading = m[1];
    const custom = /\{#([\w-]+)\}\s*$/.exec(heading);
    if (custom) {
      out.add(custom[1]);
      heading = heading.slice(0, custom.index);
    }
    out.add(slugify(heading));
  }
  return out;
}

const anchorCache = new Map();
const anchorsFor = (file) => {
  if (!anchorCache.has(file)) anchorCache.set(file, anchorsOf(file));
  return anchorCache.get(file);
};

// relative links (./page#a, ../dir/page#a) AND same-page (#a)
const LINK_RE = /\]\((\.[^)\s]*?|)(#[^)\s]*?)(?:\s+"[^"]*")?\)/g;

for (const file of markdownFiles(DOCS)) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const m of line.matchAll(LINK_RE)) {
      const target = m[1];
      const hash = m[2].slice(1);
      if (!hash) continue;

      let page = target
        ? path.resolve(path.dirname(file), target)
        : file;                                    // same-page #anchor
      if (target && !page.endsWith(".md")) page += ".md";   // cleanUrls links
      if (!fs.existsSync(page)) continue;          // vitepress build covers this

      if (!anchorsFor(page).has(hash)) {
        add(file, i + 1, `dead anchor #${hash} in ${path.relative(DOCS, page)}`);
      }
    }
  });
}

if (problems.length) {
  console.error(`verify-refs: ${problems.length} stale reference(s)\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(`\ncap2UI5: ${APP}\nabap2UI5: ${UPSTREAM}`);
  console.error(`The docs describe these repos — update the prose, or the path/class moved.`);
  process.exit(1);
}

console.log(`verify-refs: OK — every documented path, class, app id and option resolves`);
