import { fixture, fixtureCleanup, html } from "@open-wc/testing-helpers"
import axe from "axe-core"
import type { AxeResults } from "axe-core"
import { afterEach, describe, expect, it } from "vitest"

import "./drawer.js"
import type { SurfaceDrawer } from "./drawer.js"

// Real layout is available here, so color contrast is checked too.
const audit = (el: Element): Promise<AxeResults> => axe.run(el)

describe("surface-drawer accessibility", () => {
  afterEach(() => fixtureCleanup())

  it("has no violations when open", async () => {
    const el = await fixture<SurfaceDrawer>(
      html`<surface-drawer
        ><dialog aria-labelledby="title">
          <h2 id="title">Menu</h2>
          <button>Close</button>
        </dialog></surface-drawer
      >`
    )

    el.show()

    const { violations } = await audit(el)
    expect(violations).toEqual([])
    await el.close()
  })

  it("reports an unlabeled button, so the audit is really running", async () => {
    const el = await fixture<SurfaceDrawer>(
      html`<surface-drawer
        ><dialog><button></button></dialog
      ></surface-drawer>`
    )

    el.show()

    const { violations } = await audit(el)
    expect(violations.map((v) => v.id)).toContain("button-name")
    await el.close()
  })
})

const overscroll = (el: SurfaceDrawer) => {
  const dialog = el.dialog!

  return [
    getComputedStyle(dialog).overscrollBehaviorY,
    getComputedStyle(dialog, "::backdrop").overscrollBehaviorY,
  ]
}

describe("surface-drawer scroll containment", () => {
  afterEach(() => fixtureCleanup())

  it("contains scroll on the dialog and its backdrop by default", async () => {
    const el = await fixture<SurfaceDrawer>(
      html`<surface-drawer><dialog>Hi</dialog></surface-drawer>`
    )

    expect(overscroll(el)).toEqual(["contain", "contain"])
  })

  it("lets scroll chain to the page with no-scroll-lock", async () => {
    const el = await fixture<SurfaceDrawer>(
      html`<surface-drawer no-scroll-lock><dialog>Hi</dialog></surface-drawer>`
    )

    expect(overscroll(el)).toEqual(["auto", "auto"])
  })
})
