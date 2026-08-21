# Try It in the Browser

You can explore cap2UI5 **without installing anything** — no Node.js, no CAP server, no clone. The complete stack (frontend *and* backend, including all sample apps) runs as a static site on GitHub Pages:

<div style="font-size: 1.15em; margin: 1em 0;">

**→ [https://cap2ui5.github.io/web-cap2UI5-build/](https://cap2ui5.github.io/web-cap2UI5-build/)**

</div>

Start a specific app with the same `app_start` parameter you'd use against a real CAP server:

```
https://cap2ui5.github.io/web-cap2UI5-build/?app_start=z2ui5_cl_ui5_app_hi_world
https://cap2ui5.github.io/web-cap2UI5-build/?app_start=z2ui5_cl_smp_app_000
```

The `z2ui5_cl_smp_app_*` samples are the transpiled abap2UI5 demo collection — a browsable cookbook of tables, forms, popups, charts, and more. The [**Sample Catalogue**](./samples) lists every one of them with a link straight into the playground.

## Wait — didn't you say the backend renders the view?

Yes, and that's exactly what makes this playground fun: cap2UI5's backend is **plain JavaScript with no hard CAP dependency in the hot path**. So the [builder-cap2UI5-web](https://github.com/cap2UI5/builder-cap2UI5-web) build bundles the entire backend — framework core plus all sample apps — into a single ~520 KB JS file (~115 KB gzipped, which is what a visitor actually downloads) and loads it **into the browser tab**:

```
Browser tab
├── index.html + webapp     the unchanged UI5 frontend (UI5 from CDN)
│      │
│      │  still calls fetch("/rest/root/z2ui5", { method: "POST", … })
│      ▼
└── z2ui5-web.js            the bundled "server"
    ├── fetch interceptor   answers /rest/root/z2ui5 in-process,
    │                       passes everything else to the network
    ├── framework core      the same core/srv/z2ui5 code that runs on CAP
    ├── all sample apps     registered at build time
    └── in-memory drafts    a Map instead of the database
```

The frontend doesn't know the difference — it POSTs to the same endpoint and gets the same responses. Every roundtrip that would normally hit your CAP server is answered inside the tab.

For comparison: abap2UI5 has the same kind of twin ([abap2UI5-web](https://github.com/abap2UI5/abap2UI5-web)), but it has to ship an ABAP runtime and a WASM database to the browser (~12 MB). Because cap2UI5's backend is already JavaScript, the whole site here — bundle, webapp, everything — is about 1.1 MB, roughly a tenth of that; the backend bundle alone is a twentieth.

## What it's good for

- **Kicking the tires** before you install anything.
- **Browsing the sample apps** as a live catalog next to their source in [`core/srv/app/samples/`](https://github.com/cap2UI5/cap2UI5/tree/main/core/srv/app/samples) — the [Sample Catalogue](./samples) is the index.
- **Sharing a demo link** with colleagues.

## What it's *not* {#what-its-not}

- **Not a production topology.** cap2UI5's security model — UI logic and state stay on the server — obviously doesn't apply when the "server" is shipped to the client. It's a demo artifact.
- **Sessions live in the tab.** Reload = fresh state. On a real CAP server, drafts persist in the database.
- **Server-only features are off.** Samples that call external OData services (e.g. Northwind) or need real CAP services/destinations won't work here.
- **Internet still required** — UI5 itself loads from the SAP CDN.

The site is rebuilt automatically from the latest cap2UI5 sources by the [builder-cap2UI5-web](https://github.com/cap2UI5/builder-cap2UI5-web) repository and published to [web-cap2UI5-build](https://github.com/cap2UI5/web-cap2UI5-build). The rebuild is **event-driven**: every push to builder-cap2UI5-web's `main` runs it, and cap2UI5's sync pipeline pushes a trigger commit there after each framework change — so the playground follows the framework rather than a calendar. A weekly cron remains as a safety net, and a manual run is always possible.

Every deployment is one commit in [web-cap2UI5-build](https://github.com/cap2UI5/web-cap2UI5-build), and its `BUILD_INFO.json` names the exact cap2UI5 commit the site was built from — so you can always tell what you are looking at.

→ Ready for the real thing? Head to the [**Quickstart**](./getting-started) — you'll have the same apps running on a local CAP server in five minutes.
