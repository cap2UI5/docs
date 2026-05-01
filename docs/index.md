---
layout: home

hero:
  name: "cap2UI5"
  text: "Server-driven UI5 for CAP"
  tagline: Build complete SAPUI5 apps directly from your CAP backend in JavaScript — no separate frontend project, no hand-crafted XML, no manifest tuning.
  image:
    src: /logo.jpeg
    alt: cap2UI5
  actions:
    - theme: brand
      text: Quickstart
      link: /guide/getting-started
    - theme: alt
      text: What is cap2UI5?
      link: /guide/what-is-cap2ui5

features:
  - title: Pure JavaScript apps
    details: Define view, state and behavior in a single JS class. No tooling overhead, no UI5 build, no duplicated data modeling.
    icon: 🟨
  - title: Wire-format compatible with abap2UI5
    details: Uses the same static UI5 frontend as abap2UI5. A single roundtrip endpoint, the same protocol, the same custom control set.
    icon: 🔗
  - title: Automatic data binding
    details: client._bind_edit(this.field) finds the property by reference equality on the app instance. Two-way binding without model boilerplate.
    icon: 🔄
  - title: Native CAP integration
    details: The roundtrip runs as a CDS REST action. CAP services, OData connections, auth, destinations — everything remains available.
    icon: 🧩
  - title: Stateful sessions included
    details: Apps are persisted between roundtrips (CDS entity z2ui5_t_01). Navigation stack, draft history, and popup results out of the box.
    icon: 💾
  - title: Complete UI5 control set
    details: Page, Table, SimpleForm, Dialog, ChartJS, FileUploader, Geolocation, Camera — the builder can do anything UI5 ships.
    icon: 🎨
---
