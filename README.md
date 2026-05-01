# cap2UI5 — Documentation

VitePress-Dokumentation für [**cap2UI5**](https://github.com/cap2UI5/dev) — der CAP-/Node.js-Portierung des [abap2UI5](https://github.com/abap2UI5/abap2UI5)-Konzepts.

## Lokal entwickeln

```bash
npm install
npm run docs:dev
```

Öffnet die Doku unter http://localhost:5173.

## Build

```bash
npm run docs:build       # → .vitepress/dist
npm run docs:preview     # → preview server
```

## Struktur

```
.
├── .vitepress/config.mjs    # VitePress-Konfiguration
├── index.md                 # Landing Page
├── guide/                   # Konzepte, Quickstart, Lifecycle, Bindings, …
├── examples/                # End-to-End-Beispiel-Apps
├── api/                     # API-Referenz (client, View Builder, App Interface)
├── reference/               # Architektur, Protokoll, DB, Deployment
└── public/                  # statische Assets
```

## License

MIT — siehe [LICENSE](./LICENSE).
