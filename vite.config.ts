import { globSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { defineConfig, type Plugin } from "vite"

const root = fileURLToPath(new URL("demo", import.meta.url))
const src = fileURLToPath(new URL("src/", import.meta.url))

// The root package.json only declares side effects for dist/, so the build
// would tree-shake the element registrations out of the source modules.
const librarySideEffects: Plugin = {
  name: "surface-elements-side-effects",
  enforce: "pre",
  async resolveId(source, importer, options) {
    const resolved = await this.resolve(source, importer, options)

    return resolved?.id.startsWith(src)
      ? { ...resolved, moduleSideEffects: true }
      : resolved
  },
}

// Every demo/**/index.html is a playground page, served at /playground/<dir>/.
const pages = Object.fromEntries(
  globSync("**/index.html", { cwd: root }).map((file) => [
    file.replace(/\/?index\.html$/, "") || "index",
    `${root}/${file}`,
  ])
)

export default defineConfig({
  root,
  base: "/playground/",
  plugins: [librarySideEffects],
  server: {
    open: true,
  },
  // Built into the docs Worker's assets, after `astro build` fills site/dist.
  build: {
    outDir: "../site/dist/playground",
    emptyOutDir: true,
    rollupOptions: { input: pages },
  },
})
