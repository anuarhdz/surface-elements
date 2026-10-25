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

  it("stops clipping an open panel once it has opened", async () => {
    const el = await accordion()
    const [first] = items(el)
    await frame()

    await el.toggle(first, true)
    expect(getComputedStyle(first, "::details-content").overflowY).toBe(
      "visible"
    )

    first.open = false
    await frame()
    await frame()
    expect(getComputedStyle(first, "::details-content").overflowY).toBe("clip")
  })

  it("resolves a replaced toggle() early", async () => {
    const el = await accordion()
    el.style.setProperty("--surface-accordion-duration", "1s")
    const [first] = items(el)
    await frame()

    let replaced = false
    const opening = el.toggle(first, true).then(() => (replaced = true))
    await frame()

    const closing = el.toggle(first, false)
    await opening
    expect(replaced).toBe(true)
    expect(first.open).toBe(false)

    await closing
  })

  it("has no accessibility violations", async () => {
    const el = await accordion()
    const [first] = items(el)
    first.open = true

    const results = await axe.run(el)
    expect(results.violations).toEqual([])
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

  it("gives the summary back when the locked item leaves", async () => {
    const el = await fixture<SurfaceAccordion>(html`
      <surface-accordion persist>
        <details name="m">
          <summary>One</summary>
          <p>First</p>
        </details>
        <details name="m">
          <summary>Two</summary>
          <p>Second</p>
        </details>
      </surface-accordion>
    `)

    const [first, second] = items(el)

    expect(summaryOf(first).getAttribute("aria-disabled")).toBe("true")

    const other = document.createElement("surface-accordion")
    el.after(other)
    other.append(first)
    await frame()

    expect(summaryOf(first).hasAttribute("aria-disabled")).toBe(false)
    expect(second.open).toBe(true)
    other.remove()
  })

  it("reopens the first item after a programmatic close", async () => {
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

    first.open = false
    await frame()
    await frame()

    expect(first.open).toBe(true)
    expect(second.open).toBe(false)
  })
})
