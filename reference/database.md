# Datenbankmodell

cap2UI5 nutzt **eine einzige CDS-Entity** für die App-Persistenz: `z2ui5_t_01`. Diese Seite beschreibt sie und gibt Hinweise zu Cleanup, Skalierung und Backend-Auswahl.

## Entity-Definition

`db/schema.cds`:

```cds
namespace my.domain;

entity z2ui5_t_01 {
  key id      : UUID;
  id_prev     : UUID;          // ← Vorgänger-ID (App-History)
  data        : LargeString;   // ← serialisierte App-Instanz (JSON)
}
```

Drei Felder, mehr nicht. Jeder Roundtrip macht ein `INSERT.into(z2ui5_t_01)` mit:

- `id` — neu generiert (UUID v4)
- `id_prev` — die ID, die der Frontend-Treiber als `S_FRONT.ID` mitgesendet hat
- `data` — `JSON.stringify(oApp)` mit zusätzlich `__className` + `__filePath`

## Daten-Format in `data`

```json
{
  "__className": "my_app",
  "__filePath":  "../../samples/my_app.js",
  "id_draft":    "",
  "id_app":      "",
  "check_initialized": true,
  "check_sticky":      false,
  "username":          "Alice",
  "preferences":       { "language": "de" },
  "__navStackIds":     ["xyz-789", "abc-123"]
}
```

`__className` und `__filePath` werden für den Reload genutzt. `__navStackIds` enthält die IDs der gestapelten Apps (siehe [Persistenz](../guide/persistence)).

Die Engine ist **cycle-safe** — eingebauter `WeakSet`-Tracker verhindert dass akzidentelle zirkuläre Referenzen den Stringify zerlegen.

## Datenbankbackends

CAP unterstützt mehrere Persistenz-Backends. Alle funktionieren mit cap2UI5:

| Backend | Treiber | Wann |
|---|---|---|
| SQLite (in-memory) | `@cap-js/sqlite` | Dev-Default (`npx cds w`) |
| SQLite (file) | `@cap-js/sqlite` | lokales Testen mit Persistenz |
| HANA / HANA Cloud | `@cap-js/hana` | Production auf BTP |
| PostgreSQL | `@cap-js/postgres` | Self-Hosted Cloud-Foundry / Kubernetes |

In `package.json`:

```json
{
  "cds": {
    "requires": {
      "db": { "kind": "sqlite", "credentials": { "url": ":memory:" } }
    }
  }
}
```

Wechsel auf HANA in Production geht über `@sap/cds`-`profile`-Mechanismus, ohne Code-Änderung.

## Indizes & Performance

Die Default-Schema-Generierung hat **nur den Primary-Key** auf `id`. Für Production-Loads empfehle ich:

- **Index auf `id_prev`**, falls du je traversieren willst (Undo, Audit). Sonst nicht nötig.
- Bei vielen parallelen Usern: das `INSERT` wird oft genug aufgerufen, dass HANA bei eingeschalteten Indizes drauf spürbar wird — halt deine Indizes minimal.

CAP-Aspekt für CreatedAt-Tracking:

```cds
entity z2ui5_t_01 : managed {  // ← fügt createdAt/createdBy/modifiedAt/modifiedBy hinzu
  key id      : UUID;
  id_prev     : UUID;
  data        : LargeString;
}
```

`managed`-Aspekt erfordert kein Code-Patch in cap2UI5 — die Engine ignoriert die zusätzlichen Felder beim Deserialize, da sie nur `data` ausliest.

## Cleanup-Strategie

::: warning Tabelle wächst linear
**Jeder Roundtrip = eine neue Row.** Eine 50-Klick-Session = 50 Rows. 1.000 Users mit je 50 Klicks = 50.000 Rows pro Tag.
:::

### Option 1: Periodischer Job

```js
// srv/cleanup.js
const cds = require("@sap/cds");

cds.on("served", () => {
  const intervalMs = 60 * 60 * 1000;        // jede Stunde
  const ttlMs      = 24 * 60 * 60 * 1000;   // 24h Retention

  setInterval(async () => {
    const { z2ui5_t_01 } = cds.entities("my.domain");
    const cutoff = new Date(Date.now() - ttlMs).toISOString();
    await DELETE.from(z2ui5_t_01).where`createdAt < ${cutoff}`;
  }, intervalMs);
});
```

(Setzt voraus, dass du `z2ui5_t_01 : managed` aktiviert hast.)

### Option 2: DB-Side Job

In Production stark empfohlen: ein nightly cron auf der DB löscht ältere Rows.

```sql
-- HANA Procedure (vereinfacht)
DELETE FROM "MY_DOMAIN_Z2UI5_T_01"
WHERE "CREATEDAT" < ADD_DAYS(CURRENT_TIMESTAMP, -1);
```

### Option 3: Begrenzung pro User

Wenn du eine User-ID kennst (per `cds.context.user.id`), kannst du im Handler einen User-Spezifischen LIMIT erzwingen — älteste Rows pro User löschen.

Das erfordert ein Schema-Erweitern um `user_id` und einen Patch in `z2ui5_cl_core_srv_draft.saveApp` — aktuell nicht eingebaut.

## Wichtige Caveats

- **Rows sind unveränderlich.** Niemals `UPDATE` auf eine bestehende Row — die Engine geht davon aus, dass jede ID **eine spezifische App-Instanz** identifiziert.
- **`id_prev` ist NICHT eindeutig.** Wenn ein User per Browser-Back zwei verschiedene "next steps" probiert, gibt es zwei Rows mit demselben `id_prev`. Das ist gewollt — es ist eine Forking-History.
- **Keine Foreign-Key-Constraint.** `id_prev` zeigt auf `id`, aber CAP wird das nicht erzwingen, wenn du das Schema unverändert lässt. Cleanup-Jobs können beliebige Sub-Trees orphanen.

## Skalieren auf Multi-Tenant

cap2UI5 ist out-of-box **multi-tenant fähig**, weil CAP es ist. Mit `@sap/cds-mtxs` läuft jede Mandanten-DB separat — kein Code-Patch nötig.

Pro Mandant siehst du dann eine eigene `z2ui5_t_01`-Tabelle. Cleanup-Strategien laufen pro Mandant.

→ Weiter mit dem [Deployment](./deployment).
