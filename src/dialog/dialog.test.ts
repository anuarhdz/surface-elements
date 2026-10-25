import { fixture, fixtureCleanup, html } from "@open-wc/testing-helpers"
import { afterEach, describe, expect, it, vi } from "vitest"

import { isScrollLocked } from "../scroll-lock/scroll-lock.js"
import {
  closeAnimated,
  enhanceDialog,
  lightDismiss,
  lockScrollWhileOpen,
  routeCloseRequests,
  showModal,
} from "./dialog.js"

const cleanups: (() => void)[] = []
const track = (cleanup: () => void) => cleanups.push(cleanup)

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.()
  fixtureCleanup()
})

async function modal(): Promise<HTMLDialogElement> {
  const dialog = await fixture<HTMLDialogElement>(
    html`<dialog closedby="any">
      <form method="dialog">
        <button value="ok">OK</button>
      </form>
    </dialog>`
  )

  // A 100×100 box at the origin.
  dialog.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100)
  dialog.showModal()

  return dialog
}

function press(target: Element, x: number, y: number): void {
  const init = { bubbles: true, clientX: x, clientY: y }
  target.dispatchEvent(new MouseEvent("pointerdown", init))
  target.dispatchEvent(new MouseEvent("click", init))
}

const flush = () => new Promise((resolve) => setTimeout(resolve))

/** An animation stub whose `finished` settles when `finish()` is called. */
function pendingAnimation() {
  let finish!: () => void

  const finished = new Promise<Animation>(
    (resolve) => (finish = () => resolve(animation))
  )

  // SAFETY: closeAnimated only awaits `finished`; jsdom has no Animation.
  const animation = { finished } as Animation

  return { animation, finish }
}

describe("lightDismiss", () => {
  it("closes on a backdrop click", async () => {
    const dialog = await modal()
    track(lightDismiss(dialog))

    press(dialog, 200, 200)
    expect(dialog.open).toBe(false)
  })

  it("ignores clicks on the dialog box and its content", async () => {
    const dialog = await modal()
    track(lightDismiss(dialog))

    press(dialog, 50, 50)
    press(dialog.querySelector("button")!, 200, 200)
    expect(dialog.open).toBe(true)
  })

  it("ignores a press that started inside the dialog", async () => {
    const dialog = await modal()
    track(lightDismiss(dialog))

    dialog.dispatchEvent(
      new MouseEvent("pointerdown", { clientX: 50, clientY: 50 })
    )
    dialog.dispatchEvent(
      new MouseEvent("click", { clientX: 200, clientY: 200 })
    )
    expect(dialog.open).toBe(true)
  })

  it('requires closedby="any"', async () => {
    const dialog = await modal()
    dialog.removeAttribute("closedby")
    track(lightDismiss(dialog))

    press(dialog, 200, 200)
    expect(dialog.open).toBe(true)
  })

  it("stops after cleanup", async () => {
    const dialog = await modal()
    lightDismiss(dialog)()

    press(dialog, 200, 200)
    expect(dialog.open).toBe(true)
  })
})

describe("closeAnimated", () => {
  it("closes with the return value", async () => {
    const dialog = await modal()
    await closeAnimated(dialog, "done")

    expect(dialog.open).toBe(false)
    expect(dialog.returnValue).toBe("done")
    expect(dialog.hasAttribute("data-closing")).toBe(false)
  })

  it("waits for exit animations before closing", async () => {
    const dialog = await modal()
    const { animation, finish } = pendingAnimation()
    dialog.getAnimations = () => [animation]

    const closing = closeAnimated(dialog)
    expect(dialog.hasAttribute("data-closing")).toBe(true)
    expect(dialog.open).toBe(true)

    finish()
    await closing
    expect(dialog.open).toBe(false)
    expect(dialog.hasAttribute("data-closing")).toBe(false)
  })

  it("is cancelled by showModal() during the exit", async () => {
    const dialog = await modal()
    const { animation, finish } = pendingAnimation()
    dialog.getAnimations = () => [animation]

    const closing = closeAnimated(dialog)
    showModal(dialog)
    finish()
    await closing

    expect(dialog.open).toBe(true)
  })

  it("returns the exit in progress to a second call", async () => {
    const dialog = await modal()
    const { animation, finish } = pendingAnimation()
    dialog.getAnimations = () => [animation]

    const first = closeAnimated(dialog)
    const second = closeAnimated(dialog, "ignored")
    expect(second).toBe(first)

    finish()
    await second
    expect(dialog.open).toBe(false)
    expect(dialog.returnValue).toBe("")
  })
})

