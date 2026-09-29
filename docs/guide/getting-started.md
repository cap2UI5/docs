# Quickstart

From an empty directory to a clickable cap2UI5 app, with the commands exactly
as they run. cap2UI5 is a **CAP plugin**: you add it to a CAP project you
already have, or to a brand new one. There is no cap2UI5 project to clone.

## Prerequisites

- **Node.js 22 or later** — the plugin, `@cap2ui5/cds-plugin`, and
  `@abap2ui5/node-runtime`, which it depends on, both require it
- **`@sap/cds-dk`** installed globally, for the `cds` command
- Internet access — the page loads UI5 from the SAP CDN

No database setup: CAP starts SQLite for you.

Check Node before anything else:

```bash
node -v
```

It must print `v22` or higher.

## 1. A CAP project and the plugin

Skip `cds init` if you already have a CAP project and run the
`npm add @cap2ui5/cds-plugin` line in it.

```bash
npm i -g @sap/cds-dk
cds version
```

`cds version` must list `@sap/cds-dk (global)` with a `10.x` version. If the
shell answers that `cds` is not found, open a new terminal — see
[Troubleshooting](./troubleshooting#the-cds-command-is-not-found) if that does
not help. Then create the project and add the plugin:

```bash
cds init my-cap2ui5-app --nodejs --add tiny-sample
cd my-cap2ui5-app
npm install
npm add @cap2ui5/cds-plugin
```

`--add tiny-sample` gives the project something to read later: a service
`CatalogService` with one entity `Books` in `srv/cat-service.cds`, and five
books in `db/data/CatalogService.Books.csv`.

::: details Optional: check the CAP project before adding the plugin
Run `cds watch` after the first `npm install` and before
`npm add @cap2ui5/cds-plugin`, and open <http://localhost:4004>. CAP's index page lists the service endpoint
`/odata/v4/catalog` with `Books`; the link answers the five books as JSON.
That is a plain CAP project working. Stop the server with `Ctrl+C` and go on.
:::

Two things about `cds init` that cost time when missed. Without `--nodejs`,
`cds init` (cds-dk 10) writes no `package.json` at all, and there is nothing
to install the plugin into. And it fails in a folder whose name contains a
space.

`npm add @cap2ui5/cds-plugin` is the whole installation. It brings two
packages from npm — `@cap2ui5/cds-plugin` and the `@abap2ui5/node-runtime`
release it pins — and on the next `cds watch` these exist that did not before:

| | |
|---|---|
| the roundtrip route | `/sap/bc/z2ui5` and `/rest/root/z2ui5` — a GET on it answers with the page that embeds the whole UI5 frontend |
| `cap2ui5.Drafts` | a CDS entity for session state, created by `cds deploy` next to your own |

Your own `server.js`, if you have one, is not touched. Nothing is generated
into your repository, and there are no frontend files to serve.

::: info Coming from the package `cap2ui5`
Up to 0.2.0 the plugin was the unscoped package `cap2ui5`. On npm that name is
now a deprecated notice that only throws an error naming the new package. A
project that has it swaps it:

```bash
npm rm cap2ui5 && npm add @cap2ui5/cds-plugin
```

and its app modules import `@cap2ui5/cds-plugin` instead of `cap2ui5`.
Everything else keeps its name: the configuration `cds.requires.cap2ui5`,
`cds add cap2ui5`, `npx cap2ui5 abap2js`, the entity `cap2ui5.Drafts` and the
log `[cap2ui5]`.
:::

## 2. Your first app

One file in `srv/apps/` — the directory the plugin scans. It does not exist
yet in a new project:

::: details Creating `srv/apps/hello.js`
- **VS Code:** right-click the `srv` folder → **New File…** → type
  `apps/hello.js`. The slash creates the `apps` folder along with the file.
- **Terminal:** `mkdir srv/apps` (macOS, Linux, PowerShell) or `mkdir srv\apps`
  (Windows cmd.exe), then create `hello.js` in it with your editor.
:::

```js
// srv/apps/hello.js
import { defineApp } from "@cap2ui5/cds-plugin";

defineApp("HELLO", class {
  name  = "";
  count = 0;

  main(client) {
    if (client.check_on_navigated()) {
      client.view_display(
        `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" displayBlock="true" height="100%">` +
        `<Shell><Page title="My first cap2UI5 app">` +
        `<Input value="${client._bind("name")}"/>` +
        `<Text text="clicks: ${client._bind("count")}"/>` +
        `<Button text="Say hello" press="${client._event("GO")}" type="Emphasized"/>` +
        `</Page></Shell></mvc:View>`);
      return;
    }

    if (client.check_on_event("GO")) {
      this.count++;
      client.message_toast_display(`Hi, ${this.name}! You clicked ${this.count}x.`);
    }
  }
});
```

`client` is abap2UI5's `z2ui5_if_client`, under its ABAP method names:
`client->check_on_navigated( )` in an ABAP app is
`client.check_on_navigated()` here. The [Client API](../api/client) lists
every method.

::: warning `import`, not `require` — in this project
`cds init --nodejs` creates an **ES module** project (`"type": "module"` in
`package.json`), so a `.js` file there must `import`. A `require("@cap2ui5/cds-plugin")`
in it fails the **start**: the plugin loads the app modules before the server
listens, and a module that fails to load stops it, as a broken service
implementation does. `cds watch` then never prints the app addresses, and the
log names the file with `ReferenceError: require is not defined in ES module
scope`. See [Troubleshooting](./troubleshooting#the-server-does-not-start-require-is-not-defined-in-es-module-scope).

In a CommonJS project (no `"type": "module"`), or in a file ending in `.cjs`,
`const { defineApp } = require("@cap2ui5/cds-plugin")` is correct and works the same way.
The examples on this site use `import`, because that is what `cds init` gives
you.
:::

::: details Or let `cds add cap2ui5` write a first app
`cds add cap2ui5` creates `srv/apps/hello.js` in a project that has no apps
yet: abap2UI5's hello world, `HELLO`, with its view built by
`z2ui5_cl_ui5_view_builder` (see [Views](./views)), written with `import` in a
project from `cds init --nodejs`. It takes the app name `HELLO`, so use it instead of the file above, not beside it.
:::

Four things worth knowing, and each of them is a rule rather than a style:

- **`main` is synchronous.** No `async`, no `await` — the client's methods
  need none. Make it `async` only when *your app* does I/O — reading your own
  entities with `await SELECT.from(Books)`.
- **`client.check_on_navigated()` is the render branch, not
  `client.check_on_init()`.** `check_on_navigated()` is also true every time
  the app gets the screen back from a navigation or a value help. An app that
  renders only on `check_on_init()` works perfectly until something navigates
  back into it, and then leaves the previous screen standing with no error
  anywhere. `check_on_init()` is for seeding state once.
- **State is ordinary fields.** `name = ""` and `count = 0` are the app's
  model; `client._bind("name")` binds one into the view — by its **name**, as
  a string. They survive the roundtrip because the plugin stores the instance
  in `cap2ui5.Drafts`.
- **The first argument of `defineApp` is the app's name on the wire** — it is
  what `?app_start=` takes. The file name does not matter.

## 3. Run it

```bash
cds watch
```

Once the server listens, the plugin prints every app with the address that
starts it, and the user to log in as:

```
[cap2ui5] - HELLO  http://localhost:4004/sap/bc/z2ui5?app_start=HELLO
[cap2ui5] - development login: alice (empty password)
```

Open that address. In development, CAP's start page at
`http://localhost:4004/` lists the same addresses under "Web Applications",
next to your CDS services — so the app is one click away from there too.
Neither the lines nor the list appear in production.

