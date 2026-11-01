import { fixture, fixtureCleanup, html } from "@open-wc/testing-helpers"
import axe from "axe-core"
import { afterEach, describe, expect, it, vi } from "vitest"
import { userEvent } from "vitest/browser"

import "./dropdown.js"
import type { SurfaceDropdown } from "./dropdown.js"
import { HOVER_CLOSE_DELAY, HOVER_OPEN_DELAY } from "./hover.js"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// `toggle` is queued as a task after the popover changes.
const settle = () => wait(20)

const nav = () =>
  fixture<HTMLElement>(html`
    <nav aria-label="Main" style="padding: 2rem">
      <a id="before" href="#before">Before</a>
      <surface-dropdown id="products">
        <button id="products-button" popovertarget="products-panel">
          Products
        </button>
        <ul id="products-panel" popover="auto">
          <li><a id="editor" href="#editor">Editor</a></li>
          <li>
            <surface-dropdown id="more">
              <button id="more-button" popovertarget="more-panel">More</button>
              <ul
                id="more-panel"
                popover="auto"
                style="min-inline-size: 0; inline-size: 100px"
              >
                <li><a id="api" href="#api">API</a></li>
              </ul>
            </surface-dropdown>
          </li>
        </ul>
      </surface-dropdown>
      <surface-dropdown id="company">
        <button id="company-button" popovertarget="company-panel">
          Company
        </button>
        <ul id="company-panel" popover="auto">
          <li><a href="#about">About</a></li>
        </ul>
      </surface-dropdown>
      <a id="after" href="#after">After</a>
    </nav>
  `)

const get = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const element = document.querySelector<T>(`#${id}`)

  if (!element) throw new Error(`Missing #${id}`)

  return element
}

const dropdown = (id: string) => get<SurfaceDropdown>(id)

const hasState = (el: SurfaceDropdown, state: string) => {
  return el.matches(`:state(${state})`)
}

const pointer = (el: HTMLElement, type: string, pointerType = "mouse") => {
  el.dispatchEvent(new PointerEvent(type, { pointerType }))
}

function stubHover(matches: boolean) {
  // SAFETY: watchHover reads only `matches` from the query list.
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches,
  } as MediaQueryList)
}

const dropdownIn = (el: Element, selector: string) => {
  const inner = el.querySelector<SurfaceDropdown>(selector)

  if (!inner) throw new Error(`Missing ${selector}`)

  return inner
}

const flyout = (style: string) =>
  fixture<SurfaceDropdown>(html`
    <surface-dropdown style="position: fixed; margin: 0; ${style}">
      <button popovertarget="flyout-outer">Open</button>
      <ul
        id="flyout-outer"
        popover="auto"
        style="min-inline-size: 0; inline-size: 150px"
      >
        <li>
          <surface-dropdown id="flyout-inner">
            <button popovertarget="flyout-panel">More</button>
            <div
              id="flyout-panel"
              popover="auto"
              style="min-inline-size: 0; inline-size: 100px; block-size: 80px"
            >
              Content
            </div>
          </surface-dropdown>
        </li>
      </ul>
    </surface-dropdown>
  `)

const box = (node: Element | null) => {
  if (!node) throw new Error("Missing element")

  return node.getBoundingClientRect()
}

const placed = (style: string) =>
  fixture<SurfaceDropdown>(html`
    <surface-dropdown style="position: fixed; margin: 0; ${style}">
      <button popovertarget="motion-panel">Open</button>
      <div id="motion-panel" popover="auto" style="block-size: 100px">
        Content
      </div>
    </surface-dropdown>
  `)

const origin = (el: SurfaceDropdown) =>
  el.panel?.style.getPropertyValue("--_surface-dropdown-origin")

const panelStyle = (el: SurfaceDropdown) => {
  if (!el.panel) throw new Error("Missing panel")

  return getComputedStyle(el.panel)
}

const duration = (el: SurfaceDropdown) =>
  Number.parseFloat(panelStyle(el).transitionDuration)

