import {
  closeAnimated,
  enhanceDialog,
  lockScrollWhileOpen,
  showModal,
  type EnhanceDialogOptions,
} from "../dialog/dialog.js"
import { defineElement } from "../utils/define.js"
import { adoptModalStyles } from "./styles.js"

/**
 * Web component that turns its direct child `<dialog>` into a centered modal.
 * The dialog stays the source of truth: open state lives in `dialog.open`.
 * Adds the modal styles to the document, so no CSS import is needed. The
 * styles key on the tag, so the markup works with `modal.css` and no JS too.
 *
 * @tag surface-modal
 * @slot - The modal `<dialog>`, as the direct child. With `scroll="page"`, wrap its content in one element: that element is the panel.
 * @attr {"small" | "medium" | "large" | "full"} size - Preset width: `24rem`, `32rem` (default), `48rem`, or the whole viewport.
 * @attr {"inside" | "page"} scroll - Where long content scrolls. `inside` (default) caps the dialog at the viewport and scrolls it; `page` lets the panel grow and scrolls the layer around it.
 * @attr {boolean} no-scroll-lock - Leave page scroll untouched while open.
 * @cssstate open - The child dialog is open.
 * @cssprop [--surface-modal-size=32rem] - Inline size when `size` is not set.
 * @cssprop [--surface-modal-gutter=1rem] - Minimum space between the modal and the viewport edges.
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
    adoptModalStyles()

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

    const cleanups = [
      enhanceDialog(dialog, options),
      this.#dismissFromPageLayer(dialog),
    ]

    this.#dialog = dialog
    this.#cleanup = () => {
      for (const cleanup of cleanups) cleanup()
    }

    this.#syncScrollLock()
  }

  // With scroll="page" the dialog covers the backdrop, so neither native
  // closedby="any" nor lightDismiss() sees a backdrop click. A click that
  // starts and ends on the dialog itself, outside its scrollbar, is one.
  #dismissFromPageLayer(dialog: HTMLDialogElement): () => void {
    const controller = new AbortController()
    const { signal } = controller
    let pressedLayer = false

    const isLayer = (event: MouseEvent): boolean =>
      this.getAttribute("scroll") === "page" &&
      event.target === dialog &&
      event.offsetX <= dialog.clientWidth &&
      event.offsetY <= dialog.clientHeight

    dialog.addEventListener(
      "pointerdown",
      (event) => {
        pressedLayer = isLayer(event)
      },
      { signal }
    )

    dialog.addEventListener(
      "click",
      (event) => {
        const shouldClose = pressedLayer && isLayer(event)
        pressedLayer = false

        if (shouldClose && dialog.getAttribute("closedby") === "any") {
          void closeAnimated(dialog)
        }
      },
      { signal }
    )

    return () => controller.abort()
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

defineElement(SurfaceModal.tagName, SurfaceModal)

declare global {
  interface HTMLElementTagNameMap {
    "surface-modal": SurfaceModal
  }
}
