# Database Model

cap2UI5 uses **a single CDS entity** for app persistence: `z2ui5_t_01`. This page describes it and gives hints on cleanup, scaling, and backend choice.

## Entity definition

`db/schema.cds`:

```cds
namespace cap2ui5;

entity z2ui5_t_01 {
  key id      : UUID;
  id_prev     : UUID;          // ← predecessor ID (app history)
  owner       : String(255);   // ← the user the draft belongs to
  data        : LargeString;   // ← serialized app instance (JSON)
  createdAt   : Timestamp @cds.on.insert: $now;
}
```

Every roundtrip performs an `INSERT.into(z2ui5_t_01)` with:

- `id` — newly generated (UUID v4)
- `id_prev` — the ID the frontend driver passed along as `S_FRONT.ID`
- `owner` — `cds.context.user.id`, from the identity provider
- `data` — `JSON.stringify(oApp)` plus `__className` + `__filePath`
- `createdAt` — set by CAP, and what the retention job prunes on

`owner` is not bookkeeping. A row holds the complete serialized state of a
session, so it is bound to its creator in two independent places: the OData
projection is `@readonly` with `where: 'owner = $user'`, and the draft store
filters on the owner again when loading. A draft id travels through request
bodies, logs and browser history — it is not treated as a secret.

## Data format in `data`

```json
{
  "__className": "my_app",
  "__filePath":  "../../../app/samples/my_app.js",
  "id_draft":    "",
  "id_app":      "",
  "check_initialized": true,
  "check_sticky":      false,
  "username":          "Alice",
  "preferences":       { "language": "de" },
  "__navStackIds":     ["xyz-789", "abc-123"]
}
```

`__className` and `__filePath` are used for the reload. `__navStackIds` contains the IDs of the stacked apps (see [Persistence](../guide/persistence)).

The engine is **cycle-safe** — a built-in `WeakSet` tracker prevents accidental circular references from breaking stringify.

## Database backends

CAP supports several persistence backends. All work with cap2UI5:

| Backend | Driver | When |
|---|---|---|
| SQLite (in-memory) | `@cap-js/sqlite` | Dev default (`npx cds w`) |
| SQLite (file) | `@cap-js/sqlite` | Local testing with persistence |
| HANA / HANA Cloud | `@cap-js/hana` | Production on BTP |
| PostgreSQL | `@cap-js/postgres` | Self-hosted Cloud Foundry / Kubernetes |

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

Switching to HANA in production goes via the `@sap/cds` `profile` mechanism, no code changes.

## Indexes & performance

The default schema generation has **only the primary key** on `id`. For production loads I recommend:

- **Index on `id_prev`** if you ever want to traverse (undo, audit). Not needed otherwise.
- With many parallel users: the `INSERT` is called often enough that HANA with indexes enabled becomes noticeable — keep your indexes minimal.

The schema already carries `createdAt` (that is what retention prunes on) and
`owner`. If you want CAP's full audit set, swap in the `managed` aspect:

```cds
entity z2ui5_t_01 : managed {  // ← adds createdAt/createdBy/modifiedAt/modifiedBy
  key id      : UUID;
  id_prev     : UUID;
  owner       : String(255);
  data        : LargeString;
}
```

The `managed` aspect requires no code patch in cap2UI5 — the engine ignores the additional fields during deserialization since it only reads `data`.

## Cleanup strategy

::: warning Table grows linearly
**Each roundtrip = one new row.** A 50-click session = 50 rows. 1,000 users with 50 clicks each = 50,000 rows per day.
:::

### Option 1: the retention job that already ships

You do not have to write this one — it ships inside the framework package
(`core/srv/cap/retention.js`) and is started by its `cds-plugin`, so it is
running in any project that installs cap2UI5, not only in this repository. It
deletes rows past their TTL once at startup and hourly after that, on an
`unref`'d timer so it never holds the process open.

Configure it with one environment variable:

| Variable | Default | Meaning |
|---|---|---|
| `Z2UI5_DRAFT_TTL_HOURS` | the framework's own `draft_exp_time_in_hours` (`4`) | how long a draft row is kept; `0` disables cleanup entirely |
| `Z2UI5_DRAFT_RETENTION_INSTANCE` | `0` | which Cloud Foundry instance runs the cleanup loop; `*` lets every instance run it |

```bash
Z2UI5_DRAFT_TTL_HOURS=2 npx cds watch     # shorter retention
Z2UI5_DRAFT_TTL_HOURS=0 npx cds watch     # keep everything (debugging)
```

Anything unparseable falls back to the framework's own TTL rather than
disabling cleanup —
a typo in the variable must not silently turn retention off.

### Option 2: DB-side job

Strongly recommended in production: a nightly cron on the DB deletes older rows.

```sql
-- HANA procedure (simplified)
DELETE FROM "MY_DOMAIN_Z2UI5_T_01"
WHERE "CREATEDAT" < ADD_DAYS(CURRENT_TIMESTAMP, -1);
```

### Option 3: limit per user

If you have a user ID (via `cds.context.user.id`), you can enforce a user-specific LIMIT in the handler — delete the oldest rows per user.

This requires extending the schema with `user_id` and patching `z2ui5_cl_ui5_srv_draft.saveApp` — currently not built in.

## Important caveats

- **Rows are immutable.** Never `UPDATE` an existing row — the engine assumes that every ID identifies **a specific app instance**.
- **`id_prev` is NOT unique.** If a user tries two different "next steps" via browser back, there are two rows with the same `id_prev`. That is intentional — it's a forking history.
- **No foreign-key constraint.** `id_prev` points to `id`, but CAP won't enforce that if you leave the schema unchanged. Cleanup jobs can orphan arbitrary sub-trees.

## Scaling to multi-tenant

cap2UI5 is **multi-tenant capable** out of the box, because CAP is. With `@sap/cds-mtxs` each tenant DB runs separately — no code patch needed.

Per tenant you then see your own `z2ui5_t_01` table. Cleanup strategies run per tenant.

→ Continue with [Deployment](./deployment).
