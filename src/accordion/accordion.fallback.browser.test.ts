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

import "./accordion.js"
import type { SurfaceAccordion } from "./accordion.js"
import { adoptAccordionStyles } from "./styles.js"

// The Web Animations fallback, alone: the browser is told it cannot animate
// ::details-content, and the styles' @supports block, which Chromium would
// still apply, is removed. Its own file, so the CSS-path tests keep the sheet.
beforeAll(() => {
  adoptAccordionStyles()

  for (const sheet of document.adoptedStyleSheets) {
    const layer = sheet.cssRules[0]

    if (!(layer instanceof CSSLayerBlockRule)) continue

    for (let i = layer.cssRules.length - 1; i >= 0; i--) {
      if (layer.cssRules[i] instanceof CSSSupportsRule) layer.deleteRule(i)
    }
  }
})

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

// The first block-size keyframe of the item's height animation, in px.
const startHeight = (item: HTMLDetailsElement): number => {
  const [animation] = item.getAnimations()

  const [first] =
    animation?.effect instanceof KeyframeEffect
      ? animation.effect.getKeyframes()
      : []

  return Number.parseFloat(String(first?.["blockSize"]))
}

describe("surface-accordion fallback animation", () => {
  afterEach(() => {
    fixtureCleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.spyOn(CSS, "supports").mockReturnValue(false)
  })

  it("animates open from the summary height to the full height", async () => {
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

  it("keeps an item open in the fallback too", async () => {
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

  it("animates the clicked item open with persist and a shared name", async () => {
    const el = await fixture<SurfaceAccordion>(html`
      <surface-accordion persist style="--surface-accordion-duration: 200ms">
        <details name="g">
          <summary>One</summary>
          <p style="block-size: 200px; margin: 0">1</p>
        </details>
        <details name="g">
          <summary>Two</summary>
          <p style="block-size: 200px; margin: 0">2</p>
        </details>
        <details name="g">
          <summary>Three</summary>
          <p style="block-size: 200px; margin: 0">3</p>
        </details>
      </surface-accordion>
    `)

    const [one, two, three] = el.items

    if (!one || !two || !three) throw new Error("Missing items")

    const toggles: string[] = []
    el.addEventListener(
      "toggle",
      (event) => {
        const item = event.target

        if (item instanceof HTMLDetailsElement) {
          toggles.push(
            `${summaryOf(item).textContent}:${item.open ? "open" : "closed"}`
          )
        }
      },
      true
    )

    summaryOf(three).click()
    expect(startHeight(three)).toBeLessThan(50)

    await settle(el)
    await frame()

    expect(toggles).toEqual(["Three:open", "One:closed"])
    expect(two.open).toBe(false)
    expect(three.open).toBe(true)
    expect(summaryOf(three).getAttribute("aria-disabled")).toBe("true")
    expect(summaryOf(one).hasAttribute("aria-disabled")).toBe(false)
  })

  it("resolves a calc() duration", async () => {
    const el = await fixture<SurfaceAccordion>(html`
      <surface-accordion style="--surface-accordion-duration: calc(0.1s * 2)">
        <details>
          <summary>One</summary>
          <p>First</p>
        </details>
      </surface-accordion>
    `)

    const [item] = el.items

    if (!item) throw new Error("Missing item")

    summaryOf(item).click()
    expect(item.getAnimations()[0]?.effect?.getTiming().duration).toBe(200)
    expect(item.hasAttribute("style")).toBe(false)
  })
})
