// Where things are in a carousel track, in physical pixels along x, and the
// scrolls that move them. Physical distances work the same left to right
// and right to left, where scrollLeft runs negative.

/**
 * How far `el` is from its snap position in the track: scrolling the track by
 * this much snaps it. Reads the slide's `scroll-snap-align` and margins and
 * the track's scroll padding.
 */
export function offsetOf(track: HTMLElement, el: HTMLElement): number {
  const style = getComputedStyle(track)
  const own = getComputedStyle(el)
  const box = track.getBoundingClientRect()
  const rect = el.getBoundingClientRect()
  const rtl = style.direction === "rtl"

  const origin = box.left + track.clientLeft
  const width = track.clientWidth
  const left = origin + px(style.scrollPaddingLeft, width)
  const right = origin + width - px(style.scrollPaddingRight, width)

  const start = rect.left - px(own.scrollMarginLeft)
  const end = rect.right + px(own.scrollMarginRight)
  const align = own.scrollSnapAlign.trim().split(/\s+/).at(-1)

  if (align === "center") return (start + end) / 2 - (left + right) / 2

  if (align === "end") return rtl ? start - left : end - right

  return rtl ? end - right : start - left
}

/** Whether `el` is in its snap position, or as close as the track can scroll. */
export function reached(track: HTMLElement, el: HTMLElement): boolean {
  const offset = offsetOf(track, el)

  if (Math.abs(offset) < 1) return true

  const max = maxScroll(track)
  const rtl = getComputedStyle(track).direction === "rtl"
  const low = rtl ? -max : 0
  const high = rtl ? 0 : max

  return offset > 0 ? track.scrollLeft >= high - 1 : track.scrollLeft <= low + 1
}

/**
 * The first snap position ahead of the scroll position, as a touch flick
 * finds it: `direction` 1 needs a larger scrollLeft, -1 a smaller one.
 */
export function ahead(
  track: HTMLElement,
  direction: 1 | -1
): HTMLElement | undefined {
  let best: HTMLElement | undefined
  let distance = Infinity

  for (const el of track.children) {
    if (!(el instanceof HTMLElement)) continue

    const d = offsetOf(track, el) * direction

    if (d > 1 && d < distance) {
      distance = d
      best = el
    }
  }

  return best
}

/** The element next to `el` in the track, in DOM order. */
export const sibling = (
  el: HTMLElement,
  direction: 1 | -1
): HTMLElement | undefined => {
  const next = direction > 0 ? el.nextElementSibling : el.previousElementSibling

  return next instanceof HTMLElement ? next : undefined
}

/** Whether the track has a size; a hidden one (display: none) has none. */
export const measurable = (track: HTMLElement): boolean => track.clientWidth > 0

export const maxScroll = (track: HTMLElement): number =>
  Math.max(0, track.scrollWidth - track.clientWidth)

export const atStart = (track: HTMLElement): boolean =>
  Math.abs(track.scrollLeft) <= 1

export const atEnd = (track: HTMLElement): boolean =>
  Math.abs(track.scrollLeft) >= maxScroll(track) - 1

/** Scrolls by `left` pixels. jsdom has no Element.scrollBy. */
export function scrollByX(
  track: HTMLElement,
  left: number,
  behavior: ScrollBehavior
): void {
  if (left !== 0) track.scrollBy?.({ left, behavior })
}

/** An instant scroll to where the track is cancels a smooth one under way. */
export function stopScroll(track: HTMLElement): void {
  track.scrollTo?.({ left: track.scrollLeft, behavior: "instant" })
}

// A computed length in pixels. Scroll padding keeps percentages, which are
// of the scrollport's width (`basis`); `auto` counts as 0.
const px = (value: string, basis = 0): number => {
  const number = Number.parseFloat(value) || 0

  return value.trim().endsWith("%") ? (number * basis) / 100 : number
}
