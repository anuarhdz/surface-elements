import { fixture, fixtureCleanup, html } from "@open-wc/testing-helpers"
import axe from "axe-core"
import { afterEach, describe, expect, it, vi } from "vitest"

import "./accordion.js"
import { supportsDetailsAnimation, type SurfaceAccordion } from "./accordion.js"

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

// Waits until no item of the accordion is animating.
async function settle(el: SurfaceAccordion, frames = 120): Promise<void> {
  await frame()

  if (el.items.every((item) => item.getAnimations().length === 0)) return

  if (frames === 0) throw new Error("Animations did not settle")

  return settle(el, frames - 1)
}

// Pretends the browser cannot animate ::details-content.
const fallback = () => vi.spyOn(CSS, "supports").mockReturnValue(false)

const accordion = () =>
  fixture<SurfaceAccordion>(html`
    <surface-accordion style="--surface-accordion-duration: 60ms">
      <details name="faq">
        <summary>One</summary>
        <p style="block-size: 200px; margin: 0">First</p>
      </details>
      <details name="faq">
        <summary>Two</summary>
        <p style="block-size: 200px; margin: 0">Second</p>
      </details>
    </surface-accordion>
  `)

function items(el: SurfaceAccordion): [HTMLDetailsElement, HTMLDetailsElement] {
  const [first, second] = el.items

  if (!first || !second) throw new Error("Missing items")

  return [first, second]
}

const summaryOf = (item: HTMLDetailsElement): HTMLElement => {
  const summary = item.querySelector<HTMLElement>(":scope > summary")

  if (!summary) throw new Error("Missing summary")

  return summary
}

describe("surface-accordion in a browser", () => {
  afterEach(() => {
    fixtureCleanup()
    vi.restoreAllMocks()
  })

  it("leaves the animation to CSS where the browser supports it", async () => {
    expect(supportsDetailsAnimation()).toBe(true)

    const el = await accordion()
    el.style.setProperty("--surface-accordion-duration", "1s")
    const [first] = items(el)
    await frame()

    summaryOf(first).click()
    expect(first.open).toBe(true)
    expect(first.getAnimations()).toHaveLength(0)

    // The styles transition ::details-content to its auto height.
    await frame()
    await frame()

    const size = Number.parseFloat(
      getComputedStyle(first, "::details-content").blockSize
    )

    expect(size).toBeGreaterThan(0)
    expect(size).toBeLessThan(200)
  })

  it("resolves toggle() when the CSS transition ends", async () => {
    const el = await accordion()
    const [first] = items(el)

    await el.toggle(first, true)

    expect(first.getAnimations({ subtree: true })).toHaveLength(0)
    expect(
      Number.parseFloat(getComputedStyle(first, "::details-content").blockSize)
    ).toBe(200)
  })

  it("has no accessibility violations", async () => {
    const el = await accordion()
    const [first] = items(el)
    first.open = true

    const results = await axe.run(el)
    expect(results.violations).toEqual([])
  })

  describe("fallback animation", () => {
    it("animates open from the summary height to the full height", async () => {
      fallback()
      const el = await accordion()
      const [first] = items(el)
      const closed = first.getBoundingClientRect().height

      summaryOf(first).click()
      expect(first.open).toBe(true)
      expect(first.getAnimations().length).toBeGreaterThan(0)
      expect(first.getBoundingClientRect().height).toBeLessThan(closed + 10)

      await settle(el)
      expect(first.getBoundingClientRect().height).toBeGreaterThan(200)
    })

    it("keeps a closing item open and marked until the animation ends", async () => {
      fallback()
      const el = await accordion()
      const [first] = items(el)
      first.open = true

      summaryOf(first).click()
      expect(first.open).toBe(true)
      expect(first.hasAttribute("data-closing")).toBe(true)

      await settle(el)
      expect(first.open).toBe(false)
      expect(first.hasAttribute("data-closing")).toBe(false)
    })

    it("animates the open sibling closed in an exclusive group", async () => {
      fallback()
      const el = await accordion()
      const [first, second] = items(el)
      first.open = true

      summaryOf(second).click()
      expect(second.open).toBe(true)
      expect(first.open).toBe(true)
      expect(first.hasAttribute("data-closing")).toBe(true)

      await settle(el)
      expect(first.open).toBe(false)
      expect(first.getAttribute("name")).toBe("faq")
      expect(second.open).toBe(true)
    })

    it("reverses a close that is still running", async () => {
      fallback()
      const el = await accordion()
      const [first] = items(el)
      first.open = true

      summaryOf(first).click()
      await frame()
      summaryOf(first).click()

      await settle(el)
      expect(first.open).toBe(true)
      expect(first.hasAttribute("data-closing")).toBe(false)
      expect(first.getAttribute("name")).toBe("faq")
    })

    it("animates toggle() and resolves when done", async () => {
      fallback()
      const el = await accordion()
      const [first, second] = items(el)

      await el.toggle(first, true)
      expect(first.open).toBe(true)
      expect(first.getAnimations()).toHaveLength(0)

      await el.toggle(second)
      await settle(el)
      expect(first.open).toBe(false)
      expect(second.open).toBe(true)
    })

    it("lets controls inside the summary work without toggling", async () => {
      fallback()

      const el = await fixture<SurfaceAccordion>(html`
        <surface-accordion>
          <details>
            <summary>One <button type="button">Info</button></summary>
            <p>First</p>
          </details>
        </surface-accordion>
      `)

      const [first] = el.items

      first?.querySelector("button")?.click()
      expect(first?.open).toBe(false)
    })
  })
})

