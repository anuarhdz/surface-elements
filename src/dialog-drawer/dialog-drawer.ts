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
 * Progressive enhancement for a drawer `<dialog>` placed as its direct child.
 * The dialog stays the source of truth: open state lives in `dialog.open`.
 * Adds the drawer styles to the document, so no CSS import is needed.
 *
 * @tag dialog-drawer
 * @slot - The drawer `<dialog data-drawer>`, as the direct child.
 * @attr {boolean} no-scroll-lock - Leave page scroll untouched while open.
 * @cssstate open - The child dialog is open.
 * @cssprop [--drawer-size=28rem] - Inline size for `start`/`end`, block size for `top`/`bottom` (`auto`).
 * @cssprop [--drawer-max-size=calc(100% - 3rem)] - Upper bound for the size.
 * @cssprop [--drawer-padding=1rem] - Padding of the dialog.
 * @cssprop [--drawer-background=Canvas] - Background of the dialog.
 * @cssprop [--drawer-color=CanvasText] - Text color of the dialog.
 * @cssprop [--drawer-border=none] - Border of the dialog.
 * @cssprop [--drawer-radius=0] - Border radius of the dialog.
 * @cssprop [--drawer-shadow=0 0 2rem rgb(0 0 0 / 0.2)] - Shadow of the dialog.
 * @cssprop [--drawer-backdrop=rgb(0 0 0 / 0.5)] - Backdrop background.
 * @cssprop [--drawer-backdrop-filter=none] - Backdrop filter.
 * @cssprop [--drawer-duration=0.3s] - Enter and exit transition duration.
 * @cssprop [--drawer-easing=cubic-bezier(0.38, 0.005, 0.215, 1)] - Enter and exit easing.
 */
export class DialogDrawer extends HTMLElement {
  static readonly tagName = "dialog-drawer"
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

defineElement(DialogDrawer.tagName, DialogDrawer)

declare global {
  interface HTMLElementTagNameMap {
    "dialog-drawer": DialogDrawer
  }
}
