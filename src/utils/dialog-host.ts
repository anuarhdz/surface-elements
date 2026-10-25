import {
  enhanceDialog,
  lockScrollWhileOpen,
  type EnhanceDialogOptions,
} from "../dialog/dialog.js"

type Cleanup = () => void

/** The direct child `<dialog>` of a web component, if any. */
export function childDialog(host: Element): HTMLDialogElement | null {
  return host.querySelector(":scope > dialog")
}

export interface DialogHost {
  connect(): void
  disconnect(): void
  /** Re-reads `no-scroll-lock`. Call from `attributeChangedCallback`. */
  syncScrollLock(): void
}

/**
 * Shared wiring for web components that wrap a direct child `<dialog>`:
 * enhances it, rebinds when it is swapped, holds the scroll lock unless the
 * host has `no-scroll-lock`, and mirrors `dialog.open` as `:state(open)`.
 */
export function dialogHost(
  host: HTMLElement,
  internals: ElementInternals | undefined
): DialogHost {
  let current: HTMLDialogElement | null = null
  let cleanup: Cleanup | undefined
  let releaseScrollLock: Cleanup | undefined
  let observer: MutationObserver | undefined

  const syncScrollLock = () => {
    const wanted = current !== null && !host.hasAttribute("no-scroll-lock")

    if (current && wanted && !releaseScrollLock) {
      releaseScrollLock = lockScrollWhileOpen(current)
    } else if (!wanted && releaseScrollLock) {
      releaseScrollLock()
      releaseScrollLock = undefined
    }
  }

  const unbind = () => {
    releaseScrollLock?.()
    releaseScrollLock = undefined
    cleanup?.()
    cleanup = undefined
    current = null
  }

  const sync = () => {
    const dialog = childDialog(host)

    if (dialog !== current) {
      unbind()

      if (dialog) {
        // The scroll lock is managed here so `no-scroll-lock` can change at runtime.
        const options: EnhanceDialogOptions = { lockScroll: false }

        current = dialog
        cleanup = enhanceDialog(dialog, options)

        syncScrollLock()
      }
    }

    const states = internals?.states

    if (!states) return

    if (dialog?.open) states.add("open")
    else states.delete("open")
  }

  return {
    connect() {
      // Children may arrive after connection, and the dialog may be swapped.
      observer ??= new MutationObserver(sync)
      observer.observe(host, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["open"],
      })
      sync()
    },
    disconnect() {
      observer?.disconnect()
      unbind()
    },
    syncScrollLock,
  }
}
