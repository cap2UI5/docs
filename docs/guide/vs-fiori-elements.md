# cap2UI5 vs. Fiori Elements

CAP developers typically ask: **"Should I use Fiori Elements or cap2UI5?"** — This page gives you an honest comparison.

## At a glance

|  | Fiori Elements | cap2UI5 |
|---|---|---|
| UI language | XML + annotations + minimal JS | pure JavaScript |
| View definition | generated from CDS + annotations | programmed in the backend |
| State management | OData-bound JSONModel in the browser | app fields in the backend |
| Roundtrip model | OData GET/POST/PUT per action | single POST with event wire |
| Customization | via annotations + extensions | free-form JS code |
| Scaling | excellent for read-heavy | better for interactive UIs |
| Learning curve | OData + annotations + extensions | only the cap2UI5 API |
| Ideal when | standard CRUD lists | workflows, wizards, custom logic |

## Where Fiori Elements shines

✅ **List Reports and Object Pages with standard CRUD.** A SmartTable with filter, sort, personalization, variant management — done in 50 lines of annotations.
✅ **OData-driven use cases.** When your data is exposed as an OData service anyway, Fiori Elements works without an extra layer.
✅ **Consistency with other SAP apps.** End users know the patterns.
✅ **Read-heavy scenarios.** Server-side paging, column filtering, search — all solved in the OData driver, no roundtrip needed.
✅ **Internationalization & accessibility.** Very good by default.

## Where cap2UI5 is better

✅ **Highly interactive wizards.** A screen whose next field depends on the previous one, whose visibility logic is complex, that looks completely different depending on input — `main(client)` with `if`/`switch` is more natural than 200 lines of `@UI.Hidden` annotations.
✅ **State-driven UIs.** When the "state of the app" is more than "position in the list" — e.g. a three-step workflow, an approval flow, an assistant.
✅ **Apps without a CRUD service.** When you only need a "Start job" button and a status display, Fiori Elements is overkill.
✅ **Custom view compositions.** You want a table from source A, a chart from source B, and a status panel from source C in the same screen? In Fiori Elements that's extension hell. In cap2UI5 those are three `await`s in `main()`.
✅ **One-person projects.** No frontend build, no second `package.json`, no UI5 CLI update obligation.
✅ **Apps in cloud-restricted environments.** No client build → no build server needed for the UI.

## Where cap2UI5 falls short

❌ **Read-heavy lists with filter & sort over millions of rows.** Every filter is a roundtrip — with Fiori Elements that stays in the OData driver.
❌ **Variant management, personalization, adaptation.** Fiori Elements has it built in. In cap2UI5 you'd have to build it yourself.
❌ **Apps that need persisted filters across end users.** Both work, but Fiori Elements has it cheaper.
❌ **Special SAP patterns like Smart Templates, Object Page with sub-tabs from annotations.** Re-implementing these would be a lot of work.

## Hybrid approach

The two approaches are **not mutually exclusive**. In the same CAP project you can:

- Use **Fiori Elements** for the standard CRUD lists of an entity (e.g. Customer List).
- Use **cap2UI5** for the interactive edit wizard with validation logic (e.g. "New Customer Onboarding").
- Bind **both** through the same FLP tile configuration.

This works because neither needs anything from the other — Fiori Elements lives under `app/customer-list/`, cap2UI5 under `/rest/root/z2ui5`. They share the same CAP server, the same CDS services, the same auth.

## A rule of thumb

```
If the UI = list + detail + edit form     → Fiori Elements
If the UI = "it depends"                  → cap2UI5
```

If you can answer "should I show this field?" with an annotations edge case, take Fiori Elements. If you can only answer it with "if previously X, then Y, except in cases Z", cap2UI5 has the faster card.

→ Continue with [**cap2UI5 vs. abap2UI5**](./vs-abap2ui5).
