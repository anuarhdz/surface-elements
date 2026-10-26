import type { SurfaceAccordion } from "../../src/accordion/accordion.js"

// ?fallback pretends the browser cannot animate ::details-content, so the
// Web Animations fallback (Safari, Firefox) can be tried in Chromium too.
const fallback = new URLSearchParams(location.search).has("fallback")

if (fallback) {
  const supports = CSS.supports.bind(CSS)
  CSS.supports = ((...args: [string, string?]) =>
    args.join(" ").includes("interpolate-size") ||
    args[0].includes("::details-content")
      ? false
      : supports(...(args as [string, string]))) as typeof CSS.supports
}

const { supportsDetailsAnimation } = await import("../../src/accordion/accordion.js")
const { hud } = await import("../shared/hud.js")

// The real stylesheet still animates natively, so drop its @supports block.
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
    link.textContent = "Back to native CSS"
  }
}

document.querySelector("#long")?.append(
  ...Array.from({ length: 12 }, (_, i) => {
    const p = document.createElement("p")
    p.textContent = `Paragraph ${i + 1} of a long answer.`

    return p
  })
)

const slow = document.querySelector<SurfaceAccordion>("#slow")

document.addEventListener("click", (event) => {
  const action = (event.target as Element).closest<HTMLElement>("[data-action]")
    ?.dataset["action"]

  if (!slow || !action) return

  for (const item of slow.items) void slow.toggle(item, action === "expand")
})

hud(() => ({
  mode: supportsDetailsAnimation() ? "CSS (::details-content)" : "JS (Web Animations)",
  "faq open": [...document.querySelectorAll("#faq > details")]
    .map((d, i) => (d.hasAttribute("data-closing") ? `${i}↓` : d.hasAttribute("open") ? `${i}` : ""))
    .filter(Boolean)
    .join(" ") || "-",
  "persist locked": [...document.querySelectorAll("#persist > details > summary")]
    .findIndex((summary) => summary.getAttribute("aria-disabled") === "true" && summary.parentElement?.hasAttribute("open")),
  "reduced motion": matchMedia("(prefers-reduced-motion: reduce)").matches,
}))
