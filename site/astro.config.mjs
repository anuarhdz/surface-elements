import { fileURLToPath } from "node:url"
import starlight from "@astrojs/starlight"
import { defineConfig } from "astro/config"

// Demos run the library from source, so the docs always show the current code.
// The root package.json only declares side effects for dist/, so mark the
// source modules explicitly or the element registrations get tree-shaken.
const librarySource = {
  name: "surface-elements-source",
  enforce: "pre",
  resolveId(id) {
    const match = /^surface-elements(?:\/(.+))?$/.exec(id)
    if (!match) return null
    const path = match[1] ? `${match[1]}/${match[1]}.ts` : "index.ts"
    return {
      id: fileURLToPath(new URL(`../src/${path}`, import.meta.url)),
      moduleSideEffects: true,
    }
  },
}

export default defineConfig({
  site: "https://surface-elements-docs.iniciatico.workers.dev",
  integrations: [
    starlight({
      title: "surface-elements",
      description:
        "Vanilla web components and utilities for common interface surfaces.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/anuarhdz/surface-elements",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/anuarhdz/surface-elements/edit/main/site/",
      },
      customCss: ["./src/styles/demo.css"],
      sidebar: [
        {
          label: "Start here",
          items: ["getting-started"],
        },
        {
          label: "Components",
          items: ["components/dialog-drawer", "components/header-sticky"],
        },
        {
          label: "Functions",
          items: ["functions/dialog", "functions/scroll-lock"],
        },
        {
          label: "Guides",
          items: ["guides/styling", "guides/browser-support"],
        },
      ],
    }),
  ],
  vite: {
    plugins: [librarySource],
  },
})
