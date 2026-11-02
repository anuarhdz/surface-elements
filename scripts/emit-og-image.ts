// Renders site/public/og.png, the social preview of the docs site, from
// scripts/og-image.html. The element list comes from the component pages, so
// rerun it when a component is added. Not part of the build: the image is
// committed, and rendering needs Playwright's Chromium.
import { readdirSync } from "node:fs"
import { pathToFileURL } from "node:url"

import { chromium } from "playwright"

const TEMPLATE = pathToFileURL("scripts/og-image.html").href
const OUT = "site/public/og.png"

const tags = readdirSync("site/src/content/docs/components")
  .filter((file) => file.endsWith(".mdx"))
  .map((file) => `<surface-${file.replace(/\.mdx$/, "")}>`)
  .toSorted()

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
})

await page.goto(TEMPLATE)
await page.evaluate((tags) => {
  const list = document.getElementById("elements")!
  list.replaceChildren(
    ...tags.map((tag) => {
      const item = document.createElement("li")
      item.textContent = tag
      return item
    })
  )
}, tags)
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: OUT })
await browser.close()

process.stdout.write(`Wrote ${OUT}\n`)
