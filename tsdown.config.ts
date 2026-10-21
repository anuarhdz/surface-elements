import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "header-sticky/header-sticky": "src/header-sticky/header-sticky.ts",
    "dialog-drawer/dialog-drawer": "src/dialog-drawer/dialog-drawer.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: "es2022",
  outDir: "dist",
  platform: "browser",
})
