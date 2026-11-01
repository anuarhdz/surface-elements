import { defineElement } from "../utils/define.js"
import { watchHover } from "./hover.js"
import {
  clearPlacement,
  placePanel,
  supportsAnchorPositioning,
  transformOrigin,
} from "./position.js"
import { adoptDropdownStyles } from "./styles.js"

// Random rather than counted: the package and a copy file can share a page.
const anchorName = (): string =>
  `--surface-dropdown-${Math.random().toString(36).slice(2)}`

const ORIGIN = "--_surface-dropdown-origin"
const EDGE = "--_surface-dropdown-edge"

// CSS cannot do this: an anchored container query, the way to ask which
// fallback the browser chose, styles the panel's descendants but not the panel.
const followButton = (trigger: HTMLElement, panel: HTMLElement): void => {
  panel.style.setProperty(
    ORIGIN,
    transformOrigin(
      trigger.getBoundingClientRect(),
      panel.getBoundingClientRect()
    )
  )
}

const nameAnchor = (element: HTMLElement): string => {
  const name = element.style.getPropertyValue("anchor-name") || anchorName()

  element.style.setProperty("anchor-name", name)

  return name
}

// A target that navigates another window rather than this one.
const opensElsewhere = (link: Element): boolean =>
  !["", "_self", "_parent", "_top"].includes(
    link.getAttribute("target")?.toLowerCase() ?? ""
  )

const removeStyle = (element: Element | null, property: string): void => {
  if (!(element instanceof HTMLElement)) return

  element.style.removeProperty(property)

  if (element.getAttribute("style") === "") element.removeAttribute("style")
}

/**
 * Web component that turns a button and the native popover after it into a
 * dropdown of links or other content. The popover stays the source of truth:
 * the browser opens and closes it from the button, closes it on Esc and on a
 * click outside, and keeps one open at a time. Adds the dropdown styles to the
 * document, so no CSS import is needed. The styles key on the tag, so the
 * markup works with `dropdown.css` and no JS too.
 *
 * The behavior is the same on every viewport. Nest a `<surface-dropdown>` in a
 * panel for a flyout, one level deep at most. This is a disclosure, reached
 * with Tab: for arrow keys and a single tab stop, use a menu.
 *
 * @tag surface-dropdown
 * @slot - The `<button popovertarget>` and, right after it, its `[popover]`, as direct children.
 * @attr {boolean} hover - Also open and close on mouse hover, where the device can hover. Tap, click and keyboard keep working.
 * @cssstate open - The panel is open.
 * @cssprop [--surface-dropdown-offset=0.25rem] - Space between the button and the panel.
 * @cssprop [--surface-dropdown-min-size=12rem] - Minimum inline size of the panel.
 * @cssprop [--surface-dropdown-padding=0.5rem] - Padding of the panel.
 * @cssprop [--surface-dropdown-background=Canvas] - Background of the panel.
 * @cssprop [--surface-dropdown-color=CanvasText] - Text color of the panel.
 * @cssprop [--surface-dropdown-border=1px solid color-mix(in srgb, CanvasText 15%, transparent)] - Border of the panel.
 * @cssprop [--surface-dropdown-radius=0.5rem] - Border radius of the panel.
 * @cssprop [--surface-dropdown-shadow=0 0.5rem 1.5rem rgb(0 0 0 / 0.15)] - Shadow of the panel.
 * @cssprop [--surface-dropdown-open-duration=0.18s] - Enter transition duration.
 * @cssprop [--surface-dropdown-close-duration=0.1s] - Exit transition duration.
 * @cssprop [--surface-dropdown-scale=0.96] - Scale the panel grows from and shrinks to.
 * @cssprop [--surface-dropdown-easing=ease-out] - Enter and exit easing.
 */
export class SurfaceDropdown extends HTMLElement {
  static readonly tagName = "surface-dropdown"

  #internals = this.attachInternals?.()
  #stopHover: (() => void) | undefined
  #stopPlacing: (() => void) | undefined
  #placed: HTMLElement | undefined

  /** The direct child button that opens the panel, if any. */
  get trigger(): HTMLElement | null {
    return this.querySelector(":scope > [popovertarget]")
  }

  /** The direct child `[popover]`, if any. */
  get panel(): HTMLElement | null {
    return this.querySelector(":scope > [popover]")
  }

  /** Whether the panel is open. */
  get open(): boolean {
    return this.panel?.matches(":popover-open") ?? false
  }

