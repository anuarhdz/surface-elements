import { fixture, fixtureCleanup, html } from "@open-wc/testing-helpers"
import axe from "axe-core"
import type { AxeResults } from "axe-core"
import { afterEach, describe, expect, it } from "vitest"

import "./modal.js"
import type { SurfaceModal } from "./modal.js"

// Real layout is available here, so color contrast is checked too.
const audit = (el: Element): Promise<AxeResults> => axe.run(el)

const flush = () => new Promise((resolve) => setTimeout(resolve))

describe("surface-modal accessibility", () => {
  afterEach(() => fixtureCleanup())

  it("has no violations when open", async () => {
    const el = await fixture<SurfaceModal>(
      html`<surface-modal
        ><dialog aria-labelledby="title">
          <h2 id="title">Settings</h2>
          <button>Close</button>
        </dialog></surface-modal
      >`
    )

    el.show()

    const { violations } = await audit(el)
    expect(violations).toEqual([])
    await el.close()
  })

  it("has no violations as an alert dialog", async () => {
    const el = await fixture<SurfaceModal>(
      html`<surface-modal size="small"
        ><dialog
          role="alertdialog"
          aria-labelledby="alert-title"
          aria-describedby="alert-text"
        >
          <h2 id="alert-title">Delete file?</h2>
          <p id="alert-text">This cannot be undone.</p>
          <form method="dialog">
            <button value="cancel" autofocus>Cancel</button>
            <button value="delete">Delete</button>
          </form>
        </dialog></surface-modal
      >`
    )

    el.show()

    const { violations } = await audit(el)
    expect(violations).toEqual([])
    await el.close()
  })
})

// Layout sizes: the bounding rect is scaled during the entry transition.
const width = (el: SurfaceModal) => el.dialog!.offsetWidth

describe("surface-modal layout", () => {
  afterEach(() => fixtureCleanup())

  it("is centered in the viewport", async () => {
    const el = await fixture<SurfaceModal>(
      html`<surface-modal><dialog>Hi</dialog></surface-modal>`
    )

    el.show()
    const rect = el.dialog!.getBoundingClientRect()
    expect(Math.round(rect.left)).toBe(Math.round(innerWidth - rect.right))
    expect(Math.round(rect.top)).toBe(Math.round(innerHeight - rect.bottom))
    await el.close()
  })

  it("picks a preset width from size", async () => {
    const el = await fixture<SurfaceModal>(
      html`<surface-modal><dialog>Hi</dialog></surface-modal>`
    )

    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)

    // Capped at the viewport minus the 1rem gutter on each side.
    const capped = (size: number) => Math.min(size * rem, innerWidth - 2 * rem)

    el.show()
    expect(width(el)).toBe(capped(32))
    el.setAttribute("size", "small")
    expect(width(el)).toBe(capped(24))
    el.setAttribute("size", "full")
    expect(width(el)).toBe(innerWidth)
    await el.close()
  })

  it("scrolls inside by default", async () => {
    const el = await fixture<SurfaceModal>(
      html`<surface-modal
        ><dialog>
          <div style="block-size: 300vh">Tall</div>
        </dialog></surface-modal
      >`
    )

    el.show()
    const dialog = el.dialog!
    expect(dialog.offsetHeight).toBeLessThan(innerHeight)
    expect(dialog.scrollHeight).toBeGreaterThan(dialog.clientHeight)
    await el.close()
  })

  it("lets the panel grow and scrolls the layer with scroll=page", async () => {
    const el = await fixture<SurfaceModal>(
      html`<surface-modal scroll="page"
        ><dialog>
          <div style="block-size: 300vh">Tall</div>
        </dialog></surface-modal
      >`
    )

    el.show()
    const dialog = el.dialog!
    const panel = dialog.firstElementChild!
    expect(dialog.offsetHeight).toBe(innerHeight)
    expect(dialog.scrollHeight).toBeGreaterThan(dialog.clientHeight)
    expect(panel.getBoundingClientRect().height).toBeGreaterThan(innerHeight)
    expect(getComputedStyle(dialog).backgroundColor).toBe("rgba(0, 0, 0, 0)")
    await el.close()
  })
})

const press = (target: Element, x: number, y: number) => {
  target.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      clientX: x,
      clientY: y,
    })
  )
  target.dispatchEvent(
    new MouseEvent("click", { bubbles: true, clientX: x, clientY: y })
  )
}

const pageModal = (closedby = "any") =>
  fixture<SurfaceModal>(
    html`<surface-modal scroll="page"
      ><dialog closedby=${closedby}><div>Panel</div></dialog></surface-modal
    >`
  )

describe("surface-modal light dismiss with scroll=page", () => {
  afterEach(() => fixtureCleanup())

  it("closes on a click on the layer around the panel", async () => {
    const el = await pageModal()

    el.show()
    press(el.dialog!, 2, 2)
    await flush()
    expect(el.open).toBe(false)
  })

  it("stays open on a click inside the panel", async () => {
    const el = await pageModal()

    el.show()
    const rect = el.dialog!.firstElementChild!.getBoundingClientRect()
    press(el.dialog!.firstElementChild!, rect.left + 4, rect.top + 4)
    await flush()
    expect(el.open).toBe(true)
    await el.close()
  })

  it("stays open without closedby=any", async () => {
    const el = await pageModal("closerequest")

    el.show()
    press(el.dialog!, 2, 2)
    await flush()
    expect(el.open).toBe(true)
    await el.close()
  })
})

const overscroll = (el: SurfaceModal) => {
  const dialog = el.dialog!

  return [
    getComputedStyle(dialog).overscrollBehaviorY,
    getComputedStyle(dialog, "::backdrop").overscrollBehaviorY,
  ]
}

describe("surface-modal scroll containment", () => {
  afterEach(() => fixtureCleanup())

  it("contains scroll on the dialog and its backdrop by default", async () => {
    const el = await fixture<SurfaceModal>(
      html`<surface-modal><dialog>Hi</dialog></surface-modal>`
    )

    expect(overscroll(el)).toEqual(["contain", "contain"])
  })

  it("lets scroll chain to the page with no-scroll-lock", async () => {
    const el = await fixture<SurfaceModal>(
      html`<surface-modal no-scroll-lock><dialog>Hi</dialog></surface-modal>`
    )

    expect(overscroll(el)).toEqual(["auto", "auto"])
  })
})
