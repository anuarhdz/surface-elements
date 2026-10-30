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
      // Paint the right canvas before the CSS loads.
      head: [
        {
          tag: "meta",
          attrs: { name: "color-scheme", content: "dark light" },
        },
      ],
      editLink: {
        baseUrl: "https://github.com/anuarhdz/surface-elements/edit/main/site/",
      },
      components: {
        SiteTitle: "./src/components/site-title.astro",
        PageTitle: "./src/components/page-title.astro",
        Hero: "./src/components/hero.astro",
      },
      customCss: [
        "@fontsource-variable/inter/opsz.css",
        "@fontsource-variable/inter/opsz-italic.css",
        "@fontsource-variable/geist-mono",
        "@fontsource-variable/geist-mono/wght-italic.css",
        "./src/styles/theme.css",
        "./src/styles/demo.css",
      ],
      expressiveCode: {
        themes: ["min-dark", "min-light"],
        styleOverrides: {
          borderRadius: "0",
          borderColor: "var(--sl-color-gray-5)",
          codeFontFamily: "var(--__sl-font-mono)",
          codeFontSize: "var(--sl-text-code)",
          uiFontFamily: "var(--__sl-font-mono)",
          frames: {
            shadowColor: "transparent",
            editorActiveTabIndicatorTopColor: "var(--sl-color-accent)",
            editorActiveTabBackground: "var(--sl-color-gray-7)",
            editorTabBarBackground: "var(--sl-color-gray-6)",
            editorBackground: "var(--sl-color-gray-7)",
            terminalBackground: "var(--sl-color-gray-7)",
            terminalTitlebarBackground: "var(--sl-color-gray-6)",
            terminalTitlebarBorderBottomColor: "var(--sl-color-gray-5)",
            editorTabBarBorderBottomColor: "var(--sl-color-gray-5)",
          },
        },
      },
      sidebar: [
        {
          label: "Start here",
          items: ["getting-started"],
        },
        {
          label: "Components",
          items: [
            "components/accordion",
            "components/drawer",
            "components/header",
            "components/modal",
          ],
        },
        {
          label: "Functions",
          items: ["functions/dialog", "functions/scroll-lock"],
        },
        {
          label: "Guides",
          items: [
            "guides/without-installing",
            "guides/styling",
            "guides/browser-support",
          ],
        },
      ],
    }),
  ],
  vite: {
    plugins: [librarySource],
  },
})
