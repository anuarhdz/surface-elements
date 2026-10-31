import { CLONE, CURRENT } from "./attributes.js"

/**
 * Copies of `slides` from `start` to `end` (exclusive), for the ends of a
 * looping track. Each is inert, hidden from assistive technology, marked with
 * the index of the slide it copies, and unable to clash with the original.
 */
export const copies = (
  slides: HTMLElement[],
  start: number,
  end: number
): HTMLElement[] =>
  slides.slice(start, end).map((slide, i) => cloneSlide(slide, start + i))

/** The index of the slide `el` copies, or undefined for a slide itself. */
export function copiedIndex(el: Element): number | undefined {
  const copied = el.getAttribute(CLONE)

  return copied === null ? undefined : Number(copied)
}

function cloneSlide(slide: HTMLElement, index: number): HTMLElement {
  // SAFETY: a deep clone of an HTMLElement is an HTMLElement of the same type.
  const clone = slide.cloneNode(true) as HTMLElement
  clone.setAttribute(CLONE, String(index))
  clone.setAttribute("aria-hidden", "true")
  clone.inert = true
  clone.removeAttribute(CURRENT)

  for (const el of within(clone, "[id]")) el.removeAttribute("id")

  // A copied checked radio or open <details name> would steal its group.
  for (const el of within(clone, "[name]")) el.removeAttribute("name")

  for (const el of within(clone, "input, select, textarea, button")) {
    el.setAttribute("disabled", "")
  }

  for (const media of within(clone, "video, audio")) {
    media.removeAttribute("autoplay")
  }

  return clone
}

// `root` and its descendants that match `selector`.
const within = (root: Element, selector: string): Element[] => [
  ...(root.matches(selector) ? [root] : []),
  ...root.querySelectorAll(selector),
]
