import { fixture, fixtureCleanup, html } from "@open-wc/testing-helpers"
import { afterEach, describe, expect, it } from "vitest"

import { isScrollLocked } from "../scroll-lock/scroll-lock.js"
import { SurfaceModal } from "./modal.js"

const flush = () => new Promise((resolve) => setTimeout(resolve))

const modal = () =>
  fixture<SurfaceModal>(
    html`<surface-modal><dialog>Hi</dialog></surface-modal>`
  )

describe("surface-modal", () => {
  afterEach(() => fixtureCleanup())

  it("registers the web component", () => {
    expect(customElements.get(SurfaceModal.tagName)).toBe(SurfaceModal)
  })

  it("adopts the modal styles", async () => {
    await modal()
    expect(
      document.querySelector('style[data-surface-elements="surface-modal"]')
    ).not.toBeNull()
  })

  it("opens and closes its dialog", async () => {
    const el = await modal()

    el.show()
    expect(el.open).toBe(true)
    expect(el.dialog?.open).toBe(true)

    await el.close("bye")
    expect(el.open).toBe(false)
    expect(el.dialog?.returnValue).toBe("bye")
  })

  it("toggles", async () => {
    const el = await modal()

    el.toggle()
    expect(el.open).toBe(true)
    el.toggle()
    expect(el.open).toBe(false)
  })

  it("reopens when toggled during the exit animation", async () => {
    const el = await modal()
    let finish!: () => void

    const finished = new Promise<Animation>(
      (resolve) => (finish = () => resolve(animation))
    )

    // SAFETY: closeAnimated only awaits `finished`; jsdom has no Animation.
    const animation = { finished } as Animation
    el.dialog!.getAnimations = () => [animation]

    el.toggle()
    const closing = el.close()
    el.toggle()
    finish()
    await closing

    expect(el.open).toBe(true)
    expect(el.dialog?.hasAttribute("data-closing")).toBe(false)
  })

  it("follows the dialog when it is closed natively", async () => {
    const el = await modal()

    el.show()
    el.dialog?.close()
    expect(el.open).toBe(false)

    el.show()
    expect(el.open).toBe(true)
  })

  it("locks scroll while open", async () => {
    const el = await modal()

    el.show()
    await flush()
    expect(isScrollLocked()).toBe(true)

    await el.close()
    await flush()
    expect(isScrollLocked()).toBe(false)
  })

  it("skips the lock with no-scroll-lock", async () => {
    const el = await fixture<SurfaceModal>(
      html`<surface-modal no-scroll-lock><dialog></dialog></surface-modal>`
    )

    el.show()
    await flush()
    expect(isScrollLocked()).toBe(false)
    await el.close()
  })

  it("stops locking when no-scroll-lock is added while open", async () => {
    const el = await modal()

    el.show()
    await flush()
    expect(isScrollLocked()).toBe(true)

    el.setAttribute("no-scroll-lock", "")
    expect(isScrollLocked()).toBe(false)
    await el.close()
  })

  it("locks when no-scroll-lock is removed while open", async () => {
    const el = await fixture<SurfaceModal>(
      html`<surface-modal no-scroll-lock><dialog></dialog></surface-modal>`
    )

    el.show()
    await flush()
    expect(isScrollLocked()).toBe(false)

    el.removeAttribute("no-scroll-lock")
    expect(isScrollLocked()).toBe(true)
    await el.close()
    await flush()
    expect(isScrollLocked()).toBe(false)
  })

  it("honours no-scroll-lock toggled while closed", async () => {
    const el = await modal()

    el.setAttribute("no-scroll-lock", "")
    el.show()
    await flush()
    expect(isScrollLocked()).toBe(false)
    await el.close()

    el.removeAttribute("no-scroll-lock")
    el.show()
    await flush()
    expect(isScrollLocked()).toBe(true)
    await el.close()
    await flush()
  })

  it("releases the lock when removed while open", async () => {
    const el = await modal()

    el.show()
    await flush()
    el.remove()
    expect(isScrollLocked()).toBe(false)
  })

  it("enhances a dialog added after connection", async () => {
    const el = await fixture<SurfaceModal>(
      html`<surface-modal></surface-modal>`
    )

    el.append(document.createElement("dialog"))
    await flush()

    el.show()
    await flush()
    expect(isScrollLocked()).toBe(true)
    await el.close()
    await flush()
  })

  it("closes on Escape (cancel) through the animated path", async () => {
    const el = await modal()

    el.show()
    el.dialog?.dispatchEvent(new Event("cancel", { cancelable: true }))
    await flush()
    expect(el.open).toBe(false)
  })

  it("closes on a backdrop click when closedby is any", async () => {
    const el = await fixture<SurfaceModal>(
      html`<surface-modal><dialog closedby="any">Hi</dialog></surface-modal>`
    )

    el.show()
    const dialog = el.dialog!
    dialog.dispatchEvent(
      new MouseEvent("pointerdown", { clientX: -1, clientY: -1 })
    )
    dialog.dispatchEvent(new MouseEvent("click", { clientX: -1, clientY: -1 }))
    await flush()
    expect(el.open).toBe(false)
  })

  it("keeps the modal open on a click inside the dialog", async () => {
    const el = await fixture<SurfaceModal>(
      html`<surface-modal><dialog closedby="any">Hi</dialog></surface-modal>`
    )

    el.show()
    const dialog = el.dialog!
    dialog.dispatchEvent(
      new MouseEvent("pointerdown", { clientX: 0, clientY: 0 })
    )
    dialog.dispatchEvent(new MouseEvent("click", { clientX: 0, clientY: 0 }))
    await flush()
    expect(el.open).toBe(true)
    await el.close()
  })

  it("binds the new dialog when the old one is replaced", async () => {
    const el = await modal()

    el.dialog?.remove()
    el.append(document.createElement("dialog"))
    await flush()

    el.show()
    await flush()
    expect(isScrollLocked()).toBe(true)
    await el.close()
    await flush()
    expect(isScrollLocked()).toBe(false)
  })

  it("does not throw or lock without a dialog child", async () => {
    const el = await fixture<SurfaceModal>(
      html`<surface-modal></surface-modal>`
    )

    expect(() => el.show()).not.toThrow()
    await expect(el.close()).resolves.toBeUndefined()
    expect(el.open).toBe(false)
    expect(isScrollLocked()).toBe(false)
  })
})
