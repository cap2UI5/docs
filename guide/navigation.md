# Navigation

cap2UI5-Apps können untereinander navigieren — der Server führt einen **Stack** der App-Instanzen, sodass Forward- und Back-Navigation natürlich funktionieren.

## Forward: `nav_app_call(newApp)`

```js
if (client.check_on_event("OPEN_DETAILS")) {
  const detail = new my_detail_app();
  detail.id = this.selected_id;
  client.nav_app_call(detail);
}
```

Das **schiebt die aktuelle App auf den Stack** und macht `detail` zur neuen Hauptapp. Der Handler-Loop wird die `main()` von `detail` direkt im selben Roundtrip aufrufen — `check_on_init()` ist dort `true`.

## Back: `nav_app_leave()`

```js
if (client.check_on_event("CANCEL")) {
  client.nav_app_leave();
}
```

**Pop**t die oberste App vom Stack zurück. Wenn der Stack leer ist, fällt das Framework auf den Startup-App zurück.

Optional kannst du eine **explizite App** angeben, zu der du zurück willst:

```js
client.nav_app_leave(some_specific_app);
```

## Convenience: Page-Back-Button

Praktisch jede App will einen Page-Back-Button, der auf die vorherige App zurückspringt:

```js
view.Page({
  title:          "Detail",
  navButtonPress: client._event_nav_app_leave(),
  showNavButton:  client.check_app_prev_stack()
});
```

`_event_nav_app_leave()` baut ein Spezial-Event, das **das Framework abfängt** — deine `main()` sieht es nicht. Es führt direkt ein `nav_app_leave()` aus.

`check_app_prev_stack()` liefert `true`, wenn der Stack nicht leer ist — gut, um den Button nur zu zeigen, wenn er sinnvoll ist.

## Pop-Result: `get_app_prev()`

Das klassische Pattern: eine App öffnet einen "Selector", der eine Auswahl zurückliefert.

```js
// Hauptapp
if (client.check_on_event("PICK_USER")) {
  const picker = new user_picker();
  picker.search_term = this.search;
  client.nav_app_call(picker);
}

// nach Rückkehr aus Picker
if (client.check_on_navigated()) {
  const prev = client.get_app_prev();
  if (prev instanceof user_picker && prev.result?.confirmed) {
    this.selected_user = prev.result.user;
  }
}
```

`get_app_prev()` liefert die **gerade verlassene** App (nicht den Stack-Top). Sie ist nach einem Back-Nav für genau einen Roundtrip lesbar — danach wird sie verworfen.

## App-Home & App-Back

Zwei weitere Convenience-Methoden:

```js
client.nav_app_home();   // ← springt zum Startup, leert den Stack
client.nav_app_back();   // ← genau ein Pop, fällt auf Home zurück, wenn leer
```

Der Unterschied zu `nav_app_leave()`: `nav_app_back()` setzt zusätzlich das Flag `_navTargetIsLeave = true`, sodass der Stack-Pointer nicht erneut gepusht wird.

## Routing per URL

Du kannst per URL-Parameter direkt eine bestimmte App starten:

```
/rest/root/z2ui5?app_start=my_app_name
```

Das funktioniert über `factory_first_start` in `z2ui5_cl_core_action.js` — beim ersten Roundtrip ohne `S_FRONT.ID` schaut der Handler auf den Query-String, sucht die Klasse via RTTI und instanziiert sie.

## Browser-History

Wenn du den Verlauf an die Browser-History koppeln willst:

```js
client.set_push_state(true);
```

Pusht den aktuellen Server-Zustand in `history.pushState`. Damit funktioniert der Browser-Back-Button — er löst dann ein Reload mit der vorherigen `S_FRONT.ID` aus.

## Stack-Persistenz

Der Nav-Stack lebt über Roundtrips hinweg, weil:

1. Beim `db_save` der aktuellen App werden auch alle Apps im `_navStack` persistiert.
2. Ihre IDs werden in `oApp.__navStackIds` gespeichert.
3. Beim nächsten Load liest `_rehydrate_nav_stack` diese IDs und lädt die Stack-Apps neu.

Heißt: ein User kann den Browser refreshen, und der gesamte Navigation-Verlauf ist wiederhergestellt.

## Beispiel: Master-Detail mit Picker

```js
class my_master extends z2ui5_if_app {

  selected_user_id  = "";
  selected_username = "";

  async main(client) {
    if (client.check_on_init()) this.render(client);

    if (client.check_on_navigated()) {
      const prev = client.get_app_prev();
      if (prev instanceof my_user_picker && prev.confirmed) {
        this.selected_user_id  = prev.result_id;
        this.selected_username = prev.result_name;
      }
      this.render(client);
    }

    if (client.check_on_event("PICK")) {
      client.nav_app_call(new my_user_picker());
    }
  }

  render(client) { /* ... */ }
}
```

```js
class my_user_picker extends z2ui5_if_app {

  confirmed   = false;
  result_id   = "";
  result_name = "";

  async main(client) {
    if (client.check_on_init()) this.render(client);

    if (client.check_on_event("CONFIRM")) {
      this.confirmed   = true;
      this.result_id   = client.get_event_arg(1);
      this.result_name = client.get_event_arg(2);
      client.nav_app_leave();
    }

    if (client.check_on_event("CANCEL")) client.nav_app_leave();
  }

  render(client) { /* ... */ }
}
```

→ Weiter mit [**Persistenz & Sessions**](./persistence).