describe("surface-dropdown in a browser", () => {
  afterEach(() => {
    fixtureCleanup()
    vi.restoreAllMocks()
  })

  it("opens from its button and closes from it, natively", async () => {
    await nav()
    const el = dropdown("products")

    await userEvent.click(get("products-button"))
    await settle()
    expect(el.open).toBe(true)
    expect(hasState(el, "open")).toBe(true)

    await userEvent.click(get("products-button"))
    await settle()
    expect(el.open).toBe(false)
    expect(hasState(el, "open")).toBe(false)
  })

  it("opens below its button, aligned to its start", async () => {
    await nav()
    dropdown("products").show()
    await settle()

    const button = get("products-button").getBoundingClientRect()
    const panel = get("products-panel").getBoundingClientRect()

    expect(panel.top).toBeGreaterThanOrEqual(button.bottom)
    expect(panel.top - button.bottom).toBeLessThan(10)
    expect(Math.abs(panel.left - button.left)).toBeLessThan(1)
  })

  it("flips above its button at the bottom of the viewport", async () => {
    await nav()
    const el = dropdown("products")
    el.style.position = "fixed"
    el.style.bottom = "0"
    el.show()
    await settle()

    const button = get("products-button").getBoundingClientRect()
    const panel = get("products-panel").getBoundingClientRect()

    expect(panel.bottom).toBeLessThanOrEqual(button.top)
  })

  it("opens a nested dropdown beside its parent panel and keeps it open", async () => {
    await nav()
    await userEvent.click(get("products-button"))
    await userEvent.click(get("more-button"))
    await settle()

    expect(dropdown("products").open).toBe(true)
    expect(dropdown("more").open).toBe(true)

    const button = get("more-button").getBoundingClientRect()
    const outer = get("products-panel").getBoundingClientRect()
    const panel = get("more-panel").getBoundingClientRect()

    expect(panel.left).toBeGreaterThanOrEqual(outer.right)
    expect(Math.abs(panel.top - button.top)).toBeLessThan(1)
  })

  it("gives each dropdown its own anchor", async () => {
    await nav()
    dropdown("products").show()
    dropdown("more").show()

    const name = (id: string) => get(id).style.getPropertyValue("anchor-name")

    expect(name("products-button")).not.toBe("")
    expect(name("more-button")).not.toBe("")
    expect(name("products-button")).not.toBe(name("more-button"))
    expect(get("more-panel").style.getPropertyValue("position-anchor")).toBe(
      name("more-button")
    )
  })

  it("clears the anchor it set when it leaves the document", async () => {
    await nav()
    const el = dropdown("company")
    el.show()
    el.remove()

    expect(el.trigger?.hasAttribute("style")).toBe(false)
    expect(el.panel?.hasAttribute("style")).toBe(false)
  })

  it("keeps one dropdown open at a time", async () => {
    await nav()
    await userEvent.click(get("products-button"))
    await userEvent.click(get("company-button"))
    await settle()

    expect(dropdown("products").open).toBe(false)
    expect(dropdown("company").open).toBe(true)
  })

  it("closes one level per Esc and returns focus to the button", async () => {
    await nav()
    await userEvent.click(get("products-button"))
    await userEvent.click(get("more-button"))
    get("api").focus()

    await userEvent.keyboard("{Escape}")
    await settle()
    expect(dropdown("more").open).toBe(false)
    expect(dropdown("products").open).toBe(true)
    expect(document.activeElement).toBe(get("more-button"))

    await userEvent.keyboard("{Escape}")
    await settle()
    expect(dropdown("products").open).toBe(false)
    expect(document.activeElement).toBe(get("products-button"))
  })

  it("closes on a click outside", async () => {
    await nav()
    await userEvent.click(get("products-button"))
    await userEvent.click(document.body, { position: { x: 5, y: 5 } })
    await settle()

    expect(dropdown("products").open).toBe(false)
  })

  it("closes the whole chain when a link is followed", async () => {
    await nav()
    await userEvent.click(get("products-button"))
    await userEvent.click(get("more-button"))
    await userEvent.click(get("api"))
    await settle()

    expect(dropdown("more").open).toBe(false)
    expect(dropdown("products").open).toBe(false)
  })

  it("stays open for a link opened in a new tab", async () => {
    await nav()
    const el = dropdown("products")
    el.show()

    const link = get("editor")
    link.addEventListener("click", (event) => event.preventDefault())
    link.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        metaKey: true,
      })
    )
    await settle()

    expect(el.open).toBe(true)
  })

  it("closes when Tab leaves it, without pulling focus back", async () => {
    await nav()
    const el = dropdown("company")
    el.show()
    get("company-panel").querySelector("a")?.focus()

    await userEvent.tab()
    await settle()

    expect(el.open).toBe(false)
    expect(document.activeElement).toBe(get("after"))
  })

  it("stays open while focus moves inside it", async () => {
    await nav()
    const el = dropdown("products")
    el.show()
    get("editor").focus()

    await userEvent.tab()
    await settle()

    expect(document.activeElement).toBe(get("more-button"))
    expect(el.open).toBe(true)
  })

  it("closes only the nested dropdown when Tab leaves it", async () => {
    await nav()
    dropdown("products").show()
    dropdown("more").show()
    get("api").focus()
    get("editor").focus()
    await settle()

    expect(dropdown("more").open).toBe(false)
    expect(dropdown("products").open).toBe(true)
  })

  it("show, close and toggle drive the panel", async () => {
    await nav()
    const el = dropdown("products")

    el.show()
    el.show()
    expect(el.open).toBe(true)

    el.toggle(true)
    expect(el.open).toBe(true)

    el.toggle()
    expect(el.open).toBe(false)

    el.close()
    el.toggle(false)
    expect(el.open).toBe(false)
  })

  it("exposes the button's expanded state without menu roles", async () => {
    await nav()
    const button = get("products-button")

    expect(button.hasAttribute("aria-haspopup")).toBe(false)
    expect(get("products-panel").hasAttribute("role")).toBe(false)
  })

  it("has no accessibility violations, open or closed", async () => {
    const root = await nav()

    expect((await axe.run(root)).violations).toEqual([])

    dropdown("products").show()
    dropdown("more").show()
    // axe measures contrast, so the panels must finish fading in.
    await wait(200)

    expect((await axe.run(root)).violations).toEqual([])
  })

  describe("flyout", () => {
    const openBoth = async (el: SurfaceDropdown) => {
      el.show()

      const inner = dropdownIn(el, "#flyout-inner")
      inner.show()
      await settle()

      await Promise.allSettled(
        [el, inner].flatMap(
          (host) =>
            host.panel?.getAnimations().map((motion) => motion.finished) ?? []
        )
      )

      return {
        outer: box(el.panel),
        panel: box(inner.panel),
        button: box(inner.trigger),
      }
    }

    it("clears the panel around it, level with its button", async () => {
      const el = await flyout("inset-block-start: 0; inset-inline-start: 0")
      const { outer, panel, button } = await openBoth(el)

      expect(panel.left).toBeGreaterThanOrEqual(outer.right)
      expect(panel.top).toBeCloseTo(button.top, 0)
    })

    it("flips to the other side of the panel around it", async () => {
      const el = await flyout("inset-block-start: 0; inset-inline-end: 0")
      const { outer, panel } = await openBoth(el)

      expect(panel.right).toBeLessThanOrEqual(outer.left)
    })

    it("flips on both axes in a corner", async () => {
      const el = await flyout("inset-block-end: 0; inset-inline-end: 0")
      const { outer, panel, button } = await openBoth(el)

      expect(panel.right).toBeLessThanOrEqual(outer.left)
      expect(panel.bottom).toBeCloseTo(button.bottom, 0)
    })

    it("removes the second anchor when it leaves the document", async () => {
      const el = await flyout("inset-block-start: 0; inset-inline-start: 0")
      const inner = dropdownIn(el, "#flyout-inner")
      await openBoth(el)
      const { panel } = inner

      el.remove()

      expect(panel?.style.getPropertyValue("--_surface-dropdown-edge")).toBe("")
      expect(el.panel?.style.getPropertyValue("anchor-name")).toBe("")
    })
  })

  describe("motion", () => {
    it("grows from the corner next to its button", async () => {
      const el = await placed("inset-block-start: 0; inset-inline-start: 0")
      el.show()
      await settle()

      expect(origin(el)).toBe("left top")
    })

    it("grows upward when it flips above its button", async () => {
      const el = await placed("inset-block-end: 0; inset-inline-start: 0")
      el.show()
      await settle()

      expect(origin(el)).toBe("left bottom")
    })

    it("grows from the end when it flips to the other side", async () => {
      const el = await placed("inset-block-start: 0; inset-inline-end: 0")
      el.show()
      await settle()

      expect(origin(el)).toBe("right top")
    })

    it("starts scaled down and ends at its full size", async () => {
      const el = await placed("inset-block-start: 0; inset-inline-start: 0")
      el.show()

      expect(panelStyle(el).scale).not.toBe("1")

      await Promise.allSettled(
        el.panel?.getAnimations().map((animation) => animation.finished) ?? []
      )

      expect(panelStyle(el).scale).toBe("1")
    })

    it("takes longer to open than to close", async () => {
      const el = await placed("inset-block-start: 0; inset-inline-start: 0")
      const closing = duration(el)
      el.show()

      expect(duration(el)).toBeGreaterThan(closing)
    })

    it("does not inherit the origin of the panel around it", async () => {
      const el = await fixture<SurfaceDropdown>(html`
        <surface-dropdown>
          <button popovertarget="outer-panel">Open</button>
          <div
            id="outer-panel"
            popover="auto"
            style="--_surface-dropdown-origin: right bottom"
          >
            <surface-dropdown id="inner">
              <button popovertarget="inner-panel">Open</button>
              <div id="inner-panel" popover="auto">Content</div>
            </surface-dropdown>
          </div>
        </surface-dropdown>
      `)

      expect(panelStyle(dropdownIn(el, "#inner")).transformOrigin).toBe("0% 0%")
    })

    it("removes the origin when it leaves the document", async () => {
      const el = await placed("inset-block-start: 0; inset-inline-start: 0")
      el.show()
      await settle()
      el.remove()

      expect(origin(el)).toBe("")
    })
  })

  describe("hover", () => {
    const hoverNav = async () => {
      const root = await nav()
      dropdown("products").setAttribute("hover", "")

      return root
    }

    it("opens on mouse enter and closes after leaving", async () => {
      stubHover(true)
      await hoverNav()
      const el = dropdown("products")

      pointer(el, "pointerenter")
      await wait(HOVER_OPEN_DELAY + 20)
      expect(el.open).toBe(true)

      pointer(el, "pointerleave")
      await wait(HOVER_CLOSE_DELAY + 20)
      expect(el.open).toBe(false)
    })

    it("does not open when the pointer only passes over", async () => {
      stubHover(true)
      await hoverNav()
      const el = dropdown("products")

      pointer(el, "pointerenter")
      pointer(el, "pointerleave")
      await wait(HOVER_OPEN_DELAY + 20)

      expect(el.open).toBe(false)
    })

    it("stays open when the pointer comes back in time", async () => {
      stubHover(true)
      await hoverNav()
      const el = dropdown("products")
      el.show()

      pointer(el, "pointerleave")
      await wait(HOVER_CLOSE_DELAY / 2)
      pointer(el, "pointerenter")
      await wait(HOVER_CLOSE_DELAY + 20)

      expect(el.open).toBe(true)
    })

    it("ignores the pointer without the attribute", async () => {
      stubHover(true)
      await nav()
      const el = dropdown("products")

      pointer(el, "pointerenter")
      await wait(HOVER_OPEN_DELAY + 20)

      expect(el.open).toBe(false)
    })

    it("ignores the pointer on a device that cannot hover", async () => {
      stubHover(false)
      await hoverNav()
      const el = dropdown("products")

      pointer(el, "pointerenter")
      await wait(HOVER_OPEN_DELAY + 20)

      expect(el.open).toBe(false)
    })

    it("ignores a touch on a device that can hover", async () => {
      stubHover(true)
      await hoverNav()
      const el = dropdown("products")

      pointer(el, "pointerenter", "touch")
      await wait(HOVER_OPEN_DELAY + 20)

      expect(el.open).toBe(false)
    })

    it("stays open while keyboard focus is inside", async () => {
      stubHover(true)
      await hoverNav()
      const el = dropdown("products")
      el.show()
      get("products-button").focus()
      await userEvent.tab()
      expect(document.activeElement).toBe(get("editor"))

      pointer(el, "pointerleave")
      await wait(HOVER_CLOSE_DELAY + 20)

      expect(el.open).toBe(true)
    })

    it("closes on a click on the button after opening on hover", async () => {
      stubHover(true)
      await hoverNav()
      const el = dropdown("products")

      pointer(el, "pointerenter")
      await wait(HOVER_OPEN_DELAY + 20)
      expect(el.open).toBe(true)

      await userEvent.click(get("products-button"))
      await settle()

      expect(el.open).toBe(false)
    })

    it("stops watching when it leaves the document", async () => {
      stubHover(true)
      await hoverNav()
      const el = dropdown("products")

      pointer(el, "pointerenter")
      el.remove()
      await wait(HOVER_OPEN_DELAY + 20)

      expect(el.open).toBe(false)
    })
  })
})
