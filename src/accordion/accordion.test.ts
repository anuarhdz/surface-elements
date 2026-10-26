import { fixture, fixtureCleanup, html } from "@open-wc/testing-helpers"
import { afterEach, describe, expect, it } from "vitest"

import { SurfaceAccordion } from "./accordion.js"

const accordion = () =>
  fixture<SurfaceAccordion>(html`
    <surface-accordion>
      <details name="faq">
        <summary>One</summary>
        <p>First</p>
      </details>
      <details name="faq">
        <summary>Two</summary>
        <p>Second</p>
      </details>
      <div>
        <details><summary>Nested</summary></details>
      </div>
    </surface-accordion>
  `)

describe("surface-accordion", () => {
  afterEach(() => fixtureCleanup())

  it("registers the custom element", () => {
    expect(customElements.get(SurfaceAccordion.tagName)).toBe(SurfaceAccordion)
  })

  it("adopts the accordion styles", async () => {
    await accordion()
    expect(
      document.querySelector('style[data-surface-elements="accordion"]')
    ).not.toBeNull()
  })

  it("lists only its direct child details as items", async () => {
    const el = await accordion()

    expect(
      el.items.map((item) => item.querySelector("summary")?.textContent)
    ).toEqual(["One", "Two"])
  })

  it("toggles an item without animation where it cannot animate", async () => {
    const el = await accordion()
    const [first] = el.items

    if (!first) throw new Error("Missing item")

    await el.toggle(first)
    expect(first.open).toBe(true)

    await el.toggle(first, true)
    expect(first.open).toBe(true)

    await el.toggle(first)
    expect(first.open).toBe(false)
  })
})
