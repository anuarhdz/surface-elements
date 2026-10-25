import "../../../src/header/header.js"
import type { SurfaceHeader } from "../../../src/header/header.js"
import { hud } from "../../shared/hud.js"

const el = document.querySelector<SurfaceHeader>("surface-header")
if (!el) throw new Error("Missing surface-header")

const button = document.querySelector<HTMLButtonElement>("[data-action=hold]")
let release: (() => void) | undefined

button?.addEventListener("click", () => {
  if (release) {
    release()
    release = undefined
  } else {
    release = el.hold()
  }
  button.textContent = release ? "release()" : "hold()"
})

hud(() => ({
  scrollY: Math.round(window.scrollY),
  stuck: el.matches(":state(stuck)"),
  hidden: el.matches(":state(hidden)"),
  held: release !== undefined,
  height:
    document.documentElement.style.getPropertyValue("--surface-header-height") || "-",
}))
