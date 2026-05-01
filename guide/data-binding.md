# Data Binding

Das Data-Binding ist der Trick, mit dem cap2UI5 ohne Modell-Boilerplate auskommt. Diese Seite erklärt, **wie es funktioniert** und **wann du was nutzt**.

## Die zwei Bindings

```js
client._bind(value)        // → "{/path}"      One-way (read-only im Frontend)
client._bind_edit(value)   // → "{/XX/path}"  Two-way (Frontend kann zurückschreiben)
```

Beide Methoden bekommen einen **Wert**, schauen in `client.oApp` (= deine App-Instanz) nach, **welches Property dieser Wert ist**, und geben einen UI5-Bindings-Pfad zurück.

```js
class my_app extends z2ui5_if_app {

  username = "Alice";

  async main(client) {
    const path1 = client._bind(this.username);       // → "{/username}"
    const path2 = client._bind_edit(this.username);  // → "{/XX/username}"
  }
}
```

## Reference Equality

Das Lookup ist **per Reference-Equality**: `Object.is(this.username, value)`. Für Primitivwerte (`string`, `number`, `boolean`) funktioniert das, weil dieselbe primitive Wert-Identität gilt — solange du den Wert aus der App-Instanz heraus übergibst:

```js
client._bind_edit(this.username);          // ✓ findet "username"
client._bind_edit("Alice");                // ✗ matched zwar (Wert ist "Alice"),
                                           //   ABER: die Engine durchläuft alle Felder,
                                           //   und das ERSTE mit Wert "Alice" gewinnt
                                           //   → unzuverlässig
```

Für **Objekte und Arrays** ist es eindeutig:

```js
this.users = [...];
client._bind_edit(this.users);             // ✓ findet "users" (Array-Identity)
```

::: warning Mehrere Felder mit gleichem Default
Wenn zwei Felder beide `""` als Initialwert haben, weiß die Engine nicht, welches du meinst:

```js
class app extends z2ui5_if_app {
  first_name = "";
  last_name  = "";
  /* ... */
  client._bind_edit(this.last_name);       // → matched 'first_name'!
}
```

**Lösung:** unterschiedliche Defaults setzen (auch ein Leerzeichen reicht), oder _explizit_ den Pfad mitgeben:

```js
client._bind_edit(this.last_name, { path: "last_name" });
```
:::

## Was passiert auf der Wire?

Eine cap2UI5-Response enthält ein `MODEL`-Objekt, das im JSONModel des Frontends als **Default-Modell** gesetzt wird. Es hat zwei Bereiche:

```json
{
  "MODEL": {
    "users": [/* ... */],          // ← One-way-Bindings (top level)
    "title": "Hello",
    "XX": {
      "username": "Alice",         // ← Two-way-Bindings (XX namespace)
      "is_active": true
    }
  }
}
```

Wenn der User in einem `Input` tippt, schreibt UI5 den Wert nach `/XX/username` zurück. Beim nächsten Roundtrip schickt das Frontend ein **XX-Delta** mit allen geänderten Werten an den Server. Die Server-Engine (`z2ui5_cl_core_srv_model.main_json_to_attri`) wendet dieses Delta auf die deserialisierte App-Instanz an, **bevor** `main()` aufgerufen wird — heißt: in `main()` ist `this.username` bereits der vom User getippte neue Wert.

## Optionen

```js
client._bind_edit(value, opts);
```

| Option | Bedeutung |
|---|---|
| `path: true` | gibt den **rohen Pfad** zurück (`"/XX/username"`), nicht in `{...}` gewrappt |
| `path: "myField"` | überspringt das Reference-Lookup, nimmt den angegebenen Pfad |
| `custom_mapper: ".fmt"` | Formatter-Funktionsname → Output: `{path: '...', formatter: '.fmt'}` |
| `custom_mapper_back: ".fmtBack"` | Reverse-Formatter (Two-way only) |
| `view: "POPUP"` | Ziel-View — selten nötig |

Beispiele:

```js
// Roher Pfad für relative Bindings (Tabellen-Items)
const tabPath = client._bind_edit(this.users, { path: true });
// "/XX/users"

// Innerhalb der Tabellen-Item-Struktur sind Felder relativ:
view.Table({ items: client._bind_edit(this.users) })
  .Column()
    .Text({ text: "{name}" });   // ← '{name}' relativ zum Item
```

## Lokale Bindings

Manchmal willst du eine View-interne Variable, die _nicht_ als App-Property leben soll:

```js
client._bind_local(initialValue);   // → "{/__local_3}"
```

Erzeugt einen anonymen Pfad mit dem gegebenen Initialwert. Sinnvoll für visuelle Hilfsstates, die der Server nie braucht.

## Auf Klicks reagieren: `_event`

Bindings sind eine Hälfte; die andere ist `_event`:

```js
view.Button({ text: "Save", press: client._event("BUTTON_SAVE") });
```

`_event(name)` baut den UI5-Press-Handler-String zusammen, der das Event über den Roundtrip zurück an den Server schickt. Das eigentliche `BUTTON_SAVE` siehst du dann in `client.get().EVENT`.

→ Mehr unter [Events](./events).

## Frontend-Only-Events: `_event_client`

Wenn das Event **nur im Frontend** ablaufen soll (kein Server-Roundtrip):

```js
view.Button({
  press: client._event_client(client.cs_event.OPEN_NEW_TAB, ["https://sap.com"])
});
```

Der Frontend-Handler dispatched es lokal. Sehr ähnlich zu `client.open_new_tab()`, das aber den Roundtrip beendet — der Unterschied: `_event_client` macht es _bei einem Klick_, `open_new_tab` macht es _als Nebenwirkung dieses Roundtrips_.

→ Liste aller `cs_event`-Konstanten in [API: client](../api/client).

## Beispiel: Komplette Form

```js
class profile extends z2ui5_if_app {

  first_name = " ";    // ← unterschiedliche Defaults, damit Lookup eindeutig ist
  last_name  = "  ";
  email      = "";
  active     = false;
  validation = { email_state: "None", email_text: "" };

  async main(client) {

    if (client.check_on_init()) this.render(client);

    if (client.check_on_event("SAVE")) {
      if (!this.email.includes("@")) {
        this.validation.email_state = "Error";
        this.validation.email_text  = "Bitte gültige E-Mail eingeben";
      } else {
        client.message_toast_display("Gespeichert");
      }
      this.render(client);
    }
  }

  render(client) {
    const view = z2ui5_cl_xml_view.factory();
    view.Page({ title: "Profil" })
      .SimpleForm({ editable: true })
        .content()
          .Label({ text: "Vorname"  }).Input({ value: client._bind_edit(this.first_name) })
          .Label({ text: "Nachname" }).Input({ value: client._bind_edit(this.last_name) })
          .Label({ text: "E-Mail"   }).Input({
              value:          client._bind_edit(this.email),
              valueState:     client._bind(this.validation.email_state),
              valueStateText: client._bind(this.validation.email_text)
            })
          .Label({ text: "Aktiv"    }).CheckBox({ selected: client._bind_edit(this.active) })
          .Button({ text: "Speichern", press: client._event("SAVE"), type: "Emphasized" });
    client.view_display(view.stringify());
  }
}
```

→ Weiter mit [**Events**](./events).
