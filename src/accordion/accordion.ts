import { defineElement } from "../utils/define.js"
import { adoptAccordionStyles } from "./styles.js"

/** Set on a `<details>` while it animates closed, before `open` goes away. */
export const CLOSING_ATTRIBUTE = "data-closing"

/**
 * Web component that animates the native `<details>` elements directly
 * inside it as they open and close. The `<details>` stay the source of
 * truth: open state lives in `open`, and a shared `name` makes them
 * exclusive (one open at a time), as in plain HTML. Adds the accordion styles
 * to the document, so no CSS import is needed.
 *
 * Where the browser can animate `::details-content` to `auto` (Chromium), the
 * styles do all the work. Elsewhere the web component animates the height and
 * the content's opacity with the Web Animations API, and keeps the closing
 * `<details>` open, marked with `data-closing`, until the animation ends.
 *
 * @tag surface-accordion
 * @slot - The `<details>` elements, as direct children.
 * @cssprop [--surface-accordion-duration=0.3s] - Open and close duration.
 * @cssprop [--surface-accordion-easing=ease] - Open and close easing.
 */
export class SurfaceAccordion extends HTMLElement {
  static readonly tagName = "surface-accordion"

  #animations = new WeakMap<HTMLDetailsElement, Animation[]>()
  // Names taken off closing items, so opening a sibling cannot cut them short.
  #names = new WeakMap<HTMLDetailsElement, string>()

  /** The direct child `<details>` elements. */
  get items(): HTMLDetailsElement[] {
    return [...this.querySelectorAll<HTMLDetailsElement>(":scope > details")]
  }

  /**
   * Opens or closes `item`, one of {@link SurfaceAccordion.items}, with the
   * animation. Without `force` it flips the current state. Resolves when the
   * animation ends or another toggle of the same item replaces it.
   */
  toggle(item: HTMLDetailsElement, force?: boolean): Promise<void> {
    const open = force ?? !isOpen(item)

    if (this.#animates()) return this.#animate(item, open)

    this.#finish(item, open)
    item.open = open

    return Promise.resolve()
  }

  connectedCallback(): void {
    adoptAccordionStyles()
    this.addEventListener("click", this.#onClick)
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.#onClick)

    for (const item of this.items) this.#finish(item, isOpen(item))
  }

  #onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || !this.#animates()) return

    const target = event.target

    if (!(target instanceof Element)) return

    const summary = target.closest("summary")
    const item = summary?.parentElement

    if (
      !(item instanceof HTMLDetailsElement) ||
      item.parentElement !== this ||
      item.querySelector(":scope > summary") !== summary
    ) {
      return
    }

    // Links and controls inside the summary keep their own behavior.
    if (target.closest("a, button, input, select, textarea, label") !== null) {
      return
    }

    event.preventDefault()
    void this.#animate(item, !isOpen(item))
  }

  // Only the fallback needs JavaScript; the styles animate where CSS can.
  #animates(): boolean {
    return (
      "animate" in Element.prototype &&
      !supportsDetailsAnimation() &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches
    )
  }

  async #animate(item: HTMLDetailsElement, open: boolean): Promise<void> {
    const name = item.getAttribute("name") ?? this.#names.get(item)

