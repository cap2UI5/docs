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
 * docs. The three builder repos each have a freshness watchdog; this is the
 * docs' equivalent — it reads the same ground truth AGENTS.md declares and
 * fails when prose and repository disagree.
 *
 * WHAT IT CHECKS
 * --------------
 *   1. repository paths in backticks (`core/srv/…`, `srv/…`, `db/…`, …)
 *      exist in a cap2UI5 checkout
 *   2. every `?app_start=<class>` names a class that actually resolves
 *   3. every z2ui5 class named in backticks exists somewhere in the app
 *   4. every `require("abap2UI5/…")` in a FENCED CODE BLOCK resolves through
 *      the exports map of core/package.json, and onto a file that exists
 *
 * Check 4 exists because the first three did not see the largest defect this
 * site ever had. Fenced blocks were skipped wholesale as "examples, not
 * claims" — but an example is the one claim every reader copies, and thirteen
 * pages went on teaching `z2ui5_cl_xml_view` for months after the class was
 * gone. A retired API is not visible in prose; it is visible in the import
 * line above the example, and that line is a claim about the package.
 *
 * Usage:
 *   CAP2UI5_DIR=/path/to/cap2UI5 node scripts/verify-refs.mjs
 *   node scripts/verify-refs.mjs            # defaults to ../cap2UI5
 *   node scripts/verify-refs.mjs --list     # print the resolved inventory
 *
 * Exits 1 on the first broken claim, with the file and line to fix. When no
 * checkout is available it says so and exits 0 — a missing checkout is a
 * setup gap, not a documentation defect.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs");
const APP = path.resolve(process.env.CAP2UI5_DIR || path.join(ROOT, "..", "cap2UI5"));
const LIST = process.argv.includes("--list");

if (!fs.existsSync(path.join(APP, "package.json"))) {
  console.log(`verify-refs: no cap2UI5 checkout at ${APP} — skipping.`);
  console.log(`             set CAP2UI5_DIR or clone cap2UI5/cap2UI5 next to this repo.`);
  process.exit(0);
}

// ---- inventory of the app repo -------------------------------------------
/** every file path in the app, repo-relative, excluding installs */
function inventory(dir, base = dir, out = new Set()) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === "gen") continue;
    const p = path.join(dir, e.name);
    out.add(path.relative(base, p).split(path.sep).join("/"));
    if (e.isDirectory()) inventory(p, base, out);
  }
  return out;
}

const files = inventory(APP);
/** class name (lowercase) → repo-relative path */
const classes = new Map();
for (const f of files) {
  const b = path.basename(f);
  if (b.endsWith(".js")) classes.set(b.slice(0, -3).toLowerCase(), f);
}

// ---- the core package's exports map ---------------------------------------
// `require("abap2UI5/x")` does not resolve to a path, it resolves through the
// "exports" block of core/package.json — so a subpath that is not in that map
// is a broken import even when a file of that name exists somewhere in the
// tree, and a subpath that IS in the map still has to land on a real file.
const CORE_PKG = path.join(APP, "core", "package.json");
const EXPORTS = fs.existsSync(CORE_PKG)
  ? JSON.parse(fs.readFileSync(CORE_PKG, "utf8")).exports || {}
  : null;

/**
 * Resolve `abap2UI5/<subpath>` (or bare `abap2UI5`) the way node does:
 * an exact key wins, otherwise the pattern key with the longest prefix.
 * Returns the repo-relative path it lands on, or null when nothing matches.
 */
function resolveExport(subpath) {
  if (!EXPORTS) return null;
  const key = subpath ? `./${subpath}` : `.`;
  const inApp = (target) => `core/${target.replace(/^\.\//, "")}`;

  if (typeof EXPORTS[key] === "string") return inApp(EXPORTS[key]);

  let best = null;
  for (const [k, target] of Object.entries(EXPORTS)) {
    const star = k.indexOf("*");
    if (star === -1 || typeof target !== "string") continue;
    const pre = k.slice(0, star);
    const post = k.slice(star + 1);
    if (!key.startsWith(pre) || !key.endsWith(post)) continue;
    if (key.length < pre.length + post.length) continue;
    if (best && pre.length <= best.pre.length) continue;
    best = { pre, post, target, star: key.slice(pre.length, key.length - post.length) };
  }
  if (!best) return null;
  return inApp(best.target.replace(`*`, best.star));
}

