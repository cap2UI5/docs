# Persistence & Sessions

cap2UI5 apps are **stateful**: their fields survive a roundtrip, a browser refresh, sometimes even a server restart. This page explains how persistence works and where its limits are.

## The persistence table

In `db/schema.cds`:

```cds
namespace my.domain;

entity z2ui5_t_01 {
  key id      : UUID;
  id_prev     : UUID;          // ← predecessor ID, builds the history
  data        : LargeString;   // ← serialized app instance
}
```

On every roundtrip:

1. The app instance is **serialized** (`z2ui5_cl_core_srv_draft.serialize`).
2. A new UUID is generated.
3. An `INSERT` is made into `z2ui5_t_01` — `id_prev` points to the previous instance.
4. The new UUID goes back in the response (`S_FRONT.ID`).
5. The frontend sends this ID along on the next roundtrip.
6. The server loads the instance again and applies the XX delta before `main()`.

This is an **append-only history**. If you want, you can traverse the past via `id_prev` — for example, to build an "undo" mechanism.

## What gets serialized?

The engine walks `Object.getOwnPropertyNames(oApp)` and includes anything that:

- Is **not a function**
- Is **not in the `SKIP_PROPS` set** (`["client"]`)
- Is JSON-serializable

That means: your **data fields** survive, **bound methods** and **closures** do not.

```js
class my_app extends z2ui5_if_app {

  username    = "Alice";        // ✓ persisted
  preferences = { lang: "de" }; // ✓ persisted
  computed    = null;           // ✓ persisted (even when null)

  client      = null;           // ← skipped (in SKIP_PROPS)

  helper      = () => { … };    // ✗ function — not persisted
  __cache     = new Map();      // ✗ Map is not JSON round-trippable
  conn        = await cds.connect.to(...); // ✗ connection object
}
```

::: tip Rule of thumb
Keep app fields **JSON pure**: strings, numbers, booleans, arrays, plain objects. If you need maps, sets, connections, or streams, declare them as _local variables in `main()`_ — they then live for exactly one roundtrip.
:::

## Class restoration

Serialization writes two meta fields into the output:

```json
{
  "__className": "my_app",
  "__filePath": "../../samples/my_app.js",
  "username": "Alice",
  /* ... */
}
```

On deserialization, `__filePath` is resolved and `require()`d, then a new instance is created and populated with `Object.assign`.

`__filePath` is determined via `_findAppFile(className)`. It currently searches:

1. `srv/z2ui5/02/<className>.js`
2. `srv/z2ui5/02/01/<className>.js`
3. `srv/samples/<className>.js`

::: warning Keep your apps in the three paths
If you want to put apps **somewhere else**, you'll need to extend `_findAppFile` in `z2ui5_cl_core_srv_draft.js`, otherwise the reload fails. In practice, `srv/samples/` is usually the simplest path.
:::

## Database backend

CAP-typically this is covered by your `cds.requires.db` driver:

- **`@cap-js/sqlite`** in dev (`npx cds w` automatically starts an in-memory SQLite)
- **HANA / HANA Cloud** in prod
- **PostgreSQL** via `@cap-js/postgres`

The engine uses only `INSERT.into(...)` and `SELECT.one.from(...)` — all CDS service backends work.

## Cleanup

Since every roundtrip writes a new entry into `z2ui5_t_01`, **the table grows linearly**. In production you need a cleanup strategy. Two ways:

**1. CAP periodic job** (simple):

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

(Assumes you have enabled `@cds.persistence.journal` or the `cuid` aspect with `createdAt`, or are logging the time yourself in `data`.)

**2. DB-side job** with your DB operator tooling, e.g. a nightly cron on HANA that deletes older rows.

There is **currently no built-in cleanup** — that is intentional, because the right strategy is project-specific.

## Sticky sessions

Some apps need to ensure that roundtrips arrive **strictly serially** — e.g. a wizard where step 2 must never finish before step 1:

```js
this.check_sticky = true;
client.set_session_stateful(true);
```

This sets a flag on the frontend that waits on the next click until the previous roundtrip is done — preventing race conditions for fast clickers.

## What happens on server restart?

- **Apps in the DB survive** (they're persisted).
- **In-flight promises are lost** (logical).
- The frontend doesn't notice — it sends its ID as usual, and the server reloads the app from the DB.

Meaning: cap2UI5 apps are **inherently stateless on the server level** (in the sense of "no in-memory state per user"). You can scale them horizontally, as long as all instances share the same DB backend.

## Performance tips

- **Keep app instances small**: persist only what you really need for subsequent roundtrips. Reload database results fresh in `check_on_init()` instead of caching them in the app.
- **Avoid huge arrays as fields**: 10,000 rows in `this.users` means 10,000 rows per roundtrip in the DB — that adds up.
- **Use backed queries for tables**: bind `items` to an OData service via `set_odata_model` rather than to an app array.

→ Continue with [**Popups & Toasts**](./popups).
