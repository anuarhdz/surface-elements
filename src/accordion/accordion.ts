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
 * A `<summary aria-disabled="true">` disables its item: clicks, keys and
 * {@link SurfaceAccordion.toggle} leave it as it is.
 *
 * @tag surface-accordion
 * @slot - The `<details>` elements, as direct children.
 * @attr {boolean} persist - Keep at least one item open: the last open item cannot be closed, and the first item opens if none is. Its summary gets `aria-disabled="true"` while it is the only one open.
 * @cssprop [--surface-accordion-duration=0.3s] - Open and close duration.
 * @cssprop [--surface-accordion-easing=ease] - Open and close easing.
 */
export class SurfaceAccordion extends HTMLElement {
  static readonly tagName = "surface-accordion"
  static readonly observedAttributes = ["persist"]

  #observer: MutationObserver | undefined
  #animations = new WeakMap<HTMLDetailsElement, Animation[]>()
  // Names taken off closing items, so opening a sibling cannot cut them short.
  #names = new WeakMap<HTMLDetailsElement, string>()
  // Summaries this element disabled for `persist`, as opposed to the author.
  #persisted = new WeakSet<HTMLElement>()

  /** The direct child `<details>` elements. */
  get items(): HTMLDetailsElement[] {
    return [...this.querySelectorAll<HTMLDetailsElement>(":scope > details")]
  }

  /**
   * Opens or closes `item`, one of {@link SurfaceAccordion.items}, with the
   * animation. Without `force` it flips the current state. Resolves when the
   * animation ends or another toggle of the same item replaces it. Does
   * nothing to a disabled item, or to the last open one with `persist`.
   */
  toggle(item: HTMLDetailsElement, force?: boolean): Promise<void> {
    const open = force ?? !isOpen(item)

    if (open === isOpen(item) || isDisabled(item)) return Promise.resolve()

    if (this.#animates()) return this.#animate(item, open)

    this.#finish(item, open)
    item.open = open

    return transitionsOf(item)
  }

  connectedCallback(): void {
    adoptAccordionStyles()
    this.addEventListener("click", this.#onClick)
    // `toggle` does not bubble.
    this.addEventListener("toggle", this.#onToggle, true)

    // Items may arrive after connection.
    this.#observer ??= new MutationObserver(() => this.#syncPersist())
    this.#observer.observe(this, { childList: true })
    this.#syncPersist()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#syncPersist()
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.#onClick)
    this.removeEventListener("toggle", this.#onToggle, true)
    this.#observer?.disconnect()

    for (const item of this.items) this.#finish(item, isOpen(item))
  }

  #onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented) return

    const target = event.target

    if (!(target instanceof Element)) return

    const summary = target.closest("summary")
    const item = summary?.parentElement

    if (
      !(item instanceof HTMLDetailsElement) ||
      item.parentElement !== this ||
      summaryOf(item) !== summary
    ) {
      return
    }

    // Links and controls inside the summary keep their own behavior.
    if (target.closest("a, button, input, select, textarea, label") !== null) {
      return
    }

    if (isDisabled(item)) {
      event.preventDefault()

      return
    }

    if (!this.#animates()) return

    event.preventDefault()
    void this.#animate(item, !isOpen(item))
  }

  #onToggle = (event: Event): void => {
    if (event.target instanceof HTMLDetailsElement) this.#syncPersist()
  }

  // With `persist`, opens the first item if none is open and disables the
  // summary of the only open item; without it, gives those summaries back.
  #syncPersist(): void {
    const items = this.items
    const persist = this.hasAttribute("persist")

    if (persist && !items.some(isOpen)) {
      const first = items.find((item) => !isDisabled(item))

      if (first) first.open = true
    }

    const open = items.filter(isOpen)

    for (const item of items) {
      const summary = summaryOf(item)

      if (!summary) continue

      const lock = persist && open.length === 1 && open[0] === item

      if (lock && !isDisabled(item)) {
        summary.setAttribute("aria-disabled", "true")
        this.#persisted.add(summary)
      } else if (!lock && this.#persisted.has(summary)) {
        summary.removeAttribute("aria-disabled")
        this.#persisted.delete(summary)
      }
    }
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
    // A closing item no longer counts as open for `persist`.
    this.#syncPersist()

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

const summaryOf = (item: HTMLDetailsElement): HTMLElement | null =>
  item.querySelector(":scope > summary")

const isDisabled = (item: HTMLDetailsElement): boolean =>
  summaryOf(item)?.getAttribute("aria-disabled") === "true"

/** Whether the styles alone animate `<details>` (Chromium). */
export function supportsDetailsAnimation(): boolean {
  // jsdom has no CSS namespace.
  if (!("CSS" in globalThis)) return false

  return (
    CSS.supports("interpolate-size", "allow-keywords") &&
    CSS.supports("selector(::details-content)")
  )
}

// Waits out the styles' ::details-content transition. Chromium runs it
// without exposing it to getAnimations() or transition events, so the
// computed duration is all there is to go by.
async function transitionsOf(item: HTMLDetailsElement): Promise<void> {
  if (!supportsDetailsAnimation()) return

  const style = getComputedStyle(item, "::details-content")
  const delays = style.transitionDelay.split(",").map(milliseconds)

  const total = Math.max(
    0,
    ...style.transitionDuration
      .split(",")
      .map((duration, i) => milliseconds(duration) + (delays[i] ?? 0))
  )

  if (total === 0) return

  // The transition starts with the next rendered frame.
  await new Promise(requestAnimationFrame)
  await new Promise((resolve) => setTimeout(resolve, total))
  // Computed styles follow the timeline, which only advances per frame.
  await new Promise(requestAnimationFrame)
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
  const summary = summaryOf(item)

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

  return time.trim().endsWith("ms") ? value : value * 1000
}

defineElement(SurfaceAccordion.tagName, SurfaceAccordion)

declare global {
  interface HTMLElementTagNameMap {
    "surface-accordion": SurfaceAccordion
  }
}
