# Deployment

cap2UI5 apps deploy like any other CAP project — with a few caveats around the frontend bundle. This page shows the standard Cloud Foundry path.

## Locally

```bash
npx cds w
# or
npm start
```

The default is in-memory SQLite. That fits dev — all app instances vanish on restart.

If you want **persistent local**:

```json
"cds": {
  "requires": {
    "db": { "kind": "sqlite", "credentials": { "url": "db.sqlite" } }
  }
}
```

Run `cds deploy` once, done.

## Cloud Foundry (BTP)

The reference project contains an `mta.yaml` with all standard modules:

```yaml
modules:
- name: abap2UI5-srv               # CAP service
- name: abap2UI5                   # HTML5 module with the frontend
- name: abap2UI5-app-deployer      # HTML5 repo push
- name: abap2UI5-destinations      # FLP destinations

resources:
- name: abap2UI5-destination       # destination service
- name: abap2UI5-html5-repo-host   # HTML5 repo
- name: abap2UI5-auth              # XSUAA
```

Build & deploy:

```bash
npm run build       # → mbt build, produces mta_archives/archive.mtar
npm run deploy      # → cf deploy mta_archives/archive.mtar
```

Prerequisites:

- **Multi-Target Build Tool**: `npm i -g mbt`
- **CF CLI** with MTA plugin: `cf install-plugin multiapps`
- BTP subaccount with permissions for destination + HTML5 apps + XSUAA

After deploy, the app is reachable via the FLP URL (standard pattern: `https://<subdomain>.launchpad.cfapps.<region>.hana.ondemand.com`).

## Kyma / Kubernetes

CAP supports direct Kyma deployment since `@sap/cds ^7`. Setup:

1. CAP-typical container build (multi-stage Dockerfile)
2. HANA Cloud connection via `cds.requires.db.kind = "hana"`
3. XSUAA service binding via the Kyma operator pattern

The `app/z2ui5/` frontend files can either:

- **Be served as static assets** in the same container (Express static)
- **Be hosted by a separate Nginx pod** with a reverse proxy to the CAP service

In the simplest case: `srv/server.js` lets CAP serve the `app/` directory statically. The `GET /rest/root/z2ui5` returns the bootstrap HTML, which references relative UI5 paths (CDN or local bundle).

## Self-hosted Express

If you want to live without BTP plumbing entirely:

```bash
node srv/server.js
```

This runs CAP as a normal Node.js server on port 4004. Behind an Nginx or directly — either works.

You then need:

- Host the DB yourself (Postgres / SQLite file / HANA Express)
- Implement auth yourself (`cds.requires.auth.kind = "mocked"` for local, something else for prod)
- Serve frontend assets (Express static on `app/`)

## Frontend update

The `app/z2ui5/` directory is **not maintained by hand**. The repo has a `mirror_frontend` workflow:

```bash
# in cap2UI5/
npm run mirror_frontend
```

The script:

1. Clones `https://github.com/abap2UI5/abap2UI5`
2. Deletes `app/z2ui5/webapp`
3. Copies `abap2UI5/app/webapp` as the new state
4. Overwrites `index.html` and `manifest.json` with the cap2UI5 versions from `app/backup/`
5. Discards the cloned folder

In CI it runs as a GitHub Action (`.github/workflows/mirror_frontend.yml`). You can trigger it manually when a frontend patch needs to be pulled in.

## Sticky session recommendation

If your apps have file uploads, wizards with tight roundtrips, or similar, the frontend driver wants to serialize roundtrips. On Cloud Foundry that goes via:

```yaml
# mta.yaml — abap2UI5-srv
parameters:
  routes:
    - route: my-app.cfapps.eu10.hana.ondemand.com
      route_service_url: https://stickysession.cfapps.eu10.hana.ondemand.com
```

Or via a Cloud Foundry sticky cookie: the default XSUAA login setup already sets `JSESSIONID`, which is enough for sticky routing.

## Auth & XSUAA

In the reference project:

```json
{
  "cds": {
    "requires": { /* ... */ },
    "[production]": {
      "auth": false   // ← deliberately off, since the z2ui5 endpoint may be public
    }
  }
}
```

::: warning Check auth defaults
The `auth: false` in production is a **default setting for demo purposes**. For real apps:

```json
"[production]": { "auth": "xsuaa" }
```

This puts you in the UAA login flow before `/rest/root/z2ui5` becomes reachable. In `z2ui5_cl_http_handler` you can then read `cds.context.user.id` to do multi-user separation.
:::

## CI/CD

For GitHub Actions a sample workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on: { push: { branches: [main] } }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build
      - run: cf api $CF_API && cf auth $CF_USER $CF_PASSWORD
      - run: cf target -o $CF_ORG -s $CF_SPACE
      - run: npm run deploy
```

The secrets (CF_USER, CF_PASSWORD, …) come from the GitHub repo settings.

→ You're now through the entire reference set. Back to the [**examples**](../examples/hello-world) or to the [**API reference**](../api/client).
