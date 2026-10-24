import { defineElement } from "../utils/define.js"
import { adoptHeaderStyles } from "./styles.js"

/**
 * A page header that sticks to the top of its scroll container. Wrap your
 * `<header>` in it so the `banner` landmark stays native. Adds the header
 * styles to the document, so no CSS import is needed.
 *
 * Publishes its height as `--surface-header-height` on the scroll container
 * (`<html>` for the page), for `scroll-padding-block-start`.
 *
 * @tag surface-header
 * @slot - The page `<header>`.
 * @attr {boolean} hide-on-scroll - Hide while scrolling down, show again on scroll up or when focus moves inside.
 * @cssstate stuck - The header is stuck to the top of its scroll container.
 * @cssstate hidden - `hide-on-scroll` has moved the header out of view.
 * @cssprop [--surface-header-offset=0px] - Distance from the top edge where the header sticks.
 * @cssprop [--surface-header-duration=0.2s] - Hide and show transition duration.
 * @cssprop [--surface-header-easing=ease-out] - Hide and show easing.
 * @cssprop --surface-header-height - Output, not input: the element writes its height here, on its scroll container.
 */
export class SurfaceHeader extends HTMLElement {
  static readonly tagName = "surface-header"
  static readonly observedAttributes = ["hide-on-scroll"]

  #internals: ElementInternals | undefined
  #scroller: HTMLElement | undefined
  #resizeObserver: ResizeObserver | undefined
  #frame = 0
  #lastScroll = 0
  #hidden = false

  constructor() {
    super()
    this.#internals = this.attachInternals?.()
  }

  /** Whether the header is stuck to the top of its scroll container. */
  get stuck(): boolean {
    return this.#internals?.states?.has("stuck") ?? false
  }

  connectedCallback(): void {
    adoptHeaderStyles()

    const scroller = scrollContainer(this)
    this.#scroller = scroller
    this.#lastScroll = scroller.scrollTop
    scrollTarget(scroller).addEventListener("scroll", this.#onScroll, {
      passive: true,
    })
    this.addEventListener("focusin", this.#onFocusIn)

    if ("ResizeObserver" in globalThis) {
      this.#resizeObserver ??= new ResizeObserver(() => this.#publishHeight())
      this.#resizeObserver.observe(this)
    }

    this.#publishHeight()
    this.#update()
  }

  attributeChangedCallback(): void {
    if (!this.hasAttribute("hide-on-scroll")) this.#setHidden(false)
  }

  disconnectedCallback(): void {
    const scroller = this.#scroller

    if (scroller) {
      scrollTarget(scroller).removeEventListener("scroll", this.#onScroll)
      scroller.style.removeProperty("--surface-header-height")
    }

    this.removeEventListener("focusin", this.#onFocusIn)
    this.#resizeObserver?.disconnect()
    cancelAnimationFrame(this.#frame)
    this.#frame = 0
    this.#scroller = undefined
  }

  #onScroll = (): void => {
    // One read per frame, however many scroll events arrive.
    this.#frame ||= requestAnimationFrame(() => {
      this.#frame = 0
      this.#update()
    })
  }

  // Never hide what the keyboard is on.
  #onFocusIn = (): void => {
    this.#setHidden(false)
  }

  #update(): void {
    const scroller = this.#scroller

    if (!scroller) return

    const scroll = scroller.scrollTop
    const top = this.getBoundingClientRect().top - viewportTop(scroller)
    const offset = Number.parseFloat(getComputedStyle(this).top) || 0
    // Hiding translates the box, so its rect no longer says where it sticks.
    // It only hides while stuck, and shows again before it can unstick.
    const stuck = scroll > 0 && (this.#hidden || top <= offset + 1)
    this.#setState("stuck", stuck)

    if (this.hasAttribute("hide-on-scroll")) {
      const delta = scroll - this.#lastScroll
      const past = scroll > this.offsetHeight + offset

      if (!stuck || delta < 0) this.#setHidden(false)
      else if (delta > 0 && past && !this.contains(document.activeElement)) {
        this.#setHidden(true)
      }
    }

    this.#lastScroll = scroll
  }

  #publishHeight(): void {
    this.#scroller?.style.setProperty(
      "--surface-header-height",
      `${this.offsetHeight}px`
    )
  }

  #setHidden(on: boolean): void {
    this.#hidden = on
    this.#setState("hidden", on)
  }

  #setState(state: string, on: boolean): void {
    const states = this.#internals?.states

    if (!states) return

    if (on) states.add(state)
    else states.delete(state)
  }
}

/** The nearest scrolling ancestor, or `<html>` for the page. */
function scrollContainer(el: Element): HTMLElement {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (node === document.body || node === document.documentElement) break

    const { overflowY } = getComputedStyle(node)

    if (overflowY !== "visible" && overflowY !== "clip") return node
  }

  return document.documentElement
}

const isRoot = (scroller: Element): boolean =>
  scroller === document.documentElement

// The page's scroll events fire on window, not on <html>.
const scrollTarget = (scroller: HTMLElement): EventTarget =>
  isRoot(scroller) ? window : scroller

// Sticky positions against the padding box, inside the border.
const viewportTop = (scroller: HTMLElement): number =>
  isRoot(scroller)
    ? 0
    : scroller.getBoundingClientRect().top + scroller.clientTop

defineElement(SurfaceHeader.tagName, SurfaceHeader)

declare global {
  interface HTMLElementTagNameMap {
    "surface-header": SurfaceHeader
  }
}
