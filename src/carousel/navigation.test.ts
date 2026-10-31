import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Navigation, type Scroller } from "./navigation.js"

// A track that moves only when the test says so: `at` is the slide in place.
function fakeTrack() {
  const slides: HTMLElement[] = Array.from({ length: 4 }, () =>
    document.createElement("div")
  )

  const calls: string[] = []
  let at = slides[0]

  const scroller: Scroller = {
    reached: (el) => at === el,
    scrollTo: (el, behavior) =>
      calls.push(`scroll ${slides.indexOf(el)} ${behavior}`),
    stop: () => calls.push("stop"),
  }

  return {
    slides,
    calls,
    scroller,
    set at(el: HTMLElement) {
      at = el
    },
  }
}

function setup() {
  const track = fakeTrack()
  const rests: boolean[] = []
  const nav = new Navigation(track.scroller, (final) => rests.push(final))

  const slide = (i: number): HTMLElement => {
    const el = track.slides[i]

    if (!el) throw new Error(`No slide ${i}`)

    return el
  }

  // The track arrives at slide `i` and fires scrollend.
  const arrive = (i: number) => {
    track.at = slide(i)
    nav.scrolled()
    nav.ended()
    vi.advanceTimersByTime(0)
  }

  return { track, nav, rests, slide, arrive }
}

// Collects which promises have resolved.
function tracker() {
  const done = new Set<string>()

  return {
    done,
    watch: (name: string, promise: Promise<void>) => {
      void promise.then(() => done.add(name))
    },
  }
}

const flush = () => Promise.resolve().then(() => Promise.resolve())

describe("Navigation", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Pretend the browser fires scrollend, as Chromium and Firefox do.
    Object.defineProperty(window, "onscrollend", {
      value: null,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    Reflect.deleteProperty(window, "onscrollend")
  })

  it("resolves a trip when the track arrives and rests", async () => {
    const { nav, track, rests, slide, arrive } = setup()
    const { done, watch } = tracker()

    watch("a", nav.go(slide(1), "smooth"))
    expect(track.calls).toEqual(["scroll 1 smooth"])

    await flush()
    expect(done.has("a")).toBe(false)

    arrive(1)
    await flush()
    expect(done.has("a")).toBe(true)
    expect(rests).toEqual([true])
  })

  it("keeps waiting when the track rests short of the slide", async () => {
    const { nav, track, slide } = setup()
    const { done, watch } = tracker()

    watch("a", nav.go(slide(2), "smooth"))
    // A jump inside a series of steps ends a scroll of its own.
    track.at = slide(1)
    nav.ended()
    vi.advanceTimersByTime(0)
    await flush()

    expect(done.has("a")).toBe(false)
    expect(nav.heading).toBe(slide(2))
  })

  it("resolves at once when the slide is already in place", async () => {
    const { nav, track, slide, rests } = setup()
    const { done, watch } = tracker()

    watch("a", nav.go(slide(0), "smooth"))
    await flush()
    expect(done.has("a")).toBe(true)
    expect(track.calls).toEqual([])

    vi.advanceTimersByTime(0)
    expect(rests).toEqual([true])
  })

  it("stops a trip still on its way for a newer one, and resolves it", async () => {
    const { nav, track, slide, arrive } = setup()
    const { done, watch } = tracker()

    watch("a", nav.go(slide(1), "smooth"))
    watch("b", nav.go(slide(2), "smooth"))
    await flush()

    expect(track.calls).toEqual(["scroll 1 smooth", "stop", "scroll 2 smooth"])
    expect(done.has("a")).toBe(true)
    expect(done.has("b")).toBe(false)

    arrive(2)
    await flush()
    expect(done.has("b")).toBe(true)
  })

  it("queues behind a trip that arrived but has not ended", async () => {
    const { nav, track, slide, rests, arrive } = setup()
    const { done, watch } = tracker()

    watch("a", nav.go(slide(1), "instant"))
    track.at = slide(1)
    watch("b", nav.go(slide(2), "instant"))
    watch("c", nav.go(slide(3), "instant"))

    // Queued, not started: the arrived trip still ends first.
    expect(track.calls).toEqual(["scroll 1 instant"])
    expect(nav.heading).toBe(slide(3))
    await flush()
    // The newer queued trip supersedes the older one.
    expect(done.has("b")).toBe(true)

    nav.ended()
    vi.advanceTimersByTime(0)
    await flush()

    // Rest without a final pass, then the queued trip starts.
    expect(rests).toEqual([false])
    expect(done.has("a")).toBe(true)
    expect(track.calls).toEqual(["scroll 1 instant", "scroll 3 instant"])

    arrive(3)
    await flush()
    expect(done.has("c")).toBe(true)
    expect(rests).toEqual([false, true])
  })

  it("resolves every trip when abandoned", async () => {
    const { nav, track, slide } = setup()
    const { done, watch } = tracker()

    watch("a", nav.go(slide(1), "instant"))
    track.at = slide(1)
    watch("b", nav.go(slide(2), "instant"))
    nav.abandon()
    await flush()

    expect(done).toEqual(new Set(["a", "b"]))
    expect(nav.heading).toBeUndefined()
    expect(nav.destinations).toEqual([])
  })

  it("gives up a trip that stalls, with no scroll for a second", async () => {
    const { nav, slide } = setup()
    const { done, watch } = tracker()

    watch("a", nav.go(slide(2), "smooth"))
    vi.advanceTimersByTime(999)
    await flush()
    expect(done.has("a")).toBe(false)

    vi.advanceTimersByTime(1)
    await flush()
    expect(done.has("a")).toBe(true)
  })

  it("does not give up a trip that keeps scrolling", async () => {
    const { nav, slide, arrive } = setup()
    const { done, watch } = tracker()

    watch("a", nav.go(slide(3), "smooth"))

    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(500)
      nav.scrolled()
    }

    await flush()
    expect(done.has("a")).toBe(false)

    arrive(3)
    await flush()
    expect(done.has("a")).toBe(true)
  })

  it("settles after a quiet period where scrollend is missing", async () => {
    Reflect.deleteProperty(window, "onscrollend")
    const { nav, track, slide, rests } = setup()
    const { done, watch } = tracker()

    watch("a", nav.go(slide(1), "smooth"))
    track.at = slide(1)
    nav.scrolled()
    vi.advanceTimersByTime(149)
    await flush()
    expect(done.has("a")).toBe(false)

    vi.advanceTimersByTime(1)
    await flush()
    expect(done.has("a")).toBe(true)
    expect(rests).toEqual([true])
  })

  it("resolves everything and stays quiet once disposed", async () => {
    const { nav, slide, rests } = setup()
    const { done, watch } = tracker()

    watch("a", nav.go(slide(2), "smooth"))
    nav.dispose()
    vi.advanceTimersByTime(5000)
    await flush()

    expect(done.has("a")).toBe(true)
    expect(rests).toEqual([])
  })
})
