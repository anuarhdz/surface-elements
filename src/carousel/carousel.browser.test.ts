import { fixture, fixtureCleanup } from "@open-wc/testing-helpers"
import axe from "axe-core"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { userEvent } from "vitest/browser"

import "./carousel.js"
import {
  CLONE_ATTRIBUTE,
  CURRENT_ATTRIBUTE,
  type SurfaceCarousel,
} from "./carousel.js"

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

// Whether `check` passes within `frames` frames.
async function until(check: () => boolean, frames = 180): Promise<boolean> {
  if (check()) return true

  if (frames === 0) return false

  await frame()

  return until(check, frames - 1)
}

const slides = (count: number, prefix = "s") =>
  Array.from(
    { length: count },
    (_, i) => `<div id="${prefix}${i}" style="block-size: 100px">${i}</div>`
  ).join("")

const carousel = (attributes = "", count = 4, style = "") =>
  fixture<SurfaceCarousel>(`
    <surface-carousel aria-label="Featured" ${attributes}
      style="display: block; inline-size: 400px; ${style}">
      <div data-surface-carousel="track">${slides(count)}</div>
      <button type="button" data-surface-carousel="prev" aria-label="Previous">‹</button>
      <button type="button" data-surface-carousel="next" aria-label="Next">›</button>
      <button type="button" data-surface-carousel="play">Autoplay</button>
      <nav data-surface-carousel="markers" aria-label="Slides">
        ${Array.from({ length: count }, (_, i) => `<a href="#s${i}" aria-label="Slide ${i + 1}"></a>`).join("")}
      </nav>
    </surface-carousel>
  `)

const part = (el: SurfaceCarousel, name: string): HTMLElement => {
  const found = el.querySelector<HTMLElement>(
    `[data-surface-carousel="${name}"]`
  )

  if (!found) throw new Error(`Missing ${name}`)

  return found
}

const markers = (el: SurfaceCarousel) => [
  ...el.querySelectorAll<HTMLElement>('[data-surface-carousel="markers"] a'),
]

// The slide in view lines up with the track's start edge.
const inView = (el: SurfaceCarousel, i: number): boolean => {
  const slide = el.slides[i]
  const track = el.track

  if (!slide || !track) return false

  const offset =
    slide.getBoundingClientRect().left - track.getBoundingClientRect().left

  return Math.abs(offset) < 1
}

