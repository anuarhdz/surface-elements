import "../../src/header/header.js"
import type { SurfaceHeader } from "../../src/header/header.js"
import { hud } from "../shared/hud.js"

const el = document.querySelector<SurfaceHeader>("surface-header")
if (!el) throw new Error("Missing surface-header")

document.querySelector("[data-action=toggle-hide]")?.addEventListener("click", () => {
  el.toggleAttribute("hide-on-scroll")
})

hud(() => ({
  scrollY: Math.round(window.scrollY),
  stuck: el.matches(":state(stuck)"),
  hidden: el.matches(":state(hidden)"),
  "hide-on-scroll": el.hasAttribute("hide-on-scroll"),
  height: document.documentElement.style.getPropertyValue("--surface-header-height") || "-",
}))
