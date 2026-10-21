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
 *
 * Attributes:
 * - `no-scroll-lock`: leave page scroll untouched while open.
 *
 * Exposes `:state(open)` for styling.
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

  get dialog(): HTMLDialogElement | null {
    return this.querySelector(":scope > dialog")
  }

  get open(): boolean {
    return this.dialog?.open ?? false
  }

  show(): void {
    const dialog = this.dialog
    if (dialog) showModal(dialog)
  }

  close(returnValue?: string): Promise<void> {
    const dialog = this.dialog
    return dialog ? closeAnimated(dialog, returnValue) : Promise.resolve()
  }

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
