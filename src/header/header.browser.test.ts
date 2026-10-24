import { fixture, fixtureCleanup, html } from "@open-wc/testing-helpers"
import axe from "axe-core"
import { afterEach, describe, expect, it } from "vitest"

import "./header.js"
import type { SurfaceHeader } from "./header.js"

function headerIn(wrapper: Element): SurfaceHeader {
  const el = wrapper.querySelector("surface-header")

  if (!el) throw new Error("Missing surface-header")

  return el
}

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

// Scrolls and waits for the scroll event and the header's frame to run.
async function scrollTo(scroller: Element, top: number): Promise<void> {
  scroller.scrollTop = top
  await frame()
  await frame()
}

// A scroll container stands in for the page, so the test owns its scroll.
async function page(attrs: { hide?: boolean } = {}) {
  const wrapper = await fixture<HTMLDivElement>(html`
    <div style="block-size: 300px; overflow: auto">
      ${
        attrs.hide
          ? html`<surface-header hide-on-scroll
              ><header style="block-size: 50px">
                <a href="#main">Home</a>
              </header></surface-header
            >`
          : html`<surface-header
              ><header style="block-size: 50px">
                <a href="#main">Home</a>
              </header></surface-header
            >`
      }
      <main id="main" style="block-size: 2000px">Content</main>
    </div>
  `)

  return { wrapper, el: headerIn(wrapper) }
}

describe("surface-header in a browser", () => {
  afterEach(() => fixtureCleanup())

  it("sticks to the top of its scroll container", async () => {
    const { wrapper, el } = await page()

    await scrollTo(wrapper, 500)

    const top = el.getBoundingClientRect().top
    expect(top).toBeCloseTo(wrapper.getBoundingClientRect().top, 0)
  })

  it("reports :state(stuck) once the container scrolls", async () => {
    const { wrapper, el } = await page()

    expect(el.matches(":state(stuck)")).toBe(false)
    await scrollTo(wrapper, 100)
    expect(el.matches(":state(stuck)")).toBe(true)
    expect(el.stuck).toBe(true)
    await scrollTo(wrapper, 0)
    expect(el.matches(":state(stuck)")).toBe(false)
  })

  it("is not stuck while it sits below the top", async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="block-size: 300px; overflow: auto">
        <div style="block-size: 200px">Banner</div>
        <surface-header><header>Site</header></surface-header>
        <main style="block-size: 2000px">Content</main>
      </div>
    `)

    const el = headerIn(wrapper)

    await scrollTo(wrapper, 100)
    expect(el.stuck).toBe(false)
    await scrollTo(wrapper, 400)
    expect(el.stuck).toBe(true)
  })

  it("publishes its height on the scroll container", async () => {
    const { wrapper } = await page()
    await frame()

    expect(wrapper.style.getPropertyValue("--surface-header-height")).toBe(
      "50px"
    )
  })

  it("stays visible without hide-on-scroll", async () => {
    const { wrapper, el } = await page()

    await scrollTo(wrapper, 400)
    expect(el.matches(":state(hidden)")).toBe(false)
  })

  it("hides on scroll down and shows on scroll up", async () => {
    const { wrapper, el } = await page({ hide: true })

    await scrollTo(wrapper, 400)
    expect(el.matches(":state(hidden)")).toBe(true)
    await scrollTo(wrapper, 300)
    expect(el.matches(":state(hidden)")).toBe(false)
  })

  it("does not hide before scrolling past its own height", async () => {
    const { wrapper, el } = await page({ hide: true })

    await scrollTo(wrapper, 30)
    expect(el.matches(":state(hidden)")).toBe(false)
  })

  it("shows when focus moves inside", async () => {
    const { wrapper, el } = await page({ hide: true })

    await scrollTo(wrapper, 400)
    expect(el.matches(":state(hidden)")).toBe(true)
    el.querySelector("a")?.focus()
    expect(el.matches(":state(hidden)")).toBe(false)
  })

  it("does not hide while focus is inside", async () => {
    const { wrapper, el } = await page({ hide: true })

    el.querySelector("a")?.focus()
    await scrollTo(wrapper, 400)
    expect(el.matches(":state(hidden)")).toBe(false)
  })

  it("shows when hide-on-scroll is removed", async () => {
    const { wrapper, el } = await page({ hide: true })

    await scrollTo(wrapper, 400)
    el.removeAttribute("hide-on-scroll")
    expect(el.matches(":state(hidden)")).toBe(false)
  })

  it("has no accessibility violations", async () => {
    const { el } = await page()

    const { violations } = await axe.run(el)
    expect(violations).toEqual([])
  })
})