    if (open && name) {
      for (const other of this.items) {
        if (other === item || !isOpen(other)) continue

        if ((other.getAttribute("name") ?? this.#names.get(other)) !== name) {
          continue
        }

        void this.#animate(other, false)
      }
    }

    // Starts from wherever a running animation left the item.
    const from = item.getBoundingClientRect().height
    const content = panels(item)
    const opacity = content.map((el) => getComputedStyle(el).opacity)
    this.#cancel(item)

    let to: number

    if (open) {
      this.#restoreName(item)
      item.removeAttribute(CLOSING_ATTRIBUTE)
      item.open = true
      to = item.getBoundingClientRect().height
    } else {
      const stripped = item.getAttribute("name")

      if (stripped !== null) {
        this.#names.set(item, stripped)
        item.removeAttribute("name")
      }

      item.setAttribute(CLOSING_ATTRIBUTE, "")
      to = closedHeight(item)
    }

    const timing = timingOf(item)
    const box = { boxSizing: "border-box", overflow: "hidden" }

    const animations = [
      item.animate(
        [
          { ...box, blockSize: `${from}px` },
          { ...box, blockSize: `${to}px` },
        ],
        timing
      ),
      ...content.map((el, i) =>
        el.animate({ opacity: [opacity[i] ?? "1", open ? "1" : "0"] }, timing)
      ),
    ]

    this.#animations.set(item, animations)

    try {
      await Promise.all(animations.map((animation) => animation.finished))
    } catch {
      // Cancelled by a newer toggle of this item, which now owns its state.
      return
    }

    this.#animations.delete(item)
    this.#finish(item, open)

    for (const animation of animations) animation.cancel()
  }

  // Stops a running animation without settling the item's state.
  #cancel(item: HTMLDetailsElement): void {
    for (const animation of this.#animations.get(item) ?? []) {
      animation.cancel()
    }

    this.#animations.delete(item)
  }

  // Settles an item in its final state and gives back a stripped name.
  #finish(item: HTMLDetailsElement, open: boolean): void {
    this.#cancel(item)

    if (item.hasAttribute(CLOSING_ATTRIBUTE)) {
      item.removeAttribute(CLOSING_ATTRIBUTE)
      item.open = open
    }

    this.#restoreName(item)
  }

  #restoreName(item: HTMLDetailsElement): void {
    const name = this.#names.get(item)

    if (name === undefined) return

    this.#names.delete(item)
    item.setAttribute("name", name)
  }
}

const isOpen = (item: HTMLDetailsElement): boolean =>
  item.open && !item.hasAttribute(CLOSING_ATTRIBUTE)

/** Whether the styles alone animate `<details>` (Chromium). */
export function supportsDetailsAnimation(): boolean {
  // jsdom has no CSS namespace.
  if (!("CSS" in globalThis)) return false

  return (
    CSS.supports("interpolate-size", "allow-keywords") &&
    CSS.supports("selector(::details-content)")
  )
}

// Everything the summary reveals.
const panels = (item: HTMLDetailsElement): HTMLElement[] =>
  [...item.children].filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement && el.localName !== "summary"
  )

// The height of the item with only its summary showing, border-box.
function closedHeight(item: HTMLDetailsElement): number {
  const style = getComputedStyle(item)
  const summary = item.querySelector(":scope > summary")

  let height = [
    style.paddingBlockStart,
    style.paddingBlockEnd,
    style.borderBlockStartWidth,
    style.borderBlockEndWidth,
  ].reduce((sum, value) => sum + (Number.parseFloat(value) || 0), 0)

  if (summary) {
    const own = getComputedStyle(summary)
    height +=
      summary.getBoundingClientRect().height +
      (Number.parseFloat(own.marginBlockStart) || 0) +
      (Number.parseFloat(own.marginBlockEnd) || 0)
  }

  return height
}

function timingOf(item: HTMLDetailsElement): KeyframeAnimationOptions {
  const style = getComputedStyle(item)
  const duration = style.getPropertyValue("--surface-accordion-duration").trim()
  const easing = style.getPropertyValue("--surface-accordion-easing").trim()

  return {
    duration: duration ? milliseconds(duration) : 300,
    easing: easing || "ease",
  }
}

const milliseconds = (time: string): number => {
  const value = Number.parseFloat(time) || 0

  return time.endsWith("ms") ? value : value * 1000
}

defineElement(SurfaceAccordion.tagName, SurfaceAccordion)

declare global {
  interface HTMLElementTagNameMap {
    "surface-accordion": SurfaceAccordion
  }
}
