import { fixture, fixtureCleanup, html } from "@open-wc/testing-helpers"
import axe from "axe-core"
import type { AxeResults } from "axe-core"
import { afterEach, describe, expect, it } from "vitest"

import type { DialogDrawer } from "./dialog-drawer.js"

// Real layout is available here, so color contrast is checked too.
const audit = (el: Element): Promise<AxeResults> => axe.run(el)

describe("dialog-drawer accessibility", () => {
  afterEach(() => fixtureCleanup())

  it("has no violations when open", async () => {
    const el = await fixture<DialogDrawer>(
      html`<dialog-drawer
        ><dialog aria-labelledby="title">
          <h2 id="title">Menu</h2>
          <button>Close</button>
        </dialog></dialog-drawer
      >`
    )
    el.show()

    const { violations } = await audit(el)
    expect(violations).toEqual([])
    await el.close()
  })

  it("reports an unlabeled button, so the audit is really running", async () => {
    const el = await fixture<DialogDrawer>(
      html`<dialog-drawer
        ><dialog><button></button></dialog
      ></dialog-drawer>`
    )
    el.show()

    const { violations } = await audit(el)
    expect(violations.map((v) => v.id)).toContain("button-name")
    await el.close()
  })
})
