interface ScrollLockState {
  locks: number
  unlock: (() => void) | undefined
}

// Lives on a global symbol, not in module scope, so copy files and the
// package share one counter when several of them run on the same page.
const STATE = Symbol.for("surface-elements.scroll-lock")

// SAFETY: only this module writes under the symbol, always this shape; a
// copy from another version must keep the same fields.
const state: ScrollLockState = ((
  globalThis as typeof globalThis & { [STATE]?: ScrollLockState }
)[STATE] ??= { locks: 0, unlock: undefined })

/**
 * Blocks page scroll by setting `overflow: hidden` on `<html>`. `<body>` is left
 * alone: hiding its overflow too would make it a scroll container and unstick
 * every `position: sticky` element on a scrolled page.
 * Ref-counted: the page unlocks when every caller has released its lock,
 * across every copy of this module on the page.
 * Returns an idempotent release function.
 */
export function lockScroll(): () => void {
  if (state.locks++ === 0) state.unlock = applyLock()

  let released = false

  return () => {
    if (released) return
    released = true

    if (--state.locks === 0) {
      state.unlock?.()
      state.unlock = undefined
    }
  }
}

/** Whether any caller currently holds a {@link lockScroll} lock. */
export function isScrollLocked(): boolean {
  return state.locks > 0
}

function applyLock(): () => void {
  const html = document.documentElement

  const previous = {
    htmlOverflow: html.style.getPropertyValue("overflow"),
    gutter: html.style.getPropertyValue("scrollbar-gutter"),
  }

  // Keep the space of a classic (non-overlay) scrollbar so the page does not
  // shift sideways when the scrollbar disappears.
  if (window.innerWidth - html.clientWidth > 0) {
    html.style.setProperty("scrollbar-gutter", "stable")
  }

  html.style.setProperty("overflow", "hidden")

  return () => {
    restore(html, "overflow", previous.htmlOverflow)
    restore(html, "scrollbar-gutter", previous.gutter)
  }
}

function restore(el: HTMLElement, property: string, value: string): void {
  if (value) el.style.setProperty(property, value)
  else el.style.removeProperty(property)
}
