# Persistenz & Sessions

cap2UI5-Apps sind **stateful**: ihre Felder überleben einen Roundtrip, einen Browser-Refresh, manchmal sogar einen Server-Restart. Diese Seite erklärt, wie die Persistenz funktioniert und wo die Grenzen liegen.

## Die Persistenz-Tabelle

In `db/schema.cds`:

```cds
namespace my.domain;

entity z2ui5_t_01 {
  key id      : UUID;
  id_prev     : UUID;          // ← Vorgänger-ID, baut die History
  data        : LargeString;   // ← serialisierte App-Instanz
}
```

Bei jedem Roundtrip:

1. Die App-Instanz wird **serialisiert** (`z2ui5_cl_core_srv_draft.serialize`).
2. Eine neue UUID wird generiert.
3. Es wird ein `INSERT` in `z2ui5_t_01` gemacht — `id_prev` zeigt auf die vorherige Instanz.
4. Die neue UUID geht in die Response zurück (`S_FRONT.ID`).
5. Frontend sendet diese ID im nächsten Roundtrip mit.
6. Server lädt die Instanz wieder und appliziert das XX-Delta vor `main()`.

Das ist eine **append-only History**. Wenn du willst, kannst du via `id_prev` durch die Vergangenheit traversieren — z.B. um einen "Undo"-Mechanismus zu bauen.

## Was wird serialisiert?

Die Engine geht über `Object.getOwnPropertyNames(oApp)` und nimmt alles auf, was:

- **Keine Funktion** ist
- **Nicht in der `SKIP_PROPS`-Set** ist (`["client"]`)
- JSON-serialisierbar ist

Heißt: deine **Datenfelder** überleben, **gebundene Methoden** und **Closures** nicht.

```js
class my_app extends z2ui5_if_app {

  username    = "Alice";        // ✓ persistiert
  preferences = { lang: "de" }; // ✓ persistiert
  computed    = null;           // ✓ persistiert (auch bei null)

  client      = null;           // ← übersprungen (in SKIP_PROPS)

  helper      = () => { … };    // ✗ Function — nicht persistiert
  __cache     = new Map();      // ✗ Map ist nicht JSON-roundtrippable
  conn        = await cds.connect.to(...); // ✗ Connection-Objekt
}
```

::: tip Faustregel
Behalte App-Felder **JSON-pure**: Strings, Zahlen, Booleans, Arrays, Plain-Objects. Wenn du Maps, Sets, Connections oder Streams brauchst, lege sie als _lokale Variablen in `main()`_ an — sie leben dann genau einen Roundtrip lang.
:::

## Klassen-Restaurierung

Die Serialisierung schreibt zwei Meta-Felder in den Output:

```json
{
  "__className": "my_app",
  "__filePath": "../../samples/my_app.js",
  "username": "Alice",
  /* ... */
}
```

Beim Deserialize wird `__filePath` aufgelöst und `require()`d, dann eine neue Instanz erstellt und mit `Object.assign` befüllt.

`__filePath` wird via `_findAppFile(className)` ermittelt. Aktuell durchsucht es:

1. `srv/z2ui5/02/<className>.js`
2. `srv/z2ui5/02/01/<className>.js`
3. `srv/samples/<className>.js`

::: warning Pflege deine Apps in den drei Pfaden
Wenn du Apps **woanders** ablegen willst, musst du `_findAppFile` in `z2ui5_cl_core_srv_draft.js` erweitern, sonst schlägt der Reload fehl. Praktisch ist meist `srv/samples/` der einfachste Pfad.
:::

## Database-Backend

CAP-typisch wird das durch deinen `cds.requires.db`-Treiber abgedeckt:

- **`@cap-js/sqlite`** in Dev (`npx cds w` startet automatisch ein In-Memory SQLite)
- **HANA / HANA Cloud** in Prod
- **PostgreSQL** via `@cap-js/postgres`

Die Engine nutzt nur `INSERT.into(...)` und `SELECT.one.from(...)` — alle CDS-Service-Backends funktionieren.

## Aufräumen

Da jeder Roundtrip einen neuen Eintrag in `z2ui5_t_01` schreibt, **wächst die Tabelle linear**. In Produktion brauchst du eine Cleanup-Strategie. Zwei Wege:

**1. CAP-Periodic-Job** (einfach):

```js
// srv/cleanup.js
const cds = require("@sap/cds");

cds.on("served", () => {
  setInterval(async () => {
    const { z2ui5_t_01 } = cds.entities("my.domain");
    const cutoff = new Date(Date.now() - 24*60*60*1000).toISOString();
    await DELETE.from(z2ui5_t_01).where(`createdAt < '${cutoff}'`);
  }, 60*60*1000);
});
```

(Setzt voraus, dass du `@cds.persistence.journal` oder `cuid`-Aspect mit `createdAt` aktiviert hast, oder du loggst die Zeit selbst in `data`.)

**2. DB-Side-Job** mit deinem DB-Operator-Tooling, z.B. ein nightly cron auf HANA, der ältere Rows löscht.

Es gibt **derzeit kein eingebautes Cleanup** — das ist Absicht, weil die richtige Strategie projektabhängig ist.

## Sticky Sessions

Manche Apps müssen sicherstellen, dass Roundtrips **strikt seriell** ankommen — z.B. ein Wizard, in dem Schritt 2 nie vor Schritt 1 zu Ende sein darf:

```js
this.check_sticky = true;
client.set_session_stateful(true);
```

Das setzt im Frontend einen Flag, der beim nächsten Klick wartet, bis der vorherige Roundtrip durch ist — verhindert Race-Conditions bei schnellen Klickern.

## Was passiert beim Server-Restart?

- **Apps in der DB überleben** (sind ja persistiert).
- **In-flight-Promises gehen verloren** (logisch).
- Das Frontend bemerkt das nicht — es schickt seine ID wie gehabt, und der Server lädt die App aus der DB neu.

Heißt: cap2UI5-Apps sind **inhärent zustandslos auf Server-Ebene** (im Sinne von "kein In-Memory-State pro User"). Du kannst sie horizontal skalieren, sofern alle Instanzen am selben DB-Backend hängen.

## Performance-Tipps

- **Halte App-Instanzen klein**: persistier nur, was du wirklich für nachfolgende Roundtrips brauchst. Lade Datenbank-Resultate immer wieder frisch in `check_on_init()`, statt sie in der App zu cachen.
- **Vermeide riesige Arrays als Felder**: 10.000 Zeilen `this.users` heißen 10.000 Zeilen pro Roundtrip in der DB — das addiert sich.
- **Nutze Backed-Queries für Tabellen**: bind die `items` an einen OData-Service via `set_odata_model`, nicht an ein App-Array.

→ Weiter mit [**Popups & Toasts**](./popups).