describe("surface-accordion disabled and persist", () => {
  afterEach(() => {
    fixtureCleanup()
    vi.restoreAllMocks()
  })

  it("leaves an item with an aria-disabled summary as it is", async () => {
    const el = await fixture<SurfaceAccordion>(html`
      <surface-accordion>
        <details>
          <summary aria-disabled="true">Locked</summary>
          <p>Content</p>
        </details>
      </surface-accordion>
    `)

    const [item] = el.items

    if (!item) throw new Error("Missing item")

    summaryOf(item).click()
    expect(item.open).toBe(false)

    await el.toggle(item, true)
    expect(item.open).toBe(false)
  })

  it("opens the first item and keeps the last open one open", async () => {
    const el = await fixture<SurfaceAccordion>(html`
      <surface-accordion persist>
        <details name="p">
          <summary>One</summary>
          <p>First</p>
        </details>
        <details name="p">
          <summary>Two</summary>
          <p>Second</p>
        </details>
      </surface-accordion>
    `)

    const [first, second] = items(el)

    expect(first.open).toBe(true)
    expect(summaryOf(first).getAttribute("aria-disabled")).toBe("true")

    summaryOf(first).click()
    expect(first.open).toBe(true)

    summaryOf(second).click()
    await frame()
    await settle(el)

    expect(first.open).toBe(false)
    expect(second.open).toBe(true)
    expect(summaryOf(first).hasAttribute("aria-disabled")).toBe(false)
    expect(summaryOf(second).getAttribute("aria-disabled")).toBe("true")
  })

  it("gives the summary back when persist is removed", async () => {
    const el = await fixture<SurfaceAccordion>(html`
      <surface-accordion persist>
        <details>
          <summary>One</summary>
          <p>First</p>
        </details>
      </surface-accordion>
    `)

    const [item] = el.items

    if (!item) throw new Error("Missing item")

    el.removeAttribute("persist")
    expect(summaryOf(item).hasAttribute("aria-disabled")).toBe(false)

    summaryOf(item).click()
    expect(item.open).toBe(false)
  })

  it("keeps an item open in the fallback too", async () => {
    fallback()

    const el = await fixture<SurfaceAccordion>(html`
      <surface-accordion persist>
        <details>
          <summary>One</summary>
          <p>First</p>
        </details>
        <details>
          <summary>Two</summary>
          <p>Second</p>
        </details>
      </surface-accordion>
    `)

    const [first, second] = items(el)

    summaryOf(second).click()
    await settle(el)
    summaryOf(first).click()
    await settle(el)

    expect(first.open).toBe(false)
    expect(second.open).toBe(true)

    summaryOf(second).click()
    await settle(el)
    expect(second.open).toBe(true)
  })
})
