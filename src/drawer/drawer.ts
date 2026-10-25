import {
  closeAnimated,
  enhanceDialog,
  lockScrollWhileOpen,
  showModal,
  type EnhanceDialogOptions,
} from "../dialog/dialog.js"
import { defineElement } from "../utils/define.js"
import { adoptDrawerStyles } from "./styles.js"

/**
 * Web component that turns its direct child `<dialog>` into a drawer.
 * The dialog stays the source of truth: open state lives in `dialog.open`.
 * Adds the drawer styles to the document, so no CSS import is needed. The
 * styles key on the tag, so the markup works with `drawer.css` and no JS too.
 *
 * @tag surface-drawer
 * @slot - The drawer `<dialog>`, as the direct child.
 * @attr {"end" | "start" | "top" | "bottom"} edge - Edge the drawer is attached to. Defaults to `end`. Inline edges follow the writing direction.
 * @attr {boolean} no-scroll-lock - Leave page scroll untouched while open.
 * @cssstate open - The child dialog is open.
 * @cssprop [--surface-drawer-size=28rem] - Inline size for `start`/`end`, block size for `top`/`bottom` (`auto`).
 * @cssprop [--surface-drawer-max-size=calc(100% - 3rem)] - Upper bound for the size.
 * @cssprop [--surface-drawer-padding=1rem] - Padding of the dialog.
 * @cssprop [--surface-drawer-background=Canvas] - Background of the dialog.
 * @cssprop [--surface-drawer-color=CanvasText] - Text color of the dialog.
 * @cssprop [--surface-drawer-border=none] - Border of the dialog.
 * @cssprop [--surface-drawer-radius=0] - Border radius of the dialog.
 * @cssprop [--surface-drawer-shadow=0 0 2rem rgb(0 0 0 / 0.2)] - Shadow of the dialog.
 * @cssprop [--surface-drawer-backdrop=rgb(0 0 0 / 0.5)] - Backdrop background.
 * @cssprop [--surface-drawer-backdrop-filter=none] - Backdrop filter.
 * @cssprop [--surface-drawer-duration=0.3s] - Enter and exit transition duration.
 * @cssprop [--surface-drawer-easing=cubic-bezier(0.38, 0.005, 0.215, 1)] - Enter and exit easing.
 */
export class SurfaceDrawer extends HTMLElement {
  static readonly tagName = "surface-drawer"
  static readonly observedAttributes = ["no-scroll-lock"]

  #internals: ElementInternals | undefined
  #dialog: HTMLDialogElement | null = null
  #cleanup: (() => void) | undefined
  #releaseScrollLock: (() => void) | undefined
  #observer: MutationObserver | undefined

  constructor() {
    super()
    this.#internals = this.attachInternals?.()
  }

  /** The direct child `<dialog>`, if any. */
  get dialog(): HTMLDialogElement | null {
    return this.querySelector(":scope > dialog")
  }

  /** Mirrors `dialog.open`. */
  get open(): boolean {
    return this.dialog?.open ?? false
  }

  /** Opens the dialog as a modal, cancelling an exit in progress. */
  show(): void {
    const dialog = this.dialog

    if (dialog) showModal(dialog)
  }

  /** Closes after the exit transition. Resolves when closed. */
  close(returnValue?: string): Promise<void> {
    const dialog = this.dialog

    return dialog ? closeAnimated(dialog, returnValue) : Promise.resolve()
  }

  /** Calls `show()` or `close()`. */
  toggle(): void {
    if (this.open) void this.close()
    else this.show()
  }

  connectedCallback(): void {
    adoptDrawerStyles()

    // Children may arrive after connection, and the dialog may be swapped.
    this.#observer ??= new MutationObserver(() => this.#sync())
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    })
    this.#sync()
  }

  attributeChangedCallback(): void {
    this.#syncScrollLock()
  }

  disconnectedCallback(): void {
    this.#observer?.disconnect()
    this.#unbind()
  }

  #sync(): void {
    const dialog = this.dialog

    if (dialog !== this.#dialog) {
      this.#unbind()

      if (dialog) this.#bind(dialog)
    }

    this.#setState("open", dialog?.open ?? false)
  }

  #bind(dialog: HTMLDialogElement): void {
    // The scroll lock is managed here so `no-scroll-lock` can change at runtime.
    const options: EnhanceDialogOptions = { lockScroll: false }
    this.#dialog = dialog
    this.#cleanup = enhanceDialog(dialog, options)
    this.#syncScrollLock()
  }

  #syncScrollLock(): void {
    const dialog = this.#dialog
    const wanted = dialog !== null && !this.hasAttribute("no-scroll-lock")

    if (wanted && !this.#releaseScrollLock) {
      this.#releaseScrollLock = lockScrollWhileOpen(dialog)
    } else if (!wanted && this.#releaseScrollLock) {
      this.#releaseScrollLock()
      this.#releaseScrollLock = undefined
    }
  }

  #unbind(): void {
    this.#releaseScrollLock?.()
    this.#releaseScrollLock = undefined
    this.#cleanup?.()
    this.#cleanup = undefined
    this.#dialog = null
  }

  #setState(state: string, on: boolean): void {
    const states = this.#internals?.states

    if (!states) return

    if (on) states.add(state)
    else states.delete(state)
  }
}

defineElement(SurfaceDrawer.tagName, SurfaceDrawer)

declare global {
  interface HTMLElementTagNameMap {
    "surface-drawer": SurfaceDrawer
  }
}