The address is the **roundtrip route**, not a static page: the framework
answers a GET on it with a page that embeds the whole UI5 component — every
module, view and stylesheet — and starts the app named in `app_start`.
`/rest/root/z2ui5?app_start=HELLO` is the same door under its other name.

You are asked to log in because the plugin requires an authenticated user by
default, and `cds watch` uses CAP's mocked auth. See
[Configuration](../reference/configuration) to open the route to anonymous
callers — and what that costs.

::: tip After you edit a file, reload the tab
`cds watch` restarts on every change, with a fresh in-memory database. A tab
that was open before the restart then answers
`NO_DRAFT_ENTRY_OF_PREVIOUS_REQUEST_FOUND` on its next click — its session was
a row in the database that no longer exists. Reload the page to start a new
one.
:::

## What you just built

A **stateful UI5 app** in one file that

- binds `name` two-way — you type, the server receives it;
- keeps `count` across roundtrips, because the state is a row in your
  database (`cap2ui5.Drafts`) rather than server memory;
- needed no OData service, no manifest, no controller, no frontend build.

## Reading your own data

The point of running inside CAP: an app reads your entities with `cds.ql`,
exactly as a handler does. This is a complete app for the project from
step 1 — save it as `srv/apps/books.js`, next to `hello.js`:

