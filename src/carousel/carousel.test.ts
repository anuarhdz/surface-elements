import { fixture, fixtureCleanup } from "@open-wc/testing-helpers"
import { afterEach, describe, expect, it } from "vitest"

import { CLONE_ATTRIBUTE, SurfaceCarousel } from "./carousel.js"

const carousel = (attributes = "") =>
  fixture<SurfaceCarousel>(
    `<surface-carousel aria-label="Featured" ${attributes}>
        <div data-surface-carousel="track">
          <div id="one">One</div>
          <div aria-label="Second">Two</div>
          <div role="listitem">Three</div>
        </div>
        <button data-surface-carousel="play">Autoplay</button>
        <surface-carousel>
          <div data-surface-carousel="track"><div>Nested</div></div>
        </surface-carousel>
      </surface-carousel>`
  )

describe("surface-carousel", () => {
  afterEach(() => fixtureCleanup())

  it("registers the custom element", () => {
    expect(customElements.get(SurfaceCarousel.tagName)).toBe(SurfaceCarousel)
  })

  it("adopts the carousel styles", async () => {
    await carousel()
    expect(
      document.querySelector('style[data-surface-elements="carousel"]')
    ).not.toBeNull()
  })

  it("finds its own track and slides, not a nested carousel's", async () => {
    const el = await carousel()

    expect(el.track?.parentElement).toBe(el)
    expect(el.slides.map((slide) => slide.textContent)).toEqual([
      "One",
      "Two",
      "Three",
    ])
  })

  it("labels slides without overriding the author", async () => {
    const el = await carousel()
    const [one, two, three] = el.slides

    expect(one?.getAttribute("role")).toBe("group")
    expect(one?.getAttribute("aria-roledescription")).toBe("slide")
    expect(one?.getAttribute("aria-label")).toBe("1 of 3")
    expect(two?.getAttribute("aria-label")).toBe("Second")
    expect(three?.getAttribute("role")).toBe("listitem")
    expect(el.track?.getAttribute("tabindex")).toBe("0")
  })

  it("gives back what it added when it leaves", async () => {
    const el = await carousel("loop")
    const track = el.track
    const [one, two] = el.slides
    el.remove()

    expect(track?.querySelector(`[${CLONE_ATTRIBUTE}]`)).toBeNull()
    expect(track?.hasAttribute("tabindex")).toBe(false)
    expect(one?.hasAttribute("role")).toBe(false)
    expect(one?.hasAttribute("aria-label")).toBe(false)
    expect(two?.getAttribute("aria-label")).toBe("Second")
  })

  it("adds inert copies at both ends with loop", async () => {
    const el = await carousel("loop")
    const children = [...(el.track?.children ?? [])]

    const clones = children.filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.hasAttribute(CLONE_ATTRIBUTE)
    )

    expect(el.slides).toHaveLength(3)
    expect(clones.length).toBeGreaterThan(0)
    expect(children[0]?.hasAttribute(CLONE_ATTRIBUTE)).toBe(true)
    expect(children.at(-1)?.hasAttribute(CLONE_ATTRIBUTE)).toBe(true)

    for (const clone of clones) {
      expect(clone.getAttribute("aria-hidden")).toBe("true")
      expect(clone.inert).toBe(true)
      expect(clone.hasAttribute("id")).toBe(false)
    }
  })

  it("removes the copies when loop goes away", async () => {
    const el = await carousel("loop")
    el.removeAttribute("loop")

    expect(el.track?.querySelector(`[${CLONE_ATTRIBUTE}]`)).toBeNull()
  })

  it("reflects autoplay on the play button", async () => {
    const el = await carousel("autoplay")
    const toggle = el.querySelector('[data-surface-carousel="play"]')

    expect(el.playing).toBe(true)
    expect(toggle?.getAttribute("aria-pressed")).toBe("true")

    el.pause()
    expect(el.playing).toBe(false)
    expect(toggle?.getAttribute("aria-pressed")).toBe("false")
  })
})