describe("surface-carousel in a browser", () => {
  afterEach(() => fixtureCleanup())

  it("steps with the buttons and disables them at the edges", async () => {
    const el = await carousel()
    const prev = part(el, "prev")
    const next = part(el, "next")

    expect(prev.getAttribute("aria-disabled")).toBe("true")
    expect(next.hasAttribute("aria-disabled")).toBe(false)

    next.click()
    expect(await until(() => el.index === 1 && inView(el, 1))).toBe(true)
    expect(await until(() => !prev.hasAttribute("aria-disabled"))).toBe(true)

    await el.goTo(3, { behavior: "instant" })
    expect(
      await until(() => next.getAttribute("aria-disabled") === "true")
    ).toBe(true)
    expect(el.index).toBe(3)

    // Disabled buttons do nothing.
    next.click()
    await frame()
    await frame()
    expect(el.index).toBe(3)
  })

  it("marks the current slide and marker", async () => {
    const el = await carousel()
    await el.goTo(2)

    expect(el.slides[2]?.hasAttribute(CURRENT_ATTRIBUTE)).toBe(true)
    expect(el.slides[0]?.hasAttribute(CURRENT_ATTRIBUTE)).toBe(false)
    expect(markers(el).map((m) => m.getAttribute("aria-current"))).toEqual([
      null,
      null,
      "true",
      null,
    ])
  })

  it("fires surface-carousel-change once per settled slide", async () => {
    const el = await carousel()
    const seen: number[] = []
    el.addEventListener("surface-carousel-change", (event) => {
      seen.push(event.detail.index)
      expect(event.detail.slide).toBe(el.slides[event.detail.index])
    })

    await el.next()
    await el.next()
    await el.goTo(2)

    expect(seen).toEqual([1, 2])
  })

  it("scrolls to an anchor marker's slide without touching the URL", async () => {
    const el = await carousel()
    const hash = location.hash
    const pageScroll = scrollY

    markers(el)[3]?.click()
    expect(await until(() => el.index === 3 && inView(el, 3))).toBe(true)

    expect(location.hash).toBe(hash)
    expect(scrollY).toBe(pageScroll)
  })

  it("steps with the arrow keys, Home and End on the track", async () => {
    const el = await carousel()
    const track = el.track

    if (!track) throw new Error("Missing track")

    const press = (key: string) =>
      track.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
      )

    expect(press("ArrowRight")).toBe(false)
    expect(await until(() => el.index === 1 && inView(el, 1))).toBe(true)

    press("End")
    expect(await until(() => el.index === 3 && inView(el, 3))).toBe(true)

    press("ArrowLeft")
    expect(await until(() => el.index === 2 && inView(el, 2))).toBe(true)

    press("Home")
    expect(await until(() => el.index === 0 && inView(el, 0))).toBe(true)
  })

  it("resolves a step to a slide the track cannot align", async () => {
    // Three in view: the last slide never reaches the start edge.
    const el = await carousel("", 4, "--surface-carousel-per-view: 3")
    await el.goTo(3, { behavior: "instant" })

    const timeout = new Promise((resolve) => setTimeout(resolve, 1000, "stuck"))

    expect(await Promise.race([el.goTo(3).then(() => "done"), timeout])).toBe(
      "done"
    )
    expect(await Promise.race([el.prev().then(() => "done"), timeout])).toBe(
      "done"
    )
    expect(el.index).toBe(0)
  })

  it("cancels a step that a newer one takes back before it starts", async () => {
    const el = await carousel()

    void el.next()
    await el.prev()
    await sleep(600)

    expect(el.index).toBe(0)
    expect(inView(el, 0)).toBe(true)
    expect(Math.abs(el.track?.scrollLeft ?? 1)).toBeLessThan(1)
  })

  it("lets a newer step replace one still under way", async () => {
    const el = await carousel()

    void el.next()
    await frame()
    await frame()
    await el.goTo(3, { behavior: "instant" })
    await sleep(600)

    expect(el.index).toBe(3)
    expect(inView(el, 3)).toBe(true)
  })

  it("resolves steps with percentage scroll padding", async () => {
    const el = await carousel("", 4, "--surface-carousel-per-view: 2")
    const track = el.track

    if (!track) throw new Error("Missing track")

    // 10% of the 400 px scrollport is 40 px, not 10 px.
    track.style.scrollPaddingInline = "10%"
    await el.goTo(0, { behavior: "instant" })

    const timeout = new Promise((resolve) => setTimeout(resolve, 1500, "stuck"))

    expect(await Promise.race([el.next().then(() => "done"), timeout])).toBe(
      "done"
    )
    expect(el.index).toBe(1)
  })

  it("sets itself up when the track arrives after it connects", async () => {
    const el = document.createElement("surface-carousel")
    document.body.append(el)
    el.innerHTML = `<div data-surface-carousel="track">${slides(3, "late")}</div>`

    try {
      expect(
        await until(() => el.track?.getAttribute("tabindex") === "0")
      ).toBe(true)
      expect(el.slides[0]?.getAttribute("aria-label")).toBe("1 of 3")

      el.style.cssText = "display: block; inline-size: 400px"
      await el.next()
      expect(el.index).toBe(1)
    } finally {
      el.remove()
    }
  })

  it("follows the reader's own scroll", async () => {
    const el = await carousel()
    el.track?.scrollTo({ left: 2 * 416, behavior: "instant" })

    expect(await until(() => el.index === 2)).toBe(true)
  })
})

describe("surface-carousel loop", () => {
  afterEach(() => fixtureCleanup())

  it("wraps from the last slide to the first and back", async () => {
    const el = await carousel("loop")
    const next = part(el, "next")

    expect(part(el, "prev").hasAttribute("aria-disabled")).toBe(false)
    expect(inView(el, 0)).toBe(true)

    await el.goTo(3, { behavior: "instant" })
    expect(await until(() => inView(el, 3))).toBe(true)

    next.click()
    // Lands on the copy, then swaps it for the first slide in place.
    expect(await until(() => el.index === 0 && inView(el, 0))).toBe(true)
    await until(
      () =>
        !el.track?.querySelector(`[${CLONE_ATTRIBUTE}][${CURRENT_ATTRIBUTE}]`)
    )

    await el.prev()
    expect(el.index).toBe(3)
    expect(inView(el, 3)).toBe(true)
  })

  it("keeps count through quick clicks past the copies", async () => {
    const el = await carousel("loop")
    const next = part(el, "next")

    const clicks = async (n: number): Promise<void> => {
      if (n === 0) return

      next.click()
      await new Promise((resolve) => setTimeout(resolve, 40))

      return clicks(n - 1)
    }

    // Seven steps from 0 over four slides end on slide 3.
    await clicks(7)

    expect(await until(() => el.index === 3 && inView(el, 3), 300)).toBe(true)
  })

  it("wraps goTo out of range", async () => {
    const el = await carousel("loop")

    await el.goTo(-1, { behavior: "instant" })
    expect(el.index).toBe(3)

    await el.goTo(5, { behavior: "instant" })
    expect(el.index).toBe(1)
  })

  it("wraps right to left", async () => {
    const el = await carousel('loop dir="rtl"')

    await el.prev()
    expect(el.index).toBe(3)

    const slide = el.slides[3]
    const track = el.track

    if (!slide || !track) throw new Error("Missing slide")

    expect(
      Math.abs(
        slide.getBoundingClientRect().right -
          track.getBoundingClientRect().right
      )
    ).toBeLessThan(1)
  })

  it("makes the copies inert and keeps ids unique", async () => {
    const el = await carousel("loop")
    const clones = el.track?.querySelectorAll(`[${CLONE_ATTRIBUTE}]`) ?? []

    expect(clones.length).toBeGreaterThan(0)

    for (const clone of clones) {
      expect(clone.matches(":is([inert], [aria-hidden='true'])")).toBe(true)
      expect(clone.querySelector("[id]")).toBeNull()
    }

    expect(document.querySelectorAll("#s0")).toHaveLength(1)
  })
})

