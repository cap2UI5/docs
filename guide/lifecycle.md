# App-Lifecycle

Eine cap2UI5-App ist eine JavaScript-Klasse mit einer einzigen Pflicht-Methode: `async main(client)`. Wann genau diese aufgerufen wird, was beim ersten Mal passiert, was bei nachfolgenden Roundtrips passiert — das ist der App-Lifecycle.

## Die Methode `main(client)`

```js
class my_app extends z2ui5_if_app {

  some_field = "";

  async main(client) {
    // wird bei JEDEM Roundtrip aufgerufen
  }
}
```

Sie wird **bei jedem Roundtrip** aufgerufen — initialer Load, Button-Click, Selection-Change, Navigation, Popup-Schließen, … alles geht durch `main()`. Die Differenzierung machst du über die `check_*`-Methoden des `client`-Objekts.

## Die drei Hauptzustände

```js
async main(client) {

  if (client.check_on_init()) {
    // erster Aufruf der App-Instanz
    return;
  }

  if (client.check_on_navigated()) {
    // App wurde nach einem nav_app_call/leave gerade aktiviert
    return;
  }

  if (client.check_on_event("MY_EVENT")) {
    // ein konkretes Event ist eingetreten
    return;
  }
}
```

### `check_on_init()`

Liefert `true` **nur beim ersten** `main()`-Aufruf einer frischen App-Instanz. Das ist der Moment, in dem du:

- Default-Werte setzt
- Externe Daten lädst (`cds.connect.to(...)`)
- Die initiale View renderst

```js
if (client.check_on_init()) {
  this.customers = await (await cds.connect.to("northwind"))
    .run(SELECT.from("Customers").limit(50));
  this.render(client);
  return;
}
```

Intern: `check_on_init()` gibt `true` zurück, solange `oApp.check_initialized` falsy ist **und** kein Event-Name vorliegt. Nach `main()` setzt der Handler `check_initialized = true`, persistiert die Instanz und liefert die Response. Beim nächsten Roundtrip wird die Instanz aus der DB geladen — dann ist `check_initialized` bereits `true`, und `check_on_init()` liefert `false`.

### `check_on_event(name?)`

Mit Argument: testet, ob das angegebene Event aktuell aktiv ist.

```js
if (client.check_on_event("BUTTON_SAVE")) {
  await this.save();
}
```

Ohne Argument: testet, ob _irgendein_ Event aktiv ist.

```js
if (client.check_on_event()) {
  switch (client.get().EVENT) {
    case "BUTTON_SAVE":   /* ... */ break;
    case "BUTTON_CANCEL": /* ... */ break;
  }
}
```

Welcher Stil schöner ist, ist Geschmackssache — beide funktionieren identisch.

### `check_on_navigated()`

Liefert `true` direkt nach einem `nav_app_call(...)` oder `nav_app_leave(...)`. In der hineinnavigierten App kannst du damit auf den Result eines Popups oder einer Sub-App reagieren:

```js
if (client.check_on_navigated()) {
  const prev = client.get_app_prev();
  if (prev instanceof MyPopup && prev.result?.confirmed) {
    this.selected_id = prev.result.id;
  }
}
```

→ Mehr in [Navigation](./navigation).

## Was zwischen Roundtrips passiert

Der Lifecycle einer App-Instanz:

```
            ┌──────────────────────────────────────┐
            │ Erstes GET → Frontend lädt           │
            │ Erster POST (S_FRONT.ID = "")        │
            ▼                                      │
        action_factory                             │
        → factory_first_start (?app_start=…)       │
        → factory_system_startup                   │
            │                                      │
            ▼                                      │
        new MyApp()                                │
            │                                      │
            ▼                                      │
        apply XX delta (initial = leer)            │
            │                                      │
            ▼                                      │
        main(client)  ← check_on_init() === true   │
            │                                      │
            ▼                                      │
        check_initialized = true                   │
            │                                      │
            ▼                                      │
        DB.saveApp() → neue UUID erzeugt           │
            │                                      │
            ▼                                      │
        Response: { S_FRONT: { ID: <uuid>, … } }   │
            │                                      │
            ▼                                      │
        Browser zeigt View an                      │
            │                                      │
            ▼                                      │
        User klickt Button                         │
            │                                      │
            ▼                                      │
        POST { S_FRONT: { ID: <uuid>, EVENT, … }, XX: { … delta … } }
            │                                      │
            ▼                                      │
        action_factory → DB.loadApp(uuid)          │
            │                                      │
            ▼                                      │
        deserialize → my_app-Instanz mit altem State
            │                                      │
            ▼                                      │
        apply XX delta (User-Eingaben fließen ein) │
            │                                      │
            ▼                                      │
        main(client)  ← check_on_event(...) === true
            │                                      │
            ▼                                      │
        DB.saveApp() → neue UUID                   │
            └──────────────────────────────────────┘
```

Wichtig:

1. **Die App-Instanz lebt nur für einen Roundtrip** im Speicher. Danach wird sie serialisiert.
2. **Felder, die JSON-serialisierbar sind, überleben.** Funktionen, Closures, DOM-Refs, externe Connection-Objekte → nicht.
3. **Properties wie `client` werden geskippt** (siehe `SKIP_PROPS` in `z2ui5_cl_core_srv_draft.js`), damit kein zyklischer Graph entsteht.

## Pattern: Felder ↔ Reference-Equality-Bindings

```js
class search_form extends z2ui5_if_app {

  search    = "";    // ← bind_edit findet 'search' per Reference-Equality
  results   = [];
  page_size = 25;

  async main(client) {
    if (client.check_on_init()) { /* ... */ }
    if (client.check_on_event("DO_SEARCH")) {
      this.results = await this.search_db(this.search, this.page_size);
    }
    this.render(client);
  }

  render(client) {
    z2ui5_cl_xml_view.factory()
      .Page({ title: "Search" })
        .Input({ value: client._bind_edit(this.search) })
        .Button({ press: client._event("DO_SEARCH") })
        .Table({ items: client._bind(this.results) });
  }
}
```

Felder, die du über Bindings exposierst, **müssen Direkt-Properties** der App sein. `_bind_edit(this.deep.path.field)` funktioniert _nicht_ für tief geschachtelte Werte — du würdest `this.deep` exposieren und den Sub-Pfad als String binden:

```js
const path = client._bind_edit(this.deep, { path: true });
// path = "/XX/deep"
.Input({ value: `{${path}/path/field}` })
```

→ Vollständige Erklärung in [Data Binding](./data-binding).

## Framework-Felder (nicht selbst nutzen)

Diese Properties auf `z2ui5_if_app` sind reserviert:

```js
id_draft          = "";
id_app            = "";
check_initialized = false;
check_sticky      = false;
```

Nicht überschreiben — die Binding-Engine schließt sie explizit aus dem Reference-Lookup aus (`_FRAMEWORK_FIELDS` in `z2ui5_cl_core_client.js`), aber benutze sie nicht als eigenen App-State.

## Stickiness (optional)

```js
this.check_sticky = true;
client.set_session_stateful(true);
```

Setzt eine sticky-Session — der Frontend-Treiber serialisiert dann die Roundtrips strenger nacheinander. Für Apps mit kritischer Reihenfolge oder File-Upload-Sequenzen sinnvoll, sonst nicht nötig.

→ Weiter mit [**View Builder**](./views).
