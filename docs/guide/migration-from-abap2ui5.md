# Migrating from abap2UI5

An abap2UI5 app and a cap2UI5 app are the same app in two languages. The wire
protocol is identical, the frontend is byte-identical, and the API is the same
method for method — so migration is mechanical rather than a redesign. What
changes is the language, the data access, and the outbound calls.

This page is the per-construct mapping. For the wider comparison — why a
second implementation exists, which one to pick — see
[cap2UI5 vs. abap2UI5](./vs-abap2ui5).

## The five steps

1. **Rewrite the ABAP class as a JS class**, method for method. Or let the
   transpiler do a first pass: in a
   [builder-abap2UI5-js](https://github.com/cap2UI5/builder-abap2UI5-js)
   checkout, `npm run transpile -- path/to/z2ui5_cl_my_app.clas.abap --stdout`
   emits JavaScript and marks what it could not translate as
   `// TODO(abap2js)` comments instead of dropping it.
2. **Rebuild the view** if it was built on the retired `z2ui5_cl_xml_view` —
   the one builder here is `z2ui5_cl_ui5_view_builder`.
3. **Convert data access** from OpenSQL to CDS queries.
4. **Convert outbound calls** from `cl_http_client` to `fetch` or
   `cds.connect.to`.
5. **Drop the file into** [`srv/app/`](./project-structure#srv-app) and run it.
   The same static frontend renders it without changes.

## Construct by construct

### The app class

| abap2UI5 | cap2UI5 |
|---|---|
| `CLASS … DEFINITION PUBLIC` / `INTERFACES z2ui5_if_app` | `class … extends z2ui5_if_app` |
| `METHOD z2ui5_if_app~main` | `async main(client)` |
| `DATA name TYPE string` (class attribute) | `name = ""` (class field) |
| `me->name` | `this.name` |
| the class name is the ADT/CCDIR object name | the class name **must** match the file name — the RTTI lookup is name-based |

App state is the instance's own fields in both worlds: whatever you assign to
`this` survives the roundtrip, because the framework serialises the instance
into the draft. See [App Lifecycle](./lifecycle).

### Views

| abap2UI5 | cap2UI5 |
|---|---|
| `z2ui5_cl_ui5_view_builder=>factory( )` | `z2ui5_cl_ui5_view_builder.factory()` |
| `z2ui5_cl_xml_view` (frozen upstream) | **not carried** — rebuild on `z2ui5_cl_ui5_view_builder` |
| `z2ui5_cl_xml_view_cc` (custom-control decorator) | **not carried** — the `z2ui5.cc` namespace is declared on the view like any other |
| the built-in popups `z2ui5_cl_pop_*` | **not carried** — see [Popups & Toasts](./popups) |
| `view->ele( n = 'View' ns = 'mvc' )` — named arguments | `view.ele({ n: "View", ns: "mvc" })` — one object |
| `)->a( n = 'title' v = 'Hello' )` chained with `->` | `.a({ n: "title", v: "Hello" })` chained with `.` |
| `view->stringify( )` | `view.stringify()` |

Named arguments are the one place every line changes shape. ABAP names each
argument (`n = … v = …`); JavaScript passes a single object literal with the
same keys. Positional shorthand survives where ABAP had it: `view->ele( 'Page' )`
becomes `view.ele("Page")`. The methods themselves —
[`ele`, `tag`, `a`, `end`, `stringify`](../api/view-builder#methods) — are
unchanged.

The absent classes are absent on purpose, not by omission: cap2UI5 does not
carry abap2UI5's frozen `src/99` package at all
([why](./vs-abap2ui5#commonalities)). An old sample that still compiles
upstream can therefore fail here on the import alone.

### Binding

| abap2UI5 | cap2UI5 |
|---|---|
| `client->_bind( name )` | `client._bind(this.name)` |
| `client->_bind_edit( name )` | `client._bind_edit(this.name)` |
| `client->_event( 'BUTTON_POST' )` | `client._event("BUTTON_POST")` |

::: warning `_bind` vs `_bind_edit` — check which release your source targets
cap2UI5 pins abap2UI5 **1.142.0** (`static version` on `z2ui5_if_app`, in
`core/srv/z2ui5/02/z2ui5_if_app.js`). On that release the two calls are two
different bindings:

- `_bind()` is **one-way** — the value is rendered, and changes in the browser
  are not read back.
- `_bind_edit()` is **two-way** — the value is rendered *and* the frontend
  writes it back into the attribute on the next roundtrip. An `Input` whose
  value you intend to read needs this one.

Upstream merged the two in **1.143.0**: from there on `_bind_edit()` is an
alias of `_bind()`, and everything is two-way. So an app written against
1.143.0 or later that relies on `_bind()` writing back **will silently not
write back here** — the field simply stays at its old value. Migrating such an
app means changing those calls to `_bind_edit()`.

Coming the other way, from an older app: `_bind_edit()` keeps working on both
releases, which makes it the safe choice while the two releases coexist.
:::

In both languages the binding call receives the attribute and the framework
works out *which* attribute that was. In JavaScript it does so by value
identity, so pass `this.name` itself — a copy, a literal or an expression can
resolve to a different attribute holding the same value. See
[Data Binding](./data-binding#reference-equality) for what to do when two
fields legitimately share a value.

### Data structures

| abap2UI5 | cap2UI5 |
|---|---|
| `TYPES: BEGIN OF ty_s_row … END OF ty_s_row` | no declaration — a plain object `{ … }` |
| `DATA s_row TYPE ty_s_row` | `s_row = { carrid: "", connid: "" }` |
| `DATA t_tab TYPE STANDARD TABLE OF ty_s_row` | `t_tab = []` |
| `APPEND s_row TO t_tab` | `t_tab.push(s_row)` |
| `READ TABLE t_tab INTO s_row INDEX 1` | `s_row = t_tab[0]` |
| `LOOP AT t_tab INTO s_row` | `for (const s_row of t_tab)` |
| `CLEAR` / `IS INITIAL` | `= ""` / `= []` / a falsy check |
| field names are case-insensitive, upper-cased in the model | **object keys are case-sensitive** — keep them lower-case and consistent |

The last row is the one that bites. ABAP does not care whether you wrote
`CARRID` or `carrid`; JavaScript does, and a binding path that disagrees with
the object key by one character renders empty rather than failing.

### Data access

| abap2UI5 | cap2UI5 |
|---|---|
| `SELECT * FROM scarr INTO TABLE @DATA(t)` | `const t = await SELECT.from("my.Carriers")` |
| `SELECT SINGLE … WHERE id = @lv_id` | `await SELECT.one.from("my.Carriers").where({ id })` |
| `SELECT … UP TO 100 ROWS` | `.limit(100)` |
| `INSERT`/`UPDATE`/`DELETE` | `INSERT.into(…)`, `UPDATE(…)`, `DELETE.from(…)` |
| `sy-subrc` after the statement | an empty array / `undefined`, or a thrown error |
| implicit client handling, authorisation checks | CAP's `@requires` / `@restrict` on the service |

CDS queries are **asynchronous**. That is the one structural change migration
forces: a method that reads data becomes `async`, and every caller up to
`main` has to `await` it. `main` is already `async` in cap2UI5, which is why
the chain terminates cleanly.

### Outbound calls

| abap2UI5 | cap2UI5 |
|---|---|
| `cl_http_client=>create_by_url( … )` | `await fetch(url, { … })` |
| `client->send( )` / `client->receive( )` | the awaited `fetch` promise |
| `lo_response->get_cdata( )` | `await res.text()` |
| `/ui2/cl_json=>deserialize( )` | `await res.json()` |
| RFC / service consumer / destination | `await cds.connect.to("service")` |
| SM59 destination | a CAP destination or a plain URL |

See [External OData Call](../examples/external-odata) for a worked example.

### Everything else

| abap2UI5 | cap2UI5 |
|---|---|
| `sy-uname` | the identity provider — `engine.set_identity(…)`, see [Configuration](../reference/configuration#identity) |
| `sy-datum` / `sy-uzeit` | `new Date()` |
| `MESSAGE`/`cx_root` exceptions | `throw new Error(…)` / `try…catch` |
| `z2ui5_cl_ui5_user_exit` (config exit) | the same class, same two hooks — see [The User Exit](./user-exit) |
| DB table `Z2UI5_T_01` | CDS entity `cap2ui5.z2ui5_t_01`, see [Database Model](../reference/database) |
| transport / abapGit pull | `npm install`, `cds build`, `cf deploy` |

## What does not need migrating

- **The frontend.** cap2UI5 serves the same `app/z2ui5/webapp/` UI5 bundle
  abap2UI5 does, custom controls included. Nothing you built on the frontend
  side changes.
- **The wire protocol.** `POST /rest/root/z2ui5` with the same
  `{ S_FRONT, XX, MODEL }` payload. A frontend cannot tell the two backends
  apart, which is why the same app can be deployed in both worlds during a
  transition.
- **The mental model.** Roundtrips, the draft chain, `check_on_init` /
  `check_on_event` / `check_on_navigated`, `nav_app_call` — all identical.

→ Next: the [**Sample Catalogue**](./samples) — the whole abap2UI5 demo
collection, already transpiled, is the largest set of before/after pairs
available.