```js
// srv/apps/books.js
import cds from "@sap/cds";
import { defineApp, t } from "@cap2ui5/cds-plugin";

const { SELECT } = cds.ql;

defineApp("BOOKS", class {
  search = "";
  books  = t.table({ ID: 0, title: "", author: "" });

  async main(client) {
    if (client.check_on_init()) {
      this.books = await SELECT.from("CatalogService.Books");
    }
    if (client.check_on_navigated()) {
      client.view_display(`
        <mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" displayBlock="true" height="100%">
          <Shell>
            <Page title="Books">
              <SearchField value="${client._bind("search")}" search="${client._event("SEARCH")}"/>
              <Table items="${client._bind("books")}">
                <columns>
                  <Column><Text text="Title"/></Column>
                  <Column><Text text="Author"/></Column>
                </columns>
                <items>
                  <ColumnListItem>
                    <cells>
                      <Text text="{TITLE}"/>
                      <Text text="{AUTHOR}"/>
                    </cells>
                  </ColumnListItem>
                </items>
              </Table>
            </Page>
          </Shell>
        </mvc:View>`);
      return;
    }
    if (client.check_on_event("SEARCH")) {
      this.books = await SELECT.from("CatalogService.Books")
        .where`title like ${"%" + this.search + "%"}`;
      client.message_toast_display(`${this.books.length} found`);
    }
  }
});
```

`cds watch` restarts by itself when you save, and the startup lines gain one:

```
[cap2ui5] - BOOKS  http://localhost:4004/sap/bc/z2ui5?app_start=BOOKS
```

Open it: five books. Search for `Raven` and one row is left, with a toast
"1 found". Three things the example shows:

- **`main` is `async`** because the app does I/O — and `check_on_init()`
  seeds the table once, before the first render.
- **`t.table({…})` describes one row**, not the table: the field starts empty,
  and the object only fixes the columns and their types.
- **Column names are UPPERCASE in the view** — `{TITLE}`, not `{title}`. The
  model carries field names uppercase; see [Data Binding](./data-binding#tables).

## The samples

abap2UI5's samples are a package too, `@cap2ui5/samples` — every sample a
cap2UI5 app, translated from its ABAP original line for line. Add it to the
project as a devDependency:

```bash
npm add -D @cap2ui5/samples
cds watch
```

The startup lines now list every sample beside `HELLO` and `BOOKS`, each under
its ABAP class name. As a devDependency the samples are there in development
only; a production start leaves them out. How a package brings apps is in
[Project Structure](./project-structure#apps-from-a-package), the list of
samples in the [cap2UI5/samples](https://github.com/cap2UI5/samples)
repository.

## What is in the database

`cds watch` runs on an **in-memory SQLite** and deploys every table at each
start — the log says `connect to db > sqlite { url: ':memory:' }`. The tables
come from every `.cds` file CAP loads, your `srv/cat-service.cds` and the
plugin's model, which brings `cap2ui5.Drafts`. The books are loaded from the
CSV file; the drafts are written by the plugin, one row per roundtrip.

That is also why a restart forgets everything. How to list the tables, look
inside them while the app runs, and keep the data across restarts with a
SQLite file is in
[Persistence: the database in development](./persistence#the-database-in-development).

## When something goes wrong

| You see | It is |
|---|---|
| the server does not start: `require is not defined in ES module scope` | an app file uses `require` — write `import`, or name the file `.cjs` |
| `NO_DRAFT_ENTRY_OF_PREVIOUS_REQUEST_FOUND` after a code change | the restart emptied the database — reload the tab |
| the browser asks for a login | log in as `alice` and leave the password empty |
| `port 4004 is already in use` | another `cds watch` still runs — stop it, or start with `cds watch --port 4005` |
| a white page | UI5 did not load from the SAP CDN (`sdk.openui5.org`) — check internet or proxy, and open the browser console with `F12` |
| `cds` is not found | open a new terminal; on Windows see [Troubleshooting](./troubleshooting#the-cds-command-is-not-found) |
| `EACCES` on `npm i -g` (macOS, Linux) | install Node with nvm instead of using `sudo` |

The details for each are in [Troubleshooting](./troubleshooting).

## Next steps

- [**Project Structure**](./project-structure) — what the plugin adds, and what stays yours
- [**App Lifecycle**](./lifecycle) — `check_on_init()` vs. `check_on_navigated()`, events, navigation
- [**Data Binding**](./data-binding) — `client._bind()`, tables, structures
- [**Client API**](../api/client) — every method of `z2ui5_if_client`
- [**Persistence**](./persistence) — `cap2ui5.Drafts` and the owner binding
- [**Configuration**](../reference/configuration) — routes, the auth default, the apps directory
- [**Deployment**](../reference/deployment) — to BTP: `cap2ui5.Drafts` becomes an HDI table in the HANA build, and the approuter needs one extra route
