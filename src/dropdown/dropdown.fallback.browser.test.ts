import { fixture, fixtureCleanup, html } from "@open-wc/testing-helpers"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import "./dropdown.js"
import type { SurfaceDropdown } from "./dropdown.js"
import { adoptDropdownStyles } from "./styles.js"

// The positioning fallback, alone: the browser is told it has no anchor
// positioning, and the styles' @supports block, which Chromium would still
// apply, is removed. Its own file, so the other tests keep the sheet.
beforeAll(() => {
  adoptDropdownStyles()

  for (const sheet of document.adoptedStyleSheets) {
    const layer = sheet.cssRules[0]

    if (!(layer instanceof CSSLayerBlockRule)) continue

    for (let i = layer.cssRules.length - 1; i >= 0; i--) {
      if (layer.cssRules[i] instanceof CSSSupportsRule) layer.deleteRule(i)
    }
  }
})

const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

const dropdown = () =>
  fixture<SurfaceDropdown>(html`
    <surface-dropdown style="margin: 2rem">
      <button popovertarget="fallback-panel">Products</button>
      <div id="fallback-panel" popover="auto" style="inline-size: 200px">
        <surface-dropdown id="fallback-nested">
          <button popovertarget="fallback-nested-panel">More</button>
          <div
            id="fallback-nested-panel"
            popover="auto"
            style="min-inline-size: 0; inline-size: 100px"
          >
            Content
          </div>
        </surface-dropdown>
      </div>
    </surface-dropdown>
  `)

const rect = (el: Element | null | undefined): DOMRect => {
  if (!el) throw new Error("Missing element")

  return el.getBoundingClientRect()
}

describe("surface-dropdown without anchor positioning", () => {
  beforeEach(() => {
    vi.spyOn(CSS, "supports").mockReturnValue(false)
  })

  afterEach(() => {
    fixtureCleanup()
    vi.restoreAllMocks()
  })

  it("places the panel below its button instead of centering it", async () => {
    const el = await dropdown()
    el.show()
    await settle()

    const button = rect(el.trigger)
    const panel = rect(el.panel)

    expect(panel.top).toBeGreaterThanOrEqual(button.bottom)
    expect(panel.top - button.bottom).toBeLessThan(10)
    expect(Math.abs(panel.left - button.left)).toBeLessThan(1)
  })

  it("places a nested panel beside its button", async () => {
    const el = await dropdown()
    el.show()

    const nested = el.querySelector<SurfaceDropdown>("#fallback-nested")
    nested?.show()
    await settle()

    expect(rect(nested?.panel).left).toBeGreaterThanOrEqual(
      rect(nested?.trigger).right
    )
    expect(el.open).toBe(true)
  })

  it("places a nested panel beside the panel around it", async () => {
    const el = await dropdown()
    el.show()

    const nested = el.querySelector<SurfaceDropdown>("#fallback-nested")
    nested?.show()
    await settle()

    await Promise.allSettled(
      [el.panel, nested?.panel].flatMap(
        (panel) => panel?.getAnimations().map((motion) => motion.finished) ?? []
      )
    )

    expect(rect(nested?.panel).left).toBeGreaterThanOrEqual(
      rect(el.panel).right
    )
  })

  it("follows the button when the page scrolls", async () => {
    const el = await dropdown()
    document.body.style.minBlockSize = "300vh"
    el.show()
    await settle()

    scrollTo(0, 40)
    await settle()

    expect(rect(el.panel).top).toBeGreaterThanOrEqual(rect(el.trigger).bottom)
    expect(rect(el.panel).top - rect(el.trigger).bottom).toBeLessThan(10)

    scrollTo(0, 0)
    document.body.style.removeProperty("min-block-size")
  })

  it("ignores the enter scale when it aligns to the button's end", async () => {
    const el = await dropdown()
    el.style.cssText = "position: fixed; inset-inline-end: 0; margin: 0"
    el.show()
    await settle()

    await Promise.allSettled(
      el.panel?.getAnimations().map((animation) => animation.finished) ?? []
    )

    expect(rect(el.panel).right).toBeCloseTo(rect(el.trigger).right, 0)
    expect(el.panel?.style.getPropertyValue("--_surface-dropdown-origin")).toBe(
      "right top"
    )
  })

  it("does not set anchor names", async () => {
    const el = await dropdown()
    el.show()
    await settle()

    expect(el.trigger?.style.getPropertyValue("anchor-name")).toBe("")
  })

  it("stays beside its button while it fades out", async () => {
    const el = await dropdown()
    el.show()
    await settle()

    const { top, left } = rect(el.panel)

    el.close()

    // Well inside the exit transition, while the panel still renders.
    await settle()
    expect(el.panel?.matches(":popover-open")).toBe(false)
    expect(rect(el.panel).height).toBeGreaterThan(0)
    expect(rect(el.panel).top).toBe(top)
    expect(rect(el.panel).left).toBe(left)
  })

  it("is beside its button from the first frame it opens", async () => {
    const el = await dropdown()
    el.show()

    await new Promise((resolve) => requestAnimationFrame(resolve))

    expect(rect(el.panel).top).toBeGreaterThanOrEqual(rect(el.trigger).bottom)
    expect(rect(el.panel).top - rect(el.trigger).bottom).toBeLessThan(10)
  })

  it("stops following the page once closed", async () => {
    const el = await dropdown()
    el.show()
    await settle()
    el.close()
    await settle()

    const { top } = rect(el.panel)
    dispatchEvent(new Event("resize"))
    el.style.marginBlockStart = "6rem"
    dispatchEvent(new Event("resize"))

    expect(rect(el.panel).top).toBe(top)
  })

  it("clears its inline position when it leaves the document", async () => {
    const el = await dropdown()
    el.show()
    await settle()
    expect(el.panel?.style.top).not.toBe("")

    el.remove()

    expect(el.panel?.style.top).toBe("")
    expect(el.panel?.style.left).toBe("")
    expect(el.panel?.style.margin).toBe("")
  })
})
