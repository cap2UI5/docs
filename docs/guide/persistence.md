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
                                                        │  call your main(c)
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

  main(c) { /* … */ }
});
```

All three survive. Structures and tables nest as deeply as you like — the model
carries `ORDER.CUSTOMER.CITY` and `ORDER.LINES[].PRICE`, decimals included, and
the app reads the whole tree back as plain values on a later roundtrip.

A field the plugin cannot type is **left out of the model and named in a
warning** rather than silently dropped:

```
[defineApp] ZCL_ORDER: these fields are NOT part of the model —
  total has no ABAP type: null, undefined and an empty array carry none.
  Give it a value, or declare it with t.table(…) / t.packed(…).
```

`null`, `undefined` and `[]` carry no type, so declare them: `t.table({…})` for
a table, `t.packed(9, 2)` for a decimal, `t.char(3)` for a fixed-width string.

## What is NOT persisted

Anything that is not a declared field. A value stashed on `this` inside `main`
with no initializer at construction time is not part of the model and will be
gone on the next roundtrip. If you want it to survive, declare it.

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
open over lunch is fine; one left open overnight starts fresh.

## Next

- [**Database Model**](../reference/database) — the entity and the owner binding
- [**App Lifecycle**](./lifecycle) — which branch runs when
- [**Navigation**](./navigation) — the app stack the drafts encode
