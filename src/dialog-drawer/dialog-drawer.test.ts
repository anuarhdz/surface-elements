import { fixture, html } from "@open-wc/testing-helpers"
import { describe, expect, it } from "vitest"

import { DialogDrawer } from "./dialog-drawer.js"

describe("dialog-drawer", () => {
  it("registers the custom element", () => {
    expect(customElements.get(DialogDrawer.tagName)).toBe(DialogDrawer)
  })

  it("upgrades when used in the DOM", async () => {
    const el = await fixture<DialogDrawer>(
      html`<dialog-drawer></dialog-drawer>`
    )
    expect(el).toBeInstanceOf(DialogDrawer)
  })
})
