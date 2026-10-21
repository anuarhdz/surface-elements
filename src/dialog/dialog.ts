import { lockScroll } from "../scroll-lock/scroll-lock.js"

type Cleanup = () => void

const noop: Cleanup = () => {}

/** Attribute set while an exit transition plays in browsers without `overlay`. */
export const CLOSING_ATTRIBUTE = "data-closing"

export interface EnhanceDialogOptions {
  /** Block page scroll while the dialog is modal. Defaults to `true`. */
  lockScroll?: boolean
}

/**
 * Applies every dialog enhancement this library provides: light-dismiss
 * fallback, animated close requests and scroll lock. Returns a cleanup.
 */
export function enhanceDialog(
  dialog: HTMLDialogElement,
  options: EnhanceDialogOptions = {}
): Cleanup {
  const cleanups = [lightDismiss(dialog), routeCloseRequests(dialog)]
  if (options.lockScroll ?? true) cleanups.push(lockScrollWhileOpen(dialog))

  return () => {
    for (const cleanup of cleanups) cleanup()
  }
}

/**
 * Fallback for `closedby="any"` where the browser lacks it: closes the
 * dialog when a click starts and ends on the backdrop. No-op where native.
 */
export function lightDismiss(
  dialog: HTMLDialogElement,
  close: () => unknown = () => closeAnimated(dialog)
): Cleanup {
  if (supportsClosedBy()) return noop

  const controller = new AbortController()
  const { signal } = controller
  let pressedBackdrop = false

  const isBackdrop = (event: MouseEvent): boolean => {
    if (event.target !== dialog) return false
    const rect = dialog.getBoundingClientRect()
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
  }

  // Track where the press started so selecting text inside the dialog and
  // releasing over the backdrop does not close it.
  dialog.addEventListener(
    "pointerdown",
    (event) => {
      pressedBackdrop = isBackdrop(event)
    },
    { signal }
  )

  dialog.addEventListener(
    "click",
    (event) => {
      const shouldClose = pressedBackdrop && isBackdrop(event)
      pressedBackdrop = false
      if (!shouldClose) return
      if (dialog.getAttribute("closedby") !== "any" || !isModal(dialog)) return
      void close()
    },
    { signal }
  )

  return () => controller.abort()
}

/**
 * Where exit transitions out of the top layer are unsupported, routes Esc,
 * light dismiss, `command="close"` and `<form method="dialog">` through
 * {@link closeAnimated} so they animate too. No-op where native.
 */
export function routeCloseRequests(dialog: HTMLDialogElement): Cleanup {
  if (supportsTopLayerExit()) return noop

  const controller = new AbortController()
  const { signal } = controller

  dialog.addEventListener(
    "cancel",
    (event) => {
      event.preventDefault()
      void closeAnimated(dialog)
    },
    { signal }
  )

  // The command event fires on the target before the browser acts on it.
  dialog.addEventListener(
    "command",
    (event) => {
      const command = (event as Event & { command?: string }).command
      if (command === "close") {
        event.preventDefault()
        void closeAnimated(dialog)
      } else if (command === "show-modal") {
        dialog.removeAttribute(CLOSING_ATTRIBUTE)
      }
    },
    { signal }
  )

  dialog.addEventListener(
    "submit",
    (event) => {
      const form = event.target as HTMLFormElement
      const submitter = event.submitter
      const method =
        submitter?.getAttribute("formmethod") ?? form.getAttribute("method")
      if (method?.toLowerCase() !== "dialog") return
      event.preventDefault()
      void closeAnimated(dialog, submitter?.getAttribute("value") ?? undefined)
    },
    { signal }
  )

  return () => controller.abort()
}

const EXIT_TIMEOUT = 2000

/**
 * Closes the dialog after its exit transition. In browsers that transition
 * `display` and `overlay` natively this is a plain `close()`; elsewhere it
 * sets `data-closing`, waits for the animations and then closes.
 */
export async function closeAnimated(
  dialog: HTMLDialogElement,
  returnValue?: string
): Promise<void> {
  if (!dialog.open || dialog.hasAttribute(CLOSING_ATTRIBUTE)) return

  if (!supportsTopLayerExit()) {
    dialog.setAttribute(CLOSING_ATTRIBUTE, "")
    const animations = dialog.getAnimations?.({ subtree: true }) ?? []
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((animation) => animation.finished)),
        new Promise((resolve) => setTimeout(resolve, EXIT_TIMEOUT)),
      ])
    }
    // Reopened while the exit transition was playing.
    if (!dialog.hasAttribute(CLOSING_ATTRIBUTE)) return
    dialog.removeAttribute(CLOSING_ATTRIBUTE)
  }

  dialog.close(returnValue)
}

/** Opens the dialog as a modal, cancelling an exit transition in progress. */
export function showModal(dialog: HTMLDialogElement): void {
  dialog.removeAttribute(CLOSING_ATTRIBUTE)
  if (!dialog.open) dialog.showModal()
}

/** Holds a {@link lockScroll} lock for as long as the dialog is modal. */
export function lockScrollWhileOpen(dialog: HTMLDialogElement): Cleanup {
  let release: Cleanup | undefined

  const sync = () => {
    const open = dialog.open && isModal(dialog)
    if (open && !release) {
      release = lockScroll()
    } else if (!open && release) {
      release()
      release = undefined
    }
  }

  const observer = new MutationObserver(sync)
  observer.observe(dialog, { attributes: true, attributeFilter: ["open"] })
  sync()

  return () => {
    observer.disconnect()
    release?.()
    release = undefined
  }
}

/** Whether the browser supports `closedby` on dialogs. */
export function supportsClosedBy(): boolean {
  return "closedBy" in HTMLDialogElement.prototype
}

let topLayerExit: boolean | undefined

/** Whether exit transitions out of the top layer work without help. */
export function supportsTopLayerExit(): boolean {
  topLayerExit ??=
    (globalThis.CSS?.supports?.("overlay", "auto") ?? false) &&
    canTransitionDisplay()
  return topLayerExit
}

// Firefox parses `allow-discrete` without transitioning `display`, so probe
// the computed value instead of trusting CSS.supports().
function canTransitionDisplay(): boolean {
  if (!globalThis.CSS?.supports?.("transition-behavior", "allow-discrete")) {
    return false
  }
  const probe = document.createElement("div")
  probe.style.cssText =
    "transition: display 1s allow-discrete !important; display: block;"
  document.documentElement.append(probe)
  getComputedStyle(probe).display
  probe.style.display = "none"
  const supported = getComputedStyle(probe).display === "block"
  probe.remove()
  return supported
}

function isModal(dialog: HTMLDialogElement): boolean {
  try {
    return dialog.matches(":modal")
  } catch {
    // Engines without :modal only open modals through showModal() here.
    return dialog.open
  }
}
