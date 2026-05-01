# Deployment

cap2UI5-Apps deployen wie jedes andere CAP-Projekt — mit ein paar Kleinigkeiten beim Frontend-Bundle. Diese Seite zeigt den Standard-Cloud-Foundry-Pfad.

## Lokal

```bash
npx cds w
# oder
npm start
```

Default ist SQLite-In-Memory. Das passt für Dev, alle App-Instanzen verschwinden beim Restart.

Wenn du **persistent lokal** willst:

```json
"cds": {
  "requires": {
    "db": { "kind": "sqlite", "credentials": { "url": "db.sqlite" } }
  }
}
```

`cds deploy` einmal ausführen, fertig.

## Cloud Foundry (BTP)

Das Referenz-Projekt enthält eine `mta.yaml` mit allen Standard-Modulen:

```yaml
modules:
- name: abap2UI5-srv               # CAP-Service
- name: abap2UI5                   # HTML5-Module mit dem Frontend
- name: abap2UI5-app-deployer      # HTML5-Repo-Push
- name: abap2UI5-destinations      # FLP-Destinations

resources:
- name: abap2UI5-destination       # Destination-Service
- name: abap2UI5-html5-repo-host   # HTML5-Repo
- name: abap2UI5-auth              # XSUAA
```

Build & Deploy:

```bash
npm run build       # → mbt build, erzeugt mta_archives/archive.mtar
npm run deploy      # → cf deploy mta_archives/archive.mtar
```

Voraussetzungen:

- **Multi-Target-Build-Tool**: `npm i -g mbt`
- **CF-CLI** mit MTA-Plugin: `cf install-plugin multiapps`
- BTP-Subaccount mit Berechtigungen für Destination + HTML5-Apps + XSUAA

Nach dem Deploy ist die App über die FLP-URL aufrufbar (Standard-Pattern: `https://<subdomain>.launchpad.cfapps.<region>.hana.ondemand.com`).

## Kyma / Kubernetes

CAP unterstützt seit `@sap/cds ^7` direktes Kyma-Deployment. Setup ist:

1. CAP-typischer Container-Build (Multi-Stage Dockerfile)
2. HANA-Cloud-Connection via `cds.requires.db.kind = "hana"`
3. XSUAA-Service-Binding über das Kyma-Operator-Pattern

Die `app/z2ui5/`-Frontend-Files können entweder:

- **Als Static-Assets** im selben Container ausgeliefert werden (Express-Static)
- **Über einen separaten Nginx-Pod** gehostet werden, mit Reverse-Proxy auf den CAP-Service

Im einfachsten Fall: `srv/server.js` lässt CAP automatisch `app/`-Verzeichnis statisch servieren. Der `GET /rest/root/z2ui5` liefert das Bootstrap-HTML, das auf relative Pfade zu UI5 verweist (CDN oder lokales Bundle).

## Self-Hosted Express

Wenn du komplett ohne BTP-Plumbing leben willst:

```bash
node srv/server.js
```

Damit läuft CAP als ganz normaler Node.js-Server auf Port 4004. Hinter einem Nginx oder direkt — beides geht.

Dann brauchst du:

- DB selbst hosten (Postgres / SQLite-File / HANA-Express)
- Auth selbst implementieren (`cds.requires.auth.kind = "mocked"` für lokal, anders für Prod)
- Frontend-Assets ausliefern (Express-Static auf `app/`)

## Frontend-Update

Das `app/z2ui5/`-Verzeichnis wird **nicht von Hand gepflegt**. Im Repo gibt es einen `mirror_frontend`-Workflow:

```bash
# in cap2UI5/
npm run mirror_frontend
```

Das Script:

1. clont `https://github.com/abap2UI5/abap2UI5`
2. löscht `app/z2ui5/webapp`
3. kopiert `abap2UI5/app/webapp` als neuer Stand
4. überschreibt `index.html` und `manifest.json` mit den cap2UI5-Versionen aus `app/backup/`
5. verwirft den geclonten Ordner

Im CI lebt das als GitHub-Action (`.github/workflows/mirror_frontend.yml`). Du kannst es manuell triggern, wenn ein Frontend-Patch angesteuert werden soll.

## Sticky-Session-Empfehlung

Wenn deine Apps File-Uploads, Wizards mit knappen Roundtrips oder ähnliches haben, will der Frontend-Treiber Roundtrips sequentialisieren. Auf Cloud Foundry geht das per:

```yaml
# mta.yaml — abap2UI5-srv
parameters:
  routes:
    - route: my-app.cfapps.eu10.hana.ondemand.com
      route_service_url: https://stickysession.cfapps.eu10.hana.ondemand.com
```

Oder per Cloud-Foundry-Sticky-Cookie: das Default-Login-Setup von XSUAA setzt eh `JSESSIONID`, was für Sticky-Routing reicht.

## Auth & XSUAA

Im Referenz-Projekt:

```json
{
  "cds": {
    "requires": { /* ... */ },
    "[production]": {
      "auth": false   // ← absichtlich aus, da der z2ui5-Endpoint öffentlich sein darf
    }
  }
}
```

::: warning Auth-Defaults prüfen
Das `auth: false` in Production ist ein **Standard-Setting für Demo-Zwecke**. Für echte Apps:

```json
"[production]": { "auth": "xsuaa" }
```

Damit landest du im UAA-Login-Flow, bevor `/rest/root/z2ui5` erreichbar wird. Im `z2ui5_cl_http_handler` kannst du dann `cds.context.user.id` lesen, um Multi-User-Trennung zu machen.
:::

## CI/CD

Für GitHub-Actions ein Beispiel-Workflow:

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

Die Secrets (CF_USER, CF_PASSWORD, …) kommen aus den GitHub-Repo-Settings.

→ Du hast jetzt das ganze Reference-Set durch. Zurück zu den [**Beispielen**](../examples/hello-world) oder zur [**API-Referenz**](../api/client).
