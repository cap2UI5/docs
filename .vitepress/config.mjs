import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'cap2UI5',
  description: 'Bringing the abap2UI5 concept to CAP / Node.js — server-driven UI5 apps written in pure JavaScript',
  lang: 'en-US',
  base: '/docs/',
  cleanUrls: true,
  lastUpdated: true,

  ignoreDeadLinks: [
    /^https?:\/\/localhost/,
    /\/LICENSE$/
  ],

  markdown: {
    languageAlias: {
      cds: 'js'
    }
  },

  head: [
    ['meta', { name: 'theme-color', content: '#1873B4' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'cap2UI5 — Server-driven UI5 for CAP' }],
    ['meta', { property: 'og:description', content: 'Build full UI5 applications from your CAP backend in JavaScript — no separate frontend project, no XML hand-crafting.' }]
  ],

  themeConfig: {
    siteTitle: 'cap2UI5',

    nav: [
      { text: 'Guide', link: '/guide/what-is-cap2ui5' },
      { text: 'Examples', link: '/examples/hello-world' },
      { text: 'API', link: '/api/client' },
      { text: 'Reference', link: '/reference/architecture' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub (dev)',  link: 'https://github.com/cap2UI5/dev' },
          { text: 'GitHub (docs)', link: 'https://github.com/cap2UI5/docs' },
          { text: 'abap2UI5',      link: 'https://github.com/abap2UI5/abap2UI5' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'What is cap2UI5?',     link: '/guide/what-is-cap2ui5' },
            { text: 'Why cap2UI5?',         link: '/guide/why-cap2ui5' },
            { text: 'Quickstart',           link: '/guide/getting-started' },
            { text: 'Project Structure',    link: '/guide/project-structure' }
          ]
        },
        {
          text: 'Concepts',
          items: [
            { text: 'App Lifecycle',        link: '/guide/lifecycle' },
            { text: 'View Builder',         link: '/guide/views' },
            { text: 'Data Binding',         link: '/guide/data-binding' },
            { text: 'Events',               link: '/guide/events' },
            { text: 'Navigation',           link: '/guide/navigation' },
            { text: 'Persistence & Sessions', link: '/guide/persistence' },
            { text: 'Popups & Toasts',      link: '/guide/popups' }
          ]
        },
        {
          text: 'Comparison',
          items: [
            { text: 'cap2UI5 vs. Fiori Elements', link: '/guide/vs-fiori-elements' },
            { text: 'cap2UI5 vs. abap2UI5',       link: '/guide/vs-abap2ui5' }
          ]
        }
      ],

      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Hello World',          link: '/examples/hello-world' },
            { text: 'Selection Screen',     link: '/examples/selection-screen' },
            { text: 'List & Detail',        link: '/examples/list' },
            { text: 'External OData Call',  link: '/examples/external-odata' },
            { text: 'Static XML View',      link: '/examples/static-xml-view' }
          ]
        }
      ],

      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'client',               link: '/api/client' },
            { text: 'View Builder',         link: '/api/view-builder' },
            { text: 'App Interface',        link: '/api/app-interface' }
          ]
        }
      ],

      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Architecture',         link: '/reference/architecture' },
            { text: 'HTTP Protocol',        link: '/reference/protocol' },
            { text: 'Database Model',       link: '/reference/database' },
            { text: 'Deployment',           link: '/reference/deployment' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/cap2UI5/dev' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 cap2UI5 contributors'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/cap2UI5/docs/edit/main/:path',
      text: 'Edit this page on GitHub'
    }
  }
})
