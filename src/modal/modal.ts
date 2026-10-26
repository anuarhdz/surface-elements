import {
  CLOSING_ATTRIBUTE,
  closeAnimated,
  showModal,
} from "../dialog/dialog.js"
import { defineElement } from "../utils/define.js"
import { childDialog, dialogHost } from "../utils/dialog-host.js"
import { adoptModalStyles } from "./styles.js"

/**
 * Web component that turns its direct child `<dialog>` into a centered modal.
 * The dialog stays the source of truth: open state lives in `dialog.open`.
 * Adds the modal styles to the document, so no CSS import is needed. The
 * styles key on the tag, so the markup works with `modal.css` and no JS too.
 *
 * @tag surface-modal
 * @slot - The modal `<dialog>`, as the direct child.
 * @attr {"small" | "medium" | "large" | "full"} size - Preset width: `24rem`, `32rem` (default), `48rem`, or the whole viewport.
 * @attr {boolean} no-scroll-lock - Leave page scroll untouched while open.
 * @cssstate open - The child dialog is open.
 * @cssprop [--surface-modal-size=32rem] - Inline size when `size` is not set.
 * @cssprop [--surface-modal-gutter=1rem] - Minimum space between the modal and the viewport edges. Long content scrolls inside the modal.
 * @cssprop [--surface-modal-padding=1.5rem] - Padding of the panel.
 * @cssprop [--surface-modal-background=Canvas] - Background of the panel.
 * @cssprop [--surface-modal-color=CanvasText] - Text color of the panel.
 * @cssprop [--surface-modal-border=none] - Border of the panel.
 * @cssprop [--surface-modal-radius=0.75rem] - Border radius of the panel.
 * @cssprop [--surface-modal-shadow=0 1rem 3rem rgb(0 0 0 / 0.25)] - Shadow of the panel.
 * @cssprop [--surface-modal-backdrop=rgb(0 0 0 / 0.5)] - Backdrop background.
 * @cssprop [--surface-modal-backdrop-filter=none] - Backdrop filter.
 * @cssprop [--surface-modal-duration=0.2s] - Enter and exit transition duration.
 * @cssprop [--surface-modal-easing=cubic-bezier(0.2, 0, 0, 1)] - Enter and exit easing.
 */
export class SurfaceModal extends HTMLElement {
  static readonly tagName = "surface-modal"
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
    adoptModalStyles()
    this.#host.connect()
  }

  attributeChangedCallback(): void {
    this.#host.syncScrollLock()
  }

  disconnectedCallback(): void {
    this.#host.disconnect()
  }
}

defineElement(SurfaceModal.tagName, SurfaceModal)

declare global {
  interface HTMLElementTagNameMap {
    "surface-modal": SurfaceModal
  }
}
