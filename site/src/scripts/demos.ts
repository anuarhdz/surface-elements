import {
  isScrollLocked,
  supportsClosedBy,
  supportsTopLayerExit,
  type SurfaceDrawer,
} from "surface-elements"
import "surface-elements/drawer"
import "surface-elements/header-sticky"

// Invoker commands polyfill, only where missing. The library does not ship it.
if (!("commandForElement" in HTMLButtonElement.prototype)) {
  void import("invokers-polyfill")
}

document.addEventListener("click", (event) => {
  const trigger = (event.target as Element).closest<HTMLElement>(
    "[data-action]"
  )
  if (!trigger) return
  const drawer = document.querySelector<SurfaceDrawer>(
    trigger.dataset["target"] ?? "surface-drawer"
  )
  switch (trigger.dataset["action"]) {
    case "show":
      drawer?.show()
      break
    case "toggle":
      drawer?.toggle()
      break
    case "auto-close":
      drawer?.show()
      setTimeout(() => void drawer?.close("timeout"), 2000)
      break
    case "toggle-dir": {
      const html = document.documentElement
      html.dir = html.dir === "rtl" ? "ltr" : "rtl"
      break
    }
  }
})

// Report the return value of every demo dialog next to its trigger.
document.addEventListener(
  "close",
  (event) => {
    const dialog = event.target
    if (!(dialog instanceof HTMLDialogElement)) return
    const output = document.querySelector(`output[for="${dialog.id}"]`)
    if (output) output.textContent = `returnValue: "${dialog.returnValue}"`
  },
  true
)

for (const el of document.querySelectorAll<HTMLElement>("[data-support]")) {
  const rows: [string, boolean][] = [
    ["closedby", supportsClosedBy()],
    ["top-layer exit transitions", supportsTopLayerExit()],
    ["invoker commands", "commandForElement" in HTMLButtonElement.prototype],
    [":state()", "CustomStateSet" in globalThis],
  ]
  el.replaceChildren(
    ...rows.map(([name, native]) => {
      const li = document.createElement("li")
      li.textContent = `${native ? "✓ native" : "✗ fallback"} — ${name}`
      return li
    })
  )
}

const lockStatus = document.querySelectorAll("[data-lock-status]")
if (lockStatus.length > 0) {
  const render = () => {
    for (const el of lockStatus) {
      el.textContent = `isScrollLocked(): ${isScrollLocked()}`
    }
  }
  new MutationObserver(render).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style"],
  })
  render()
}
