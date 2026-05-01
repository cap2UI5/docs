# cap2UI5 — Documentation

VitePress documentation for [**cap2UI5**](https://github.com/cap2UI5/dev) — the CAP / Node.js port of the [abap2UI5](https://github.com/abap2UI5/abap2UI5) concept.

## Develop locally

```bash
npm install
npm run docs:dev
```

Opens the docs at http://localhost:5173.

## Build

```bash
npm run docs:build       # → .vitepress/dist
npm run docs:preview     # → preview server
```

## Structure

```
.
├── .vitepress/config.mjs    # VitePress configuration
├── index.md                 # Landing page
├── guide/                   # Concepts, quickstart, lifecycle, bindings, …
├── examples/                # End-to-end example apps
├── api/                     # API reference (client, View Builder, App Interface)
├── reference/               # Architecture, protocol, DB, deployment
└── public/                  # Static assets
```

## License

MIT — see [LICENSE](./LICENSE).
