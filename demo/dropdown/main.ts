import type { SurfaceDropdown } from "../../src/dropdown/dropdown.js"

// ?fallback pretends the browser has no anchor positioning, so the JavaScript
// placement can be tried in browsers that have it.
const fallback = new URLSearchParams(location.search).has("fallback")

if (fallback) {
  const supports = CSS.supports.bind(CSS)
  CSS.supports = ((...args: [string, string?]) =>
    args[0].includes("anchor-name")
      ? false
      : supports(...(args as [string, string]))) as typeof CSS.supports
}

const { supportsAnchorPositioning } = await import("../../src/dropdown/position.js")
await import("../../src/dropdown/dropdown.js")

const { hud } = await import("../shared/hud.js")

// The real stylesheet still anchors natively, so drop its @supports block.
if (fallback) {
  for (const sheet of document.adoptedStyleSheets) {
    const layer = sheet.cssRules[0]

    if (!(layer instanceof CSSLayerBlockRule)) continue

    for (let i = layer.cssRules.length - 1; i >= 0; i--) {
      if (layer.cssRules[i] instanceof CSSSupportsRule) layer.deleteRule(i)
    }
  }

  const link = document.querySelector<HTMLAnchorElement>("[data-fallback-link]")
  if (link) {
    link.href = "?"
    link.textContent = "Back to anchor positioning"
  }
}

const products = document.querySelector<SurfaceDropdown>("#products")

document.addEventListener("click", (event) => {
  const action = (event.target as Element).closest<HTMLElement>("[data-action]")
    ?.dataset["action"]

  if (!products || !action) return

  // Past the light dismiss this same click triggers.
  setTimeout(() => {
    if (action === "show") products.show()
    if (action === "close") products.close()
    if (action === "toggle") products.toggle()
  })
})

hud(() => ({
  positioning: supportsAnchorPositioning() ? "CSS (anchor)" : "JS (fallback)",
  "can hover": matchMedia("(hover: hover) and (pointer: fine)").matches,
  open:
    [...document.querySelectorAll<SurfaceDropdown>("surface-dropdown")]
      .filter((el) => el.open)
      .map((el) => el.trigger?.textContent)
      .join(" › ") || "-",
  focus: document.activeElement?.textContent?.trim().slice(0, 24) ?? "-",
}))
