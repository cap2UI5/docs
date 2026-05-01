# API: App Interface

Jede cap2UI5-App muss von `z2ui5_if_app` erben. Quelle: [`srv/z2ui5/02/z2ui5_if_app.js`](https://github.com/cap2UI5/dev/blob/main/cap2UI5/srv/z2ui5/02/z2ui5_if_app.js).

## Definition

```js
const z2ui5_if_app = require("../z2ui5/02/z2ui5_if_app");

class my_app extends z2ui5_if_app {
  async main(client) {
    // ...
  }
}
```

## Pflicht-Methode

### `async main(client)`

Wird bei **jedem Roundtrip** aufgerufen. Bekommt das `client`-Objekt als einziges Argument. Muss `async` sein (oder ein Promise zurückgeben).

```js
async main(client) {
  if (client.check_on_init()) { /* ... */ }
  if (client.check_on_event(...)) { /* ... */ }
}
```

## Reservierte Felder (Framework)

Diese Properties sind auf der Basisklasse vordefiniert. **Nicht überschreiben** und nicht als eigenen App-State nutzen:

| Property | Typ | Bedeutung |
|---|---|---|
| `id_draft` | `string` | Draft-ID, intern verwaltet |
| `id_app` | `string` | App-ID, intern verwaltet |
| `check_initialized` | `boolean` | wird nach erstem `main()` auf `true` gesetzt — steuert `check_on_init()` |
| `check_sticky` | `boolean` | wenn `true`, sticky-Session aktiv |

Der Binding-Engine schließt diese Felder explizit aus dem Reference-Lookup aus (`_FRAMEWORK_FIELDS` in `z2ui5_cl_core_client.js`).

## Statische Konstanten

```js
z2ui5_if_app.version    // "1.142.0"
z2ui5_if_app.origin     // "https://github.com/abap2UI5/abap2UI5"
z2ui5_if_app.authors    // Link zur Contributors-Seite
z2ui5_if_app.license    // "MIT"
```

## Validierung

Beim ersten Roundtrip wird `z2ui5_cl_core_app.validate(oApp)` aufgerufen — wenn deine Klasse nicht von `z2ui5_if_app` erbt, wirft sie:

```
my_app must extend z2ui5_if_app (INTERFACES z2ui5_if_app)
```

## Persistenz-Annotationen

Es gibt aktuell **keine Annotationen**, mit denen du Felder von der Persistenz ausschließen kannst. Wenn du transient Felder brauchst, lege sie als **lokale Variablen in `main()`** an statt als App-Property. Die einzige hardgecodete Skip-Liste ist `["client"]` in `z2ui5_cl_core_srv_draft.js`.

Vorschlag, falls du das brauchst — patch `SKIP_PROPS`:

```js
// srv/z2ui5/01/01/z2ui5_cl_core_srv_draft.js
static SKIP_PROPS = new Set(["client", "_my_transient_field"]);
```

(Mit dem Wissen, dass dein Patch beim nächsten Sync verloren gehen kann.)

## Konstruktor

Die Basisklasse hat einen Konstruktor, der **direkte Instanziierung** verbietet:

```js
new z2ui5_if_app();   // ❌ throws
```

Außerdem prüft er, dass deine Subklasse `main` als Funktion implementiert:

```js
class broken extends z2ui5_if_app { /* fehlt main() */ }
new broken();  // ❌ "broken must implement async main(client)"
```

## Lebenszyklus

→ siehe [App-Lifecycle](../guide/lifecycle).

## Convention: Naming

abap2UI5-Konvention ist `z2ui5_cl_app_xyz`. cap2UI5 hält sich daran für Library-Apps (Startup, Hello World, Pop-Helper), aber **deine eigenen Apps** dürfen heißen wie sie wollen. Wichtig:

- **Klassenname === Dateiname** (sonst findet `_findAppFile` die Klasse nicht beim Reload).
- Die Datei muss in einem der drei Lookup-Pfade liegen (`srv/z2ui5/02/`, `srv/z2ui5/02/01/`, `srv/samples/`) oder du erweiterst `_findAppFile`.
- Klassenname sollte **case-sensitive eindeutig** sein — der Lookup zwingt auf Lowercase, also kollidieren `MyApp` und `myapp`.
