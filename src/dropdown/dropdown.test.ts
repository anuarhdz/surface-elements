import { fixture, fixtureCleanup, html } from "@open-wc/testing-helpers"
import { afterEach, describe, expect, it } from "vitest"

import { SurfaceDropdown } from "./dropdown.js"
import { placement, transformOrigin } from "./position.js"

describe("surface-dropdown", () => {
  afterEach(() => fixtureCleanup())

  it("registers the custom element", () => {
    expect(customElements.get(SurfaceDropdown.tagName)).toBe(SurfaceDropdown)
  })

  it("adopts the dropdown styles", async () => {
    await fixture(html`<surface-dropdown></surface-dropdown>`)
    expect(
      document.querySelector('style[data-surface-elements="dropdown"]')
    ).not.toBeNull()
  })

  it("finds only its own button and panel", async () => {
    const el = await fixture<SurfaceDropdown>(html`
      <surface-dropdown>
        <button popovertarget="outer">Outer</button>
        <div id="outer" popover="auto">
          <surface-dropdown>
            <button popovertarget="inner">Inner</button>
            <div id="inner" popover="auto"></div>
          </surface-dropdown>
        </div>
      </surface-dropdown>
    `)

    expect(el.trigger?.textContent).toBe("Outer")
    expect(el.panel?.id).toBe("outer")
  })

  it("does nothing without a panel", async () => {
    const el = await fixture<SurfaceDropdown>(
      html`<surface-dropdown></surface-dropdown>`
    )

    expect(el.open).toBe(false)
    expect(() => {
      el.show()
      el.close()
      el.toggle()
    }).not.toThrow()
  })
})

describe("placement", () => {
  const anchor = { top: 100, right: 200, bottom: 130, left: 100 }
  const panel = { width: 150, height: 200 }
  const viewport = { width: 1000, height: 800 }
  const options = { nested: false, rtl: false, offset: 4 }

  it("opens below the button, aligned to its start", () => {
    expect(placement(anchor, panel, viewport, options)).toEqual({
      top: 134,
      left: 100,
    })
  })

  it("flips above the button when it does not fit below", () => {
    const low = { top: 700, right: 200, bottom: 730, left: 100 }

    expect(placement(low, panel, viewport, options).top).toBe(496)
  })

  it("aligns to the button's end when it does not fit at the start", () => {
    const edge = { top: 100, right: 1000, bottom: 130, left: 900 }

    expect(placement(edge, panel, viewport, options).left).toBe(850)
  })

  it("stays in the viewport when neither side fits", () => {
    const short = { width: 1000, height: 150 }

    expect(placement(anchor, panel, short, options).top).toBe(0)
  })

  it("aligns to the end of the button in right-to-left text", () => {
    expect(
      placement(anchor, panel, viewport, { ...options, rtl: true }).left
    ).toBe(50)
  })

  it("opens a nested panel beside the button", () => {
    expect(
      placement(anchor, panel, viewport, { ...options, nested: true })
    ).toEqual({
      top: 100,
      left: 204,
    })
  })

  it("flips a nested panel to the other side when it does not fit", () => {
    const edge = { top: 100, right: 950, bottom: 130, left: 850 }

    expect(
      placement(edge, panel, viewport, { ...options, nested: true }).left
    ).toBe(696)
  })

  it("places a nested panel below the button when neither side fits", () => {
    expect(
      placement(
        { top: 100, right: 256, bottom: 120, left: 64 },
        { width: 192, height: 80 },
        { width: 320, height: 800 },
        { ...options, nested: true }
      )
    ).toEqual({ top: 124, left: 64 })
  })

  it("opens a nested panel on the left in right-to-left text", () => {
    expect(
      placement(
        { top: 100, right: 500, bottom: 130, left: 400 },
        panel,
        viewport,
        { nested: true, rtl: true, offset: 4 }
      ).left
    ).toBe(246)
  })
})

const box = (top: number, left: number) => ({
  top,
  left,
  bottom: top + 200,
  right: left + 150,
})

describe("transformOrigin", () => {
  const anchor = { top: 100, right: 200, bottom: 130, left: 100 }

  it("is the top start corner below the button", () => {
    expect(transformOrigin(anchor, box(134, 100))).toBe("left top")
  })

  it("is at the bottom above the button", () => {
    expect(transformOrigin(anchor, box(-104, 100))).toBe("left bottom")
  })

  it("is on the right when aligned to the button's end", () => {
    expect(transformOrigin(anchor, box(134, 50))).toBe("right top")
  })

  it("is on the near side of a flyout", () => {
    expect(transformOrigin(anchor, box(100, 204))).toBe("left top")
    expect(transformOrigin(anchor, box(100, -54))).toBe("right top")
  })

  it("is at the bottom of a flyout aligned to the button's bottom", () => {
    expect(transformOrigin(anchor, box(-70, 204))).toBe("left bottom")
  })
})
