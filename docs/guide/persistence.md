# Persistence & Sessions

A cap2UI5 app is **stateful across roundtrips** and stateless in memory. Your
fields keep their values between clicks, and they do so because the server
writes the app instance to the database after every roundtrip — not because
anything stays alive between them.

That distinction is the whole design, and it is what makes the apps survive a
restart, a second server behind a load balancer, and a scale-to-zero.

## What happens per click

```
browser  ──POST /rest/root/z2ui5 {id, event, model}──▶  CAP
                                                        │  load draft <id>
                                                        │  rebuild the app instance
                                                        │  apply the model the browser sent
                                                        │  call your main(client)
                                                        │  write a NEW draft, new id
         ◀──{S_FRONT:{ID:…}, actions, model}────────────┘
```

Every roundtrip writes a **new** draft with a fresh uuid and a pointer to the
previous one. Nothing is mutated in place, which is why the browser's back
button and a restored bookmark land on a consistent state rather than a
half-updated one.

## What is persisted

Your declared fields, and only those:

```js
defineApp("ZCL_ORDER", class {
  id       = "";
  customer = { name: "", city: "" };
  lines    = t.table({ sku: "", qty: 0, price: t.packed(9, 2) });

  main(client) { /* … */ }
});
```

All three survive — every declared field is kept in the draft, bound or not;
only what the app binds is also sent to the browser. Structures and tables nest as deeply as you like — the model
carries `ORDER.CUSTOMER.CITY` and `ORDER.LINES[].PRICE`, decimals included, and
the app reads the whole tree back as plain values on a later roundtrip.

A field the plugin cannot type is **left out of the model and named in a
warning** rather than silently dropped:

```
[cap2ui5] - defineApp ZCL_ORDER: these fields are NOT part of the model —
  total has no ABAP type
  Give an initial value, or declare it with t.table(…) / t.struct(…) / t.packed(…) / t.char(…). The app runs without them.
```

`null`, `undefined` and `[]` carry no type, so declare them: `t.table({…})` for
a table, `t.packed(9, 2)` for a decimal, `t.char(3)` for a fixed-width string.

## What is NOT persisted

Anything that is not a declared field. A value stashed on `this` inside `main`
with no initializer at construction time is not part of the model and will be
gone on the next roundtrip. If you want it to survive, declare it.

That is also what makes `this.client = client` in `main()` safe: a helper
method reaches the client the way it does in an ABAP app, and the client is
never persisted.

## It survives a restart — measured

`cold-test.mjs` is not a unit test. It starts a server, does a roundtrip,
**SIGKILLs the process**, starts a fresh one and continues the session:

```
VERDICT  control=ok  js-app-cold-restart=true  nav-stack-cold-restart=true
```

The third case is the sharp one: the kill happens *inside a called app*, so the
new process has to take the callee's event, unwind an app stack it never built,
run the caller's `main` again and carry the result home. It answers
`{CHOSEN:"red", PICKS:1}` — only reachable if the caller, the callee and the
stack between them all came out of `cap2ui5.Drafts`.

Had any of it lived in memory, the new process would have answered the caller's
start state with no error anywhere. That silence is why this is a test rather
than an assumption.

## Concurrency

Three users interleaved in one process each get their own answer — one draft
chain per session, no shared state, nothing to lock. `concurrency.test.mjs`
drives exactly that.

## Sessions belong to their user

A draft answers to the user who created it and to nobody else, with the same
"not found" a missing draft gives. The details, and the defect that once made an
ownerless row everybody's, are in [Database Model](../reference/database).

## Retention

Drafts older than four hours are swept on the next roundtrip. A session left
open over lunch is fine; one left open overnight starts fresh. Both the sweep
and the framework's willingness to resume follow the same number, and your
[user exit](./user-exit#onroundtrip) sets it.

## The database in development

Everything here was measured with `cds watch` on CAP 10.1 in a project from
`cds init --nodejs --add tiny-sample`, as the [Quickstart](./getting-started)
creates it.

### Where the tables come from

`cds watch` connects to an **in-memory SQLite** and deploys every table at each
start:

```
[cds] - loaded model from 2 file(s):
  srv/cat-service.cds
  node_modules/@cap2ui5/cds-plugin/index.cds
[cds] - connect to db > sqlite { url: ':memory:' }
```

The tables come from every `.cds` file CAP loads — a `db/` folder with a
schema is not required. `CatalogService.Books` is defined in
`srv/cat-service.cds`; `cap2ui5.Drafts` comes from the plugin's model.

### Where the rows come from

- **Your data** comes from CSV files in `db/data/`, matched to an entity by
  file name: `db/data/CatalogService.Books.csv` fills `CatalogService.Books`,
  and the log says `> init from db/data/CatalogService.Books.csv`.
- **Drafts** are written by the plugin: one row per roundtrip — the app start
  and every click — with the owner (`alice`) and the serialized app instance.
  The `data` column holds your fields as XML, `<COUNT>1</COUNT>` for the
  quickstart's counter. Rows older than four hours are deleted on each
  roundtrip ([Retention](#retention)).

### See the tables

```bash
cds compile "*" --to sql
```

prints the `CREATE TABLE` statements: `CatalogService_Books`,
`cap2ui5_Drafts`, and `cds_outbox_Messages`, which is CAP's own. The double
quotes work in bash, PowerShell and cmd.exe alike.

### Look inside while the app runs

```bash
cds repl --run .
```

starts the server in a REPL, on a **random port** — take the address from the
`[cap2ui5]` lines it prints. Use the app, then query:

```js
await SELECT.from("cap2ui5.Drafts").columns("id","owner","createdAt")
```

After the start of an app and one click, that answers two rows, both owned by
`alice`. `.exit` leaves the REPL and stops the server.

### Keep the data across restarts

Point the database at a file in `package.json`:

```json
{
  "cds": {
    "requires": {
      "db": { "kind": "sqlite", "credentials": { "url": "db.sqlite" } }
    }
  }
}
```

and run `cds deploy` once, which creates `db.sqlite` with the tables and the
CSV data. From then on `cds watch` says `connect to db > sqlite { url:
'db.sqlite' }`, and drafts and data survive a restart — a tab that was open
before the restart keeps working, where the in-memory database answers
`NO_DRAFT_ENTRY_OF_PREVIOUS_REQUEST_FOUND`.

- **Running `cds deploy` again rebuilds the tables** and deletes everything the
  apps wrote, drafts included. Open tabs then need a reload.
- **`cds init` already lists `*.sqlite` in `.gitignore`**, so the file stays
  out of the repository.
- **Give SQLite a busy timeout** as soon as a second process writes to the
  same file — the SQLite warning in
  [Database Model](../reference/database#retention) has the setting.

## Next

- [**Database Model**](../reference/database) — the entity and the owner binding
- [**App Lifecycle**](./lifecycle) — which branch runs when
- [**Navigation**](./navigation) — the app stack the drafts encode