  /** The panel this dropdown is nested in, if any. */
  get #outerPanel(): HTMLElement | null {
    const outer = this.parentElement?.closest(SurfaceDropdown.tagName)?.panel

    return outer?.contains(this) ? outer : null
  }

  /** Opens the panel. */
  show(): void {
    if (!this.open) this.panel?.showPopover()
  }

  /** Closes the panel, and any dropdown open inside it. */
  close(): void {
    if (this.open) this.panel?.hidePopover()
  }

  /** Flips the panel, or with `force` opens (`true`) or closes (`false`) it. */
  toggle(force?: boolean): void {
    if (force ?? !this.open) {
      this.show()
    } else {
      this.close()
    }
  }

  connectedCallback(): void {
    adoptDropdownStyles()
    // `beforetoggle` and `toggle` do not bubble.
    this.addEventListener("beforetoggle", this.#onBeforeToggle, true)
    this.addEventListener("toggle", this.#onToggle, true)
    this.addEventListener("click", this.#onClick)
    this.addEventListener("focusout", this.#onFocusOut)
    this.#stopHover = watchHover(this, {
      open: () => this.show(),
      close: () => this.close(),
    })
  }

  disconnectedCallback(): void {
    this.removeEventListener("beforetoggle", this.#onBeforeToggle, true)
    this.removeEventListener("toggle", this.#onToggle, true)
    this.removeEventListener("click", this.#onClick)
    this.removeEventListener("focusout", this.#onFocusOut)
    this.#stopHover?.()
    this.#stopPlacing?.()
    this.#stopPlacing = undefined

    if (this.#placed) clearPlacement(this.#placed)
    this.#placed = undefined

    removeStyle(this.trigger, "anchor-name")
    removeStyle(this.panel, "position-anchor")
    removeStyle(this.panel, ORIGIN)
    removeStyle(this.panel, EDGE)
    removeStyle(this.panel, "anchor-name")
  }

  #onBeforeToggle = (event: Event): void => {
    const { trigger, panel } = this

    if (
      event.target !== panel ||
      !trigger ||
      !panel ||
      !(event instanceof ToggleEvent)
    ) {
      return
    }

    if (event.newState === "closed") {
      // The browser restores focus only for the first popover of a stack, so
      // focus inside a nested panel would otherwise fall back to the body.
      if (panel.contains(document.activeElement)) trigger.focus()

      // It may have flipped while open.
      followButton(trigger, panel)

      return
    }

    if (!supportsAnchorPositioning()) return

    // The button is the panel's implicit anchor only when the browser opens it
    // from the button, not from show() or hover, so the link is made explicit.
    panel.style.setProperty("position-anchor", nameAnchor(trigger))

    // A flyout has a second anchor: it clears the panel around it.
    const outer = this.#outerPanel

    if (outer) panel.style.setProperty(EDGE, nameAnchor(outer))
  }

  #onToggle = (event: Event): void => {
    const { trigger, panel } = this

    if (!panel || event.target !== panel || !(event instanceof ToggleEvent)) {
      return
    }

    const open = event.newState === "open"

    if (open) {
      this.#internals?.states.add("open")
    } else {
      this.#internals?.states.delete("open")
    }

    this.#stopPlacing?.()
    this.#stopPlacing = undefined

    if (open && trigger && !supportsAnchorPositioning()) {
      this.#stopPlacing = placePanel(trigger, panel, this.#outerPanel)
      this.#placed = panel
    }

    if (open && trigger) followButton(trigger, panel)
  }

  // Full page loads close the panel anyway; a router or a `#` link would not.
  // Each dropdown on the way up runs this, so the whole chain closes.
  #onClick = (event: MouseEvent): void => {
    // Opening in a new tab or window leaves this page where it was.
    if (event.metaKey || event.ctrlKey || event.shiftKey) return

    const link =
      event.target instanceof Element ? event.target.closest("a[href]") : null

    if (link && !opensElsewhere(link) && this.panel?.contains(link))
      this.close()
  }

  // Popovers have no focus trap, so Tab could leave one open behind the reader.
  #onFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget

    if (next instanceof Node && !this.contains(next)) this.close()
  }
}

defineElement(SurfaceDropdown.tagName, SurfaceDropdown)

declare global {
  interface HTMLElementTagNameMap {
    "surface-dropdown": SurfaceDropdown
  }
}
