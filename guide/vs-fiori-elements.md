# cap2UI5 vs. Fiori Elements

CAP-Entwickler stellen sich typischerweise die Frage: **"Soll ich Fiori Elements nutzen oder cap2UI5?"** — Diese Seite gibt dir einen ehrlichen Vergleich.

## Auf einen Blick

|  | Fiori Elements | cap2UI5 |
|---|---|---|
| Sprache der UI | XML + Annotationen + minimal JS | reines JavaScript |
| View-Definition | aus CDS + Annotations generiert | im Backend programmiert |
| State-Management | OData-bound JSONModel im Browser | App-Felder im Backend |
| Roundtrip-Modell | OData GET/POST/PUT pro Aktion | Single POST mit Event-Wire |
| Customization | per Annotations + Extensions | freier JS-Code |
| Skalierung | hervorragend für read-heavy | für interaktive UI besser |
| Lernkurve | OData + Annotations + Extensions | nur cap2UI5-API |
| Wann ideal | Standard-CRUD-Listen | Workflows, Wizards, Custom-Logik |

## Wo Fiori Elements glänzt

✅ **List Reports und Object Pages mit Standard-CRUD.** Eine SmartTable mit Filter, Sort, Personalization, Variant Management — fertig in 50 Zeilen Annotations.
✅ **OData-getriebene Use-Cases.** Wenn deine Daten ohnehin als OData-Service exponiert sind, kommt Fiori Elements ohne extra Layer aus.
✅ **Konsistenz mit anderen SAP-Apps.** Endnutzer kennen die Patterns.
✅ **Read-heavy-Szenarien.** Server-Side-Paging, Column-Filtering, Search — alles im OData-Treiber gelöst, kein Roundtrip nötig.
✅ **Internationalisierung & Accessibility.** Per Default sehr gut.

## Wo cap2UI5 besser ist

✅ **Hochinteraktive Wizards.** Eine Maske, deren nächstes Feld vom vorigen abhängt, deren Visibility-Logik komplex ist, die je nach Eingabe komplett unterschiedlich aussieht — dafür ist `main(client)` mit `if`/`switch` natürlicher als 200 Zeilen `@UI.Hidden`-Annotations.
✅ **State-getriebene UIs.** Wenn der "Zustand der App" mehr ist als "Position in der Liste" — z.B. ein Drei-Schritt-Workflow, ein Approval-Flow, ein Assistent.
✅ **Apps ohne CRUD-Service.** Wenn du nur einen Knopf "Job starten" und ein Status-Display brauchst, ist Fiori Elements überdimensioniert.
✅ **Custom-View-Compositions.** Du willst eine Tabelle aus Source A, ein Chart aus Source B und ein Status-Panel aus Source C in derselben Maske? In Fiori Elements ist das eine Extension-Hölle. In cap2UI5 sind das drei `await`s in `main()`.
✅ **One-Person-Projects.** Kein Frontend-Build, kein zweites `package.json`, kein UI5-CLI-Update-Pflichtenheft.
✅ **Apps in cloud-restricted Environments.** Kein Client-Build → kein Build-Server für die UI nötig.

## Wo cap2UI5 unterlegen ist

❌ **Read-heavy Listen mit Filter & Sort über Millionen Rows.** Jeder Filter ist ein Roundtrip — bei Fiori Elements bleibt das im OData-Treiber.
❌ **Variant Management, Personalization, Adaptation.** Fiori Elements hat das eingebaut. In cap2UI5 müsstest du es selbst bauen.
❌ **Apps, die Endnutzer-übergreifend persistierte Filter brauchen.** Geht beides, aber Fiori Elements hat das billiger.
❌ **Spezielle SAP-Patterns wie Smart Templates, Object Page mit Sub-Tabs aus Annotations.** Der Re-Implement wäre viel Arbeit.

## Hybrid-Ansatz

Die zwei Ansätze schließen sich **nicht aus**. In demselben CAP-Projekt kannst du:

- **Fiori Elements** für die Standard-CRUD-Lists einer Entity (z.B. Customer-List).
- **cap2UI5** für den interaktiven Edit-Wizard mit Validierungs-Logik (z.B. "New Customer Onboarding").
- **Beide** über dieselbe FLP-Tile-Konfiguration anbinden.

Das funktioniert, weil beide nichts voneinander wollen — Fiori Elements lebt unter `app/customer-list/`, cap2UI5 unter `/rest/root/z2ui5`. Sie teilen sich denselben CAP-Server, dieselben CDS-Services, dieselbe Auth.

## Eine Faustregel

```
Wenn die UI = Liste + Detail + Edit-Form → Fiori Elements
Wenn die UI = "es kommt drauf an"        → cap2UI5
```

Wenn du die Frage "soll ich das Feld zeigen?" mit einem Annotations-Edge-Case beantworten kannst, nimm Fiori Elements. Wenn du sie nur mit "wenn vorher X, dann Y, außer in den Fällen Z" beantworten kannst, hat cap2UI5 die schnelle Karte.

→ Weiter mit [**cap2UI5 vs. abap2UI5**](./vs-abap2ui5).
