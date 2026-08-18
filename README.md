# cap2UI5 — Documentation

VitePress documentation for [**cap2UI5**](https://github.com/cap2UI5/cap2UI5) — the CAP / Node.js port of the [abap2UI5](https://github.com/abap2UI5/abap2UI5) concept. Published at **[cap2ui5.github.io/docs](https://cap2ui5.github.io/docs/)**.

A zero-install playground of the framework runs at [cap2ui5.github.io/web-cap2UI5-build](https://cap2ui5.github.io/web-cap2UI5-build/) (built by [builder-cap2UI5-web](https://github.com/cap2UI5/builder-cap2UI5-web) into [web-cap2UI5-build](https://github.com/cap2UI5/web-cap2UI5-build)).

## Develop locally

```bash
npm ci
npm run docs:dev
```

Opens the docs at http://localhost:5173.

## Build

```bash
npm run docs:build       # → docs/.vitepress/dist
npm run docs:preview     # → preview server
```

## Check before you commit

```bash
CAP2UI5_DIR=/path/to/cap2UI5 npm run check
```

`npm run check` is `verify-refs` followed by the VitePress build, and it is exactly what CI runs — on every pull request (`.github/workflows/check.yml`) and again on deploy. It is the only gate this repository has on whether the prose is still true about the code:

- every path, class and `?app_start=` named in the docs must exist in a real [cap2UI5](https://github.com/cap2UI5/cap2UI5) checkout,
- every `require("abap2UI5/…")` in a code example must resolve through the exports map of `core/package.json`,
- every internal anchor must exist.

`verify-refs` needs that checkout — pass `CAP2UI5_DIR`, or clone cap2UI5 next to this repository. **Without one it skips itself and exits 0**, so a green run with no checkout proves only that the site builds. Deliberate exceptions live in `docs/.verify-refs-ignore`, each with a reason.

## Structure

The folder scheme, the ground truth about the cap2UI5 repo layout and the rules for linking into it are in **[AGENTS.md](AGENTS.md)** — read it before making any change.

## License

MIT — see [LICENSE](./LICENSE).
