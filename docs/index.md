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
      text: Try it in the browser
      link: https://cap2ui5.github.io/web-cap2UI5-build/
    - theme: alt
      text: What is cap2UI5?
      link: /guide/what-is-cap2ui5

features:
  - title: Pure JavaScript apps
    details: Define view, state and behavior in a single JS class inside srv/. No tooling overhead, no UI5 build, no duplicated data modeling.
    icon: 🟨
  - title: Born from abap2UI5
    details: The proven abap2UI5 concept, ported to CAP — same frontend, same protocol, kept in sync automatically by an ABAP→JS transpiler pipeline.
    icon: 🔗
  - title: Automatic data binding
    details: client._bind(this.field) finds the property by reference equality on the app instance — no model boilerplate. On the pinned 1.142.0 core, _bind_edit is the two-way variant.
    icon: 🔄
  - title: Native CAP integration
    details: The roundtrip runs as a CDS REST action. CAP services, OData connections, auth, destinations — everything remains available.
    icon: 🧩
  - title: Stateful sessions included
    details: Apps are persisted between roundtrips (CDS entity z2ui5_t_01). Navigation stack, draft history, and popup results out of the box.
    icon: 💾
  - title: A live sample for every feature
    details: The transpiled abap2UI5 demo collection ships in core/srv/app/samples/ — and runs zero-install in the browser playground on GitHub Pages.
    icon: 🎨
    link: /guide/samples
    linkText: Browse the sample catalogue
---
