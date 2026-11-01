/** Devices with a primary pointer that can really hover. */
const HOVER_QUERY = "(hover: hover) and (pointer: fine)"

/** Time on the dropdown before it opens, so passing over it does nothing. */
export const HOVER_OPEN_DELAY = 50

/** Time off the dropdown before it closes, enough to cross a gap or a corner. */
export const HOVER_CLOSE_DELAY = 200

interface HoverActions {
  open: () => void
  close: () => void
}

/**
 * Opens and closes on mouse hover while `host` has the `hover` attribute.
 *
 * The media query says what the device can do and `pointerType` what is in use
 * now. A touch laptop passes the query, and a touch on it sends `pointerenter`
 * and then `click`, which would open and at once close the dropdown. Both are
 * read per event, so the attribute and a mouse plugged in later just work.
 * Returns a function that stops watching.
 */
export function watchHover(
  host: HTMLElement,
  actions: HoverActions
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined

  const applies = (event: PointerEvent): boolean =>
    event.pointerType === "mouse" &&
    host.hasAttribute("hover") &&
    matchMedia(HOVER_QUERY).matches

  const onEnter = (event: PointerEvent): void => {
    if (!applies(event)) return

    clearTimeout(timer)
    timer = setTimeout(actions.open, HOVER_OPEN_DELAY)
  }

  const onLeave = (event: PointerEvent): void => {
    if (!applies(event)) return

    clearTimeout(timer)
    timer = setTimeout(() => {
      // Keyboard focus inside keeps it open: the reader is still in there.
      if (host.querySelector(":focus-visible") === null) actions.close()
    }, HOVER_CLOSE_DELAY)
  }

  host.addEventListener("pointerenter", onEnter)
  host.addEventListener("pointerleave", onLeave)

  return () => {
    clearTimeout(timer)
    host.removeEventListener("pointerenter", onEnter)
    host.removeEventListener("pointerleave", onLeave)
  }
}
