import { fixture, html } from "@open-wc/testing-helpers"
import { describe, expect, it } from "vitest"

import { HeaderSticky } from "./header-sticky.js"

describe("header-sticky", () => {
  it("registers the custom element", () => {
    expect(customElements.get(HeaderSticky.tagName)).toBe(HeaderSticky)
  })

  it("upgrades when used in the DOM", async () => {
    const el = await fixture<HeaderSticky>(
      html`<header-sticky></header-sticky>`
    )
    expect(el).toBeInstanceOf(HeaderSticky)
  })
})
