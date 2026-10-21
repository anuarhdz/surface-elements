let locks = 0
let unlock: (() => void) | undefined

/**
 * Blocks page scroll by setting `overflow: hidden` on `<html>` and `<body>`.
 * Ref-counted: the page unlocks when every caller has released its lock.
 * Returns an idempotent release function.
 */
export function lockScroll(): () => void {
  if (locks++ === 0) unlock = applyLock()

  let released = false
  return () => {
    if (released) return
    released = true
    if (--locks === 0) {
      unlock?.()
      unlock = undefined
    }
  }
}

/** Whether any caller currently holds a {@link lockScroll} lock. */
export function isScrollLocked(): boolean {
  return locks > 0
}

function applyLock(): () => void {
  const html = document.documentElement
  const body = document.body
  const previous = {
    htmlOverflow: html.style.getPropertyValue("overflow"),
    bodyOverflow: body.style.getPropertyValue("overflow"),
    gutter: html.style.getPropertyValue("scrollbar-gutter"),
  }

  // Keep the space of a classic (non-overlay) scrollbar so the page does not
  // shift sideways when the scrollbar disappears.
  if (window.innerWidth - html.clientWidth > 0) {
    html.style.setProperty("scrollbar-gutter", "stable")
  }
  html.style.setProperty("overflow", "hidden")
  body.style.setProperty("overflow", "hidden")

  return () => {
    restore(html, "overflow", previous.htmlOverflow)
    restore(body, "overflow", previous.bodyOverflow)
    restore(html, "scrollbar-gutter", previous.gutter)
  }
}

function restore(el: HTMLElement, property: string, value: string): void {
  if (value) el.style.setProperty(property, value)
  else el.style.removeProperty(property)
}
