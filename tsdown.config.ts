import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "header/header": "src/header/header.ts",
    "dialog-drawer/dialog-drawer": "src/dialog-drawer/dialog-drawer.ts",
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
