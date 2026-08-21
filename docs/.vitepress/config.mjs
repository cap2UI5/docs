import { defineConfig } from 'vitepress'

// Where the site is actually served from. Link previews (LinkedIn, Slack,
// WhatsApp, X) only accept ABSOLUTE urls in og:image — a relative
// "/docs/logo.jpeg" is silently dropped and the preview falls back to the
// grey placeholder card.
const SITE_URL = 'https://cap2ui5.github.io/docs'
const OG_IMAGE = `${SITE_URL}/logo.jpeg`

export default defineConfig({
  title: 'cap2UI5',
  description: 'Bringing the abap2UI5 concept to CAP / Node.js — server-driven UI5 apps written in pure JavaScript',
  lang: 'en-US',
  base: '/docs/',
  cleanUrls: true,
  lastUpdated: true,

  // Absolute URLs in sitemap.xml, same host as SITE_URL above — a search
  // engine reads the file from the deployed origin, so a relative base is
  // not enough to name a page.
  sitemap: {
    hostname: `${SITE_URL}/`
  },

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
    ['link', { rel: 'icon', type: 'image/jpeg', href: '/docs/logo.jpeg' }],
    ['link', { rel: 'apple-touch-icon', href: '/docs/logo.jpeg' }],
    ['meta', { name: 'theme-color', content: '#d03c4a' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'cap2UI5' }],
    ['meta', { property: 'og:url', content: `${SITE_URL}/` }],
    ['meta', { property: 'og:title', content: 'cap2UI5 — Server-driven UI5 for CAP' }],
    ['meta', { property: 'og:description', content: 'Build full UI5 applications from your CAP backend in JavaScript — no separate frontend project, no XML hand-crafting.' }],
    ['meta', { property: 'og:image', content: OG_IMAGE }],
    ['meta', { property: 'og:image:type', content: 'image/jpeg' }],
    // The logo is square (790x790), so the preview is a thumbnail card, not a
    // wide banner — declaring the real size is what keeps it from being
    // cropped. A 1200x630 banner would earn the large card; there is none yet.
    ['meta', { property: 'og:image:width', content: '790' }],
    ['meta', { property: 'og:image:height', content: '790' }],
    ['meta', { property: 'og:image:alt', content: 'cap2UI5 — server-driven UI5 for CAP' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:image', content: OG_IMAGE }]
  ],

  themeConfig: {
    siteTitle: 'cap2UI5',

    nav: [
      { text: 'Guide', link: '/guide/what-is-cap2ui5' },
      { text: 'Examples', link: '/examples/hello-world' },
      { text: 'API', link: '/api/client' },
      { text: 'Reference', link: '/reference/architecture' },
      { text: 'Playground', link: 'https://cap2ui5.github.io/web-cap2UI5-build/' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub (cap2UI5)',     link: 'https://github.com/cap2UI5/cap2UI5' },
          { text: 'GitHub (builder-cap2UI5-web)', link: 'https://github.com/cap2UI5/builder-cap2UI5-web' },
          { text: 'GitHub (docs)',        link: 'https://github.com/cap2UI5/docs' },
          { text: 'abap2UI5',             link: 'https://github.com/abap2UI5/abap2UI5' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'What is cap2UI5?',            link: '/guide/what-is-cap2ui5' },
            { text: 'Why cap2UI5?',                link: '/guide/why-cap2ui5' },
            { text: 'Try It in the Browser',       link: '/guide/playground' },
            { text: 'Quickstart',                  link: '/guide/getting-started' },
            { text: 'Project Structure',           link: '/guide/project-structure' },
            { text: 'Sample Catalogue',            link: '/guide/samples' }
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
          text: 'Working With It',
          items: [
            { text: 'Developer Tools',      link: '/guide/devtools' },
            { text: 'The User Exit',        link: '/guide/user-exit' },
            { text: 'Troubleshooting',      link: '/guide/troubleshooting' }
          ]
        },
        {
          text: 'Comparison',
          items: [
            { text: 'cap2UI5 vs. Fiori Elements', link: '/guide/vs-fiori-elements' },
            { text: 'cap2UI5 vs. abap2UI5',       link: '/guide/vs-abap2ui5' },
            { text: 'Migrating from abap2UI5',    link: '/guide/migration-from-abap2ui5' }
          ]
        },
        {
          text: 'Background',
          items: [
            { text: 'Where cap2UI5 Comes From',   link: '/guide/where-it-comes-from' },
            { text: 'The Ecosystem',              link: '/guide/ecosystem' },
            { text: 'Roadmap',                    link: '/guide/roadmap' }
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
            { text: 'Configuration',        link: '/reference/configuration' },
            { text: 'Deployment',           link: '/reference/deployment' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/cap2UI5/cap2UI5' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 cap2UI5 contributors'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/cap2UI5/docs/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  }
})
