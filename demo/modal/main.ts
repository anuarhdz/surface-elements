import "../../src/modal/modal.js"
import type { SurfaceModal } from "../../src/modal/modal.js"
import { supportsClosedBy, supportsTopLayerExit } from "../../src/dialog/dialog.js"
import { isScrollLocked } from "../../src/scroll-lock/scroll-lock.js"
import { hud } from "../shared/hud.js"

// Invoker commands polyfill, only where missing. Not bundled by the library.
if (!("commandForElement" in HTMLButtonElement.prototype)) {
  const polyfill = "https://esm.run/invokers-polyfill"
  void import(/* @vite-ignore */ polyfill)
}

const mediumModal = document.querySelector<SurfaceModal>("surface-modal:has(> #size-medium)")
let lastReturn = "-"

document.addEventListener("click", (event) => {
  const action = (event.target as Element).closest<HTMLElement>(
    "[data-action]"
  )?.dataset["action"]

  switch (action) {
    case "toggle":
      mediumModal?.toggle()
      break
    case "auto-close":
      mediumModal?.show()
      setTimeout(() => void mediumModal?.close("timeout"), 2000)
      break
  }
})

document.addEventListener(
  "close",
  (event) => {
    const dialog = event.target

    if (dialog instanceof HTMLDialogElement) {
      lastReturn = `#${dialog.id} "${dialog.returnValue}"`
    }
  },
  true
)

// Pointer trail on open dialogs, to debug light dismiss on touch devices.
let lastPointer = "-"
for (const type of ["pointerdown", "pointerup", "pointercancel", "click"]) {
  document.addEventListener(
    type,
    (event) => {
      const { target, clientX, clientY } = event as PointerEvent

      if (!(target instanceof HTMLDialogElement)) return
      const rect = target.getBoundingClientRect()
      const outside =
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      lastPointer = `${type} ${Math.round(clientX)},${Math.round(clientY)} ${outside ? "backdrop" : "dialog"}`
    },
    true
  )
}

for (const list of document.querySelectorAll<HTMLElement>(".items")) {
  list.append(
    ...Array.from({ length: Number(list.dataset["count"]) }, (_, i) => {
      const li = document.createElement("li")
      li.textContent = `Item ${i + 1}`

      return li
    })
  )
}

document.querySelector(".filler")?.append(
  ...Array.from({ length: 40 }, (_, i) => {
    const p = document.createElement("p")
    p.textContent = `Block ${i + 1}. Filler so the page scrolls behind the modal.`

    return p
  })
)

hud(() => {
  const open = document.querySelector<SurfaceModal>(
    "surface-modal:has(> dialog[open])"
  )

  return {
    open: open?.dialog?.id ?? "-",
    "state(open)": open?.matches(":state(open)") ?? false,
    size: open ? (open.getAttribute("size") ?? "medium") : "-",
    locked: isScrollLocked(),
    scrollY: Math.round(window.scrollY),
    returnValue: lastReturn,
    pointer: lastPointer,
    "closedby native": supportsClosedBy(),
    "exit native": supportsTopLayerExit(),
  }
})