if (LIST) {
  console.log(`${files.size} paths, ${classes.size} classes in ${APP}`);
  console.log(`exports map: ${EXPORTS ? Object.keys(EXPORTS).length + " subpaths" : "NOT FOUND"}`);
  const samples = [...classes.keys()].filter((c) => c.startsWith("z2ui5_cl_smp_")).sort();
  console.log(`samples (${samples.length}): ${samples.join(", ")}`);
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

// A backticked token that looks like a path INTO the app repo. Deliberately
// narrow: only the roots the app actually has, so prose like `npm run build`
// or a path in another repo is not mistaken for a claim about this one.
const PATH_ROOTS = ["core/", "srv/", "db/", "app/", "test/"];
const PATH_RE = /`([A-Za-z0-9_@./-]+\/[A-Za-z0-9_@./-]+)`/g;
const APP_START_RE = /app_start=([a-z0-9_]+)/gi;
// A backticked span that STARTS with a z2ui5 class name. It deliberately does
// not require the closing backtick to follow the identifier: the docs write
// `z2ui5_cl_xml_view.js`, `z2ui5_cl_util.register_app_dir(dir)` and
// `z2ui5_cl_xml_view=>factory( )`, and demanding a bare identifier meant every
// one of those mentions was invisible to this checker.
const CLASS_RE = /`(z2ui5_(?:cl|if|cx)_[a-z0-9_]+)(?![a-z0-9_])/gi;
// require("abap2UI5"), require("abap2UI5/z2ui5_if_app"), … in a code fence.
const REQUIRE_RE = /require\(\s*["'`]abap2UI5(?:\/([^"'`]+))?["'`]\s*\)/g;

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

// Whole directory trees that belong to a different repo in the ecosystem.
const NOT_IN_APP_REPO = [
  /^src\//,            // builder-cap2UI5's source tree
  /^run\//,            // builder run trees
  /^adapters\//,       // builder-abap2UI5-js adapters
  /^scripts\//,        // builder scripts
  /^dist\//,           // web build output
  /^gen\//,            // cds build output
  /^docs\//,           // this repo
  /^node_modules\//,
  /^\.github\//,
];

for (const file of markdownFiles(DOCS)) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");

  // Fenced code blocks show paths a reader will create, so the path check
  // stays out of them — but the imports and the `?app_start=` URLs in an
  // example are claims about the package like any other, and are checked.
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    const n = i + 1;

    if (inFence) {
      for (const m of line.matchAll(REQUIRE_RE)) {
        const sub = m[1] || ``;
        const spec = `abap2UI5${sub ? `/${sub}` : ``}`;
        if (/[*…]/.test(sub)) continue;            // a shape, not an import
        if (IGNORE.has(spec.toLowerCase())) continue;
        if (!EXPORTS) continue;                    // no core package to check against
        const target = resolveExport(sub);
        if (!target) {
          add(file, n, `require("${spec}") has no match in the core exports map`);
        } else if (!files.has(target)) {
          add(file, n, `require("${spec}") resolves to ${target}, which does not exist`);
        }
      }
      for (const m of line.matchAll(APP_START_RE)) {
        const cls = m[1].toLowerCase();
        if (classes.has(cls) || IGNORE.has(cls)) continue;
        add(file, n, `?app_start names a class that does not exist: ${m[1]}`);
      }
      return;
    }

    for (const m of line.matchAll(PATH_RE)) {
      const p = m[1].replace(/^\.\//, "").replace(/\/$/, "");
      if (!PATH_ROOTS.some((r) => (p + "/").startsWith(r))) continue;
      if (NOT_IN_APP_REPO.some((re) => re.test(p))) continue;
      if (IGNORE.has(p.toLowerCase())) continue;
      if (p.includes("*")) continue;             // globs describe a shape
      if (files.has(p)) continue;
      add(file, n, `path does not exist in cap2UI5: ${p}`);
    }

    for (const m of line.matchAll(APP_START_RE)) {
      const cls = m[1].toLowerCase();
      if (classes.has(cls) || IGNORE.has(cls)) continue;
      add(file, n, `?app_start names a class that does not exist: ${m[1]}`);
    }

    for (const m of line.matchAll(CLASS_RE)) {
      const cls = m[1].toLowerCase();
      if (line[m.index + m[0].length] === "*") continue;   // glob: a family, not a class
      if (classes.has(cls) || IGNORE.has(cls)) continue;
      // Interfaces are not always separate files, and abstract/ABAP-only
      // names appear when contrasting with abap2UI5 — only flag cl_ classes,
      // which are concrete and must exist.
      if (!cls.startsWith("z2ui5_cl_")) continue;
      add(file, n, `class does not exist in cap2UI5: ${m[1]}`);
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
  console.error(`verify-refs: ${problems.length} stale reference(s) against ${APP}\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(`\nThe docs describe the cap2UI5 repo — update the prose, or the path/class moved.`);
  process.exit(1);
}

console.log(`verify-refs: OK — every documented path and class resolves in ${APP}`);
