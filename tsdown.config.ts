import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "header-sticky/header-sticky": "src/header-sticky/header-sticky.ts",
    "drawer/drawer": "src/drawer/drawer.ts",
    "dialog/dialog": "src/dialog/dialog.ts",
    "scroll-lock/scroll-lock": "src/scroll-lock/scroll-lock.ts",
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