// Autoplay waits while the carousel is off screen. These tests say what is
// on screen, instead of depending on where the runner's iframe sits.
const visibility: Array<(visible: boolean) => void> = []

class FakeIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = "0px"
  readonly scrollMargin = "0px"
  readonly thresholds = [0]
  readonly #callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.#callback = callback
  }

  observe(target: Element): void {
    const report = (visible: boolean) =>
      this.#callback(
        // SAFETY: the web component reads only isIntersecting.
        [{ isIntersecting: visible, target } as IntersectionObserverEntry],
        this
      )

    visibility.push(report)
    report(true)
  }

  disconnect(): void {}

  unobserve(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

const setVisible = (visible: boolean) => {
  for (const report of visibility) report(visible)
}

// Autoplay pauses under the mouse, and the test runner can leave the real
// pointer anywhere (over the carousel in CI). Park it on a spot of its own.
async function pointerAway(): Promise<void> {
  const spot = document.createElement("div")
  spot.style.cssText =
    "position: fixed; inset: auto 0 0 auto; inline-size: 8px; block-size: 8px"
  document.body.append(spot)
  await userEvent.hover(spot)
  spot.remove()
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe("surface-carousel autoplay", () => {
  beforeEach(async () => {
    visibility.length = 0
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver)
    await pointerAway()
  })

  afterEach(() => {
    fixtureCleanup()
    vi.unstubAllGlobals()
  })

  it("advances on its own and stops for good on focus", async () => {
    const el = await carousel('autoplay interval="1000" loop')
    const toggle = part(el, "play")

    expect(el.playing).toBe(true)
    expect(toggle.getAttribute("aria-pressed")).toBe("true")
    expect(el.matches(":state(playing)")).toBe(true)

    const advanced = await until(() => el.index === 1, 120)
    expect(advanced).toBe(true)

    el.track?.focus()
    expect(el.playing).toBe(false)
    expect(toggle.getAttribute("aria-pressed")).toBe("false")
  })

  it("restarts from the play button, which keeps it playing when focused", async () => {
    const el = await carousel()
    const toggle = part(el, "play")

    expect(el.playing).toBe(false)

    toggle.focus()
    toggle.click()
    expect(el.playing).toBe(true)

    toggle.click()
    expect(el.playing).toBe(false)
  })

  it("waits while off screen", async () => {
    const el = await carousel('autoplay interval="1000" loop')
    setVisible(false)

    await sleep(1300)
    expect(el.index).toBe(0)
    expect(el.playing).toBe(true)

    setVisible(true)
    const advanced = await until(() => el.index === 1, 120)
    expect(advanced).toBe(true)
  })

  it("waits while the mouse is over it", async () => {
    const el = await carousel('autoplay interval="1000" loop')
    const track = el.track

    if (!track) throw new Error("Missing track")

    await userEvent.hover(track)
    await sleep(1300)
    expect(el.index).toBe(0)
    expect(el.playing).toBe(true)

    await pointerAway()
    expect(await until(() => el.index === 1, 120)).toBe(true)
  })

  it("rewinds to the first slide without loop", async () => {
    const el = await carousel('interval="1000"', 2)
    await el.goTo(1, { behavior: "instant" })

    el.play()
    const rewound = await until(() => el.index === 0 && inView(el, 0), 120)
    expect(rewound).toBe(true)
  })
})

// A mouse drag on the track: `distance` pixels to the right (negative is
// left) in `steps` moves, `ms` apart, then a pause before letting go.
async function mouseDrag(
  el: SurfaceCarousel,
  distance: number,
  { steps = 10, ms = 16, pause = 0 } = {}
): Promise<void> {
  const target = el.slides[0]?.parentElement?.firstElementChild
  const box = el.track?.getBoundingClientRect()

  if (!(target instanceof HTMLElement) || !box) throw new Error("Missing track")

  const y = box.top + box.height / 2
  const x = box.left + box.width / 2

  const send = (node: Element, type: string, clientX: number) =>
    node.dispatchEvent(
      new PointerEvent(type, {
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
        clientX,
        clientY: y,
        bubbles: true,
        cancelable: true,
      })
    )

  send(target, "pointerdown", x)

  const move = async (i: number): Promise<void> => {
    if (i > steps) return

    await sleep(ms)
    send(target, "pointermove", x + (distance * i) / steps)

    return move(i + 1)
  }

  await move(1)
  await sleep(pause)
  send(target, "pointerup", x + distance)
}

describe("surface-carousel drag", () => {
  afterEach(() => fixtureCleanup())

  it("settles a slow drag on the nearest slide", async () => {
    const el = await carousel("drag")

    // 150 of 400 px, then a stop: under half a slide, no speed left.
    await mouseDrag(el, -150, { pause: 150 })
    expect(await until(() => inView(el, 0))).toBe(true)
    expect(el.index).toBe(0)

    await mouseDrag(el, -250, { pause: 150 })
    expect(await until(() => el.index === 1 && inView(el, 1))).toBe(true)
  })

  it("goes on to the next slide on a quick flick", async () => {
    const el = await carousel("drag")

    await mouseDrag(el, -60, { steps: 4, ms: 8 })
    expect(await until(() => el.index === 1 && inView(el, 1))).toBe(true)

    await mouseDrag(el, 60, { steps: 4, ms: 8 })
    expect(await until(() => el.index === 0 && inView(el, 0))).toBe(true)
  })

  it("follows the pointer without snapping, then gives snapping back", async () => {
    const el = await carousel("drag")
    const track = el.track

    if (!track) throw new Error("Missing track")

    // The author's own inline value comes back, not the stylesheet's.
    track.style.scrollSnapType = "x mandatory"

    const done = mouseDrag(el, -100, { pause: 100 })
    expect(await until(() => el.matches(":state(dragging)"))).toBe(true)
    expect(track.style.scrollSnapType).toBe("none")
    expect(Math.abs(track.scrollLeft)).toBeGreaterThan(0)

    await done
    expect(el.matches(":state(dragging)")).toBe(false)
    expect(
      await until(() => track.style.scrollSnapType === "x mandatory")
    ).toBe(true)
  })

  it("can be grabbed again while it settles", async () => {
    const el = await carousel("drag")
    const track = el.track

    if (!track) throw new Error("Missing track")

    track.style.scrollSnapType = "x mandatory"

    // Let go, then grab again at once, before the track comes to rest.
    await mouseDrag(el, -150, { pause: 100 })
    await mouseDrag(el, -250, { pause: 150 })
    expect(await until(() => el.index === 1 && inView(el, 1))).toBe(true)
    expect(
      await until(() => track.style.scrollSnapType === "x mandatory")
    ).toBe(true)
  })

  it("swallows the click that ends a drag, not a plain click", async () => {
    const el = await carousel("drag")
    let clicks = 0
    el.track?.addEventListener("click", () => clicks++)

    await mouseDrag(el, -100, { pause: 100 })
    el.slides[0]?.click()
    expect(clicks).toBe(0)

    await sleep(20)
    el.slides[0]?.click()
    expect(clicks).toBe(1)
  })

  it("drags past the ends with loop", async () => {
    const el = await carousel("drag loop")

    // 700 px is 1.7 slides (416 px each) to the right of the first, so the
    // nearest is two back: past the start, to the last but one.
    await mouseDrag(el, 700, { steps: 30, pause: 150 })
    expect(await until(() => el.index === 2 && inView(el, 2), 240)).toBe(true)
  })

  it("does nothing without the drag attribute", async () => {
    const el = await carousel()

    await mouseDrag(el, -300, { pause: 100 })
    await frame()
    expect(el.track?.scrollLeft).toBe(0)
    expect(el.matches(":state(dragging)")).toBe(false)
  })

  it("stops native drag and drop of images and links", async () => {
    const el = await carousel("drag")

    const event = new DragEvent("dragstart", {
      bubbles: true,
      cancelable: true,
    })

    el.slides[0]?.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })
})

describe("surface-carousel accessibility", () => {
  afterEach(() => fixtureCleanup())

  it("is a labelled carousel region with slides", async () => {
    const el = await carousel("loop")
    const [first] = el.slides

    expect(el.track?.tabIndex).toBe(0)
    expect(first?.getAttribute("role")).toBe("group")
    expect(first?.getAttribute("aria-roledescription")).toBe("slide")
    expect(first?.getAttribute("aria-label")).toBe("1 of 4")
  })

  it("passes axe", async () => {
    const el = await carousel("loop autoplay")
    const results = await axe.run(el)

    expect(results.violations).toEqual([])
  })
})
