import {
  isScrollLocked,
  supportsClosedBy,
  supportsTopLayerExit,
  type SurfaceDrawer,
} from "../src/index.js"

// Invoker commands polyfill, only where missing. Not bundled by the library.
const hasInvokers = "commandForElement" in HTMLButtonElement.prototype
if (!hasInvokers) {
  const polyfill = "https://esm.run/invokers-polyfill"
  void import(/* @vite-ignore */ polyfill)
}

const $ = <T extends Element>(selector: string): T => {
  const el = document.querySelector<T>(selector)
  if (!el) throw new Error(`Missing ${selector}`)
  return el
}

// Element API
const menu = $<SurfaceDrawer>("#menu-drawer")
const cart = $<SurfaceDrawer>("surface-drawer:has(> #cart)")

document.addEventListener("click", (event) => {
  const action = (event.target as Element).closest<HTMLElement>("[data-action]")
    ?.dataset["action"]
  switch (action) {
    case "show-menu":
      menu.show()
      break
    case "toggle-menu":
      menu.toggle()
      break
    case "auto-close":
      cart.show()
      setTimeout(() => void cart.close("timeout"), 2000)
      break
    case "toggle-dir": {
      const html = document.documentElement
      html.dir = html.dir === "rtl" ? "ltr" : "rtl"
      log(`dir=${html.dir}`)
      break
    }
  }
})

// Content
const fill = (selector: string, count: number, label: string) => {
  $(selector).append(
    ...Array.from({ length: count }, (_, i) => {
      const li = document.createElement("li")
      li.textContent = `${label} ${i + 1}`
      return li
    })
  )
}
fill("#cart-items", 25, "Producto")
fill("#sheet-items", 30, "Filtro")

$(".filler").append(
  ...Array.from({ length: 40 }, (_, i) => {
    const article = document.createElement("article")
    const h3 = document.createElement("h3")
    const p = document.createElement("p")
    h3.textContent = `Bloque ${i + 1}`
    p.textContent =
      "Contenido de relleno para que la página tenga scroll de sobra en mobile y desktop."
    article.append(h3, p)
    return article
  })
)

// Support
const support: [string, boolean][] = [
  ["Invoker commands nativos (commandfor)", hasInvokers],
  ['closedby="any" nativo', supportsClosedBy()],
  ["Salida animada del top layer nativa (overlay)", supportsTopLayerExit()],
  [":state() en custom elements", "CustomStateSet" in window],
]
$("#support").append(
  ...support.map(([label, ok]) => {
    const li = document.createElement("li")
    li.textContent = `${ok ? "✅" : "⚠️ fallback"} ${label}`
    return li
  })
)

// Event log
const logEl = $<HTMLElement>("#log")
function log(message: string) {
  const line = document.createElement("div")
  line.textContent = `${new Date().toLocaleTimeString()}  ${message}`
  logEl.prepend(line)
}

for (const dialog of document.querySelectorAll("dialog")) {
  dialog.addEventListener("close", () =>
    log(`#${dialog.id} close returnValue="${dialog.returnValue}"`)
  )
  dialog.addEventListener("cancel", () => log(`#${dialog.id} cancel`))
  new MutationObserver(() => {
    if (dialog.open) log(`#${dialog.id} open`)
  }).observe(dialog, { attributes: true, attributeFilter: ["open"] })
}

// Live status
const status = $<HTMLOutputElement>("#status")
const renderStatus = () => {
  const html = document.documentElement
  status.textContent = [
    `scrollY   ${Math.round(window.scrollY)}`,
    `locked    ${isScrollLocked()}`,
    `overflow  ${html.style.overflow || "-"}`,
    `gutter    ${html.style.getPropertyValue("scrollbar-gutter") || "-"}`,
  ].join("\n")
  requestAnimationFrame(renderStatus)
}
renderStatus()
