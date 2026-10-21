import { fixture, fixtureCleanup, html } from "@open-wc/testing-helpers"
import { afterEach, describe, expect, it } from "vitest"

import { isScrollLocked } from "../scroll-lock/scroll-lock.js"
import { DialogDrawer } from "./dialog-drawer.js"

const flush = () => new Promise((resolve) => setTimeout(resolve))

const drawer = () =>
  fixture<DialogDrawer>(
    html`<dialog-drawer><dialog data-drawer>Hi</dialog></dialog-drawer>`
  )

describe("dialog-drawer", () => {
  afterEach(() => fixtureCleanup())

  it("registers the custom element", () => {
    expect(customElements.get(DialogDrawer.tagName)).toBe(DialogDrawer)
  })

  it("adopts the drawer styles", async () => {
    await drawer()
    expect(
      document.querySelector('style[data-surface-elements="dialog-drawer"]')
    ).not.toBeNull()
  })

  it("opens and closes its dialog", async () => {
    const el = await drawer()

    el.show()
    expect(el.open).toBe(true)
    expect(el.dialog?.open).toBe(true)

    await el.close("bye")
    expect(el.open).toBe(false)
    expect(el.dialog?.returnValue).toBe("bye")
  })

  it("toggles", async () => {
    const el = await drawer()

    el.toggle()
    expect(el.open).toBe(true)
    el.toggle()
    expect(el.open).toBe(false)
  })

  it("follows the dialog when it is closed natively", async () => {
    const el = await drawer()

    el.show()
    el.dialog?.close()
    expect(el.open).toBe(false)

    el.show()
    expect(el.open).toBe(true)
  })

  it("locks scroll while open", async () => {
    const el = await drawer()

    el.show()
    await flush()
    expect(isScrollLocked()).toBe(true)

    await el.close()
    await flush()
    expect(isScrollLocked()).toBe(false)
  })

  it("skips the lock with no-scroll-lock", async () => {
    const el = await fixture<DialogDrawer>(
      html`<dialog-drawer no-scroll-lock><dialog></dialog></dialog-drawer>`
    )

    el.show()
    await flush()
    expect(isScrollLocked()).toBe(false)
    await el.close()
  })

  it("stops locking when no-scroll-lock is added while open", async () => {
    const el = await drawer()

    el.show()
    await flush()
    expect(isScrollLocked()).toBe(true)

    el.setAttribute("no-scroll-lock", "")
    expect(isScrollLocked()).toBe(false)
    await el.close()
  })

  it("locks when no-scroll-lock is removed while open", async () => {
    const el = await fixture<DialogDrawer>(
      html`<dialog-drawer no-scroll-lock><dialog></dialog></dialog-drawer>`
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
    const el = await drawer()

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
    const el = await drawer()

    el.show()
    await flush()
    el.remove()
    expect(isScrollLocked()).toBe(false)
  })

  it("enhances a dialog added after connection", async () => {
    const el = await fixture<DialogDrawer>(
      html`<dialog-drawer></dialog-drawer>`
    )
    el.append(document.createElement("dialog"))
    await flush()

    el.show()
    await flush()
    expect(isScrollLocked()).toBe(true)
    await el.close()
    await flush()
  })
})