describe("routeCloseRequests", () => {
  it("animates Esc instead of closing at once", async () => {
    const dialog = await modal()
    track(routeCloseRequests(dialog))

    const cancel = new Event("cancel", { cancelable: true })
    dialog.dispatchEvent(cancel)

    expect(cancel.defaultPrevented).toBe(true)
    expect(dialog.open).toBe(false)
  })

  it('routes command="close"', async () => {
    const dialog = await modal()
    track(routeCloseRequests(dialog))

    const command = Object.assign(new Event("command", { cancelable: true }), {
      command: "close",
    })

    dialog.dispatchEvent(command)

    expect(command.defaultPrevented).toBe(true)
    expect(dialog.open).toBe(false)
  })

  it('routes <form method="dialog"> with the submitter value', async () => {
    const dialog = await modal()
    track(routeCloseRequests(dialog))

    const form = dialog.querySelector("form")!
    const submitter = dialog.querySelector("button")!

    const submit = new SubmitEvent("submit", {
      cancelable: true,
      bubbles: true,
      submitter,
    })

    form.dispatchEvent(submit)

    expect(submit.defaultPrevented).toBe(true)
    expect(dialog.open).toBe(false)
    expect(dialog.returnValue).toBe("ok")
  })

  it("leaves a submit the consumer cancelled alone", async () => {
    const dialog = await modal()
    track(routeCloseRequests(dialog))

    const form = dialog.querySelector("form")!
    form.addEventListener("submit", (event) => event.preventDefault())
    form.dispatchEvent(
      new SubmitEvent("submit", { cancelable: true, bubbles: true })
    )

    expect(dialog.open).toBe(true)
  })

  it("closes only the dialog that owns the form", async () => {
    const outer = await fixture<HTMLDialogElement>(
      html`<dialog>
        <dialog>
          <form method="dialog"><button value="ok">OK</button></form>
        </dialog>
      </dialog>`
    )

    const inner = outer.querySelector("dialog")!
    outer.showModal()
    inner.showModal()
    track(routeCloseRequests(outer))
    track(routeCloseRequests(inner))

    inner.querySelector("form")!.dispatchEvent(
      new SubmitEvent("submit", {
        cancelable: true,
        bubbles: true,
        submitter: inner.querySelector("button"),
      })
    )

    expect(inner.open).toBe(false)
    expect(outer.open).toBe(true)
  })

  it("ignores a cancelled submit even without a nested listener", async () => {
    const outer = await fixture<HTMLDialogElement>(
      html`<dialog>
        <dialog>
          <form method="dialog"><button value="ok">OK</button></form>
        </dialog>
      </dialog>`
    )

    const inner = outer.querySelector("dialog")!
    outer.showModal()
    inner.showModal()
    track(routeCloseRequests(outer))

    inner
      .querySelector("form")!
      .dispatchEvent(
        new SubmitEvent("submit", { cancelable: true, bubbles: true })
      )

    expect(outer.open).toBe(true)
  })
})

describe("lockScrollWhileOpen", () => {
  it("locks while the dialog is modal", async () => {
    const dialog = await fixture<HTMLDialogElement>(html`<dialog></dialog>`)
    track(lockScrollWhileOpen(dialog))

    dialog.showModal()
    await flush()
    expect(isScrollLocked()).toBe(true)

    dialog.close()
    await flush()
    expect(isScrollLocked()).toBe(false)
  })

  it("does not lock for non-modal dialogs", async () => {
    const dialog = await fixture<HTMLDialogElement>(html`<dialog></dialog>`)
    track(lockScrollWhileOpen(dialog))

    dialog.setAttribute("open", "")
    await flush()
    expect(isScrollLocked()).toBe(false)
  })

  it("releases the lock on cleanup", async () => {
    const dialog = await modal()
    const cleanup = lockScrollWhileOpen(dialog)
    expect(isScrollLocked()).toBe(true)

    cleanup()
    expect(isScrollLocked()).toBe(false)
  })
})

describe("enhanceDialog", () => {
  it("can skip the scroll lock", async () => {
    const dialog = await modal()
    track(enhanceDialog(dialog, { lockScroll: false }))
    expect(isScrollLocked()).toBe(false)
  })

  it("combines light dismiss and the scroll lock", async () => {
    const dialog = await modal()
    const spy = vi.fn<() => void>()
    dialog.addEventListener("close", spy)
    track(enhanceDialog(dialog))
    expect(isScrollLocked()).toBe(true)

    press(dialog, 200, 200)
    await flush()
    expect(spy).toHaveBeenCalledOnce()
    expect(isScrollLocked()).toBe(false)
  })
})
