---
layout: home

hero:
  name: "cap2UI5"
  text: "Server-driven UI5 for CAP"
  tagline: >-
    A CAP plugin that hosts abap2UI5's own runtime. Write complete SAPUI5 apps
    as plain JavaScript classes in your CAP project — no separate frontend, no
    XML by hand, no manifest tuning.
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
  - title: One dependency, no scaffolding
    icon: 🔌
    details: >-
      npm i cap2ui5 is the whole installation. The roundtrip route, the UI5
      shell and the cap2ui5.Drafts entity arrive through cds-plugin.js — your
      own server.js is untouched, and nothing is generated into your repository.
  - title: Apps are plain JavaScript
    icon: 🟨
    details: >-
      defineApp("ZCL_HELLO", class { name = ""; main(c) { … } }) — synchronous,
      no async, no await, no ABAP. State is ordinary fields, and c.bind("name")
      binds one into the view.
  - title: It IS abap2UI5, not a copy of it
    icon: 🔗
    details: >-
      The backend is upstream's own ABAP, downported and transpiled over
      open-abap and shipped as @abap2ui5/runtime. Backend, frontend and wire
      version come from one commit, so drift is structurally impossible.
  - title: A guest in your CAP project
    icon: 🧩
    details: >-
      One authorization for both doors. The apps read and write through cds.ql
      like any handler, and a plain OData service beside them sees the same
      rows — proven by a coexistence test rather than asserted.
  - title: Sessions in your database
    icon: 💾
    details: >-
      App state lives in cap2ui5.Drafts, an ordinary CDS entity — same
      connection, same transaction, same authorization as everything else. Each
      draft answers to the user who created it and to nobody else.
  - title: Measured, not claimed
    icon: 📐
    details: >-
      14 ms per roundtrip. State survives SIGKILL, navigation stack included.
      Three users interleaved in one process, every answer to its owner.
      Rendered in real Chromium on every CI run.
---
