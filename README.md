# cap2UI5 — Documentation

VitePress documentation for [**cap2UI5**](https://github.com/cap2UI5/cap2UI5) — the CAP / Node.js port of the [abap2UI5](https://github.com/abap2UI5/abap2UI5) concept. A zero-install playground of the framework runs at [cap2ui5.github.io/web-cap2UI5-build](https://cap2ui5.github.io/web-cap2UI5-build/) (built by [builder-cap2UI5-web](https://github.com/cap2UI5/builder-cap2UI5-web) into [web-cap2UI5-build](https://github.com/cap2UI5/web-cap2UI5-build)).

## Develop locally

```bash
npm install
npm run docs:dev
```

Opens the docs at http://localhost:5173.

## Build

```bash
npm run docs:build       # → docs/.vitepress/dist
npm run docs:preview     # → preview server
```

## Structure

```
.
├── docs/
│   ├── .vitepress/
│   │   ├── config.mjs       # VitePress configuration
│   │   └── theme/           # Custom theme (red brand color)
│   ├── index.md             # Landing page
│   ├── guide/               # Concepts, quickstart, lifecycle, bindings, …
│   ├── examples/            # End-to-end example apps
│   ├── api/                 # API reference (client, View Builder, App Interface)
│   └── reference/           # Architecture, protocol, DB, deployment
├── package.json
└── README.md
```

## License

MIT — see [LICENSE](./LICENSE).
