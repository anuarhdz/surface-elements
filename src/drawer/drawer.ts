import {
  CLOSING_ATTRIBUTE,
  closeAnimated,
  showModal,
} from "../dialog/dialog.js"
import { defineElement } from "../utils/define.js"
import { childDialog, dialogHost } from "../utils/dialog-host.js"
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

  #host = dialogHost(this, this.attachInternals?.())

  /** The direct child `<dialog>`, if any. */
  get dialog(): HTMLDialogElement | null {
    return childDialog(this)
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

  /** Calls `close()` when open, `show()` when closed or closing. */
  toggle(): void {
    const dialog = this.dialog

    if (dialog?.open && !dialog.hasAttribute(CLOSING_ATTRIBUTE)) {
      void this.close()
    } else {
      this.show()
    }
  }

  connectedCallback(): void {
    adoptDrawerStyles()
    this.#host.connect()
  }

  attributeChangedCallback(): void {
    this.#host.syncScrollLock()
  }

  disconnectedCallback(): void {
    this.#host.disconnect()
  }
}

defineElement(SurfaceDrawer.tagName, SurfaceDrawer)

declare global {
  interface HTMLElementTagNameMap {
    "surface-drawer": SurfaceDrawer
  }
}
