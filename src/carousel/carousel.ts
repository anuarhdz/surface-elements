import { defineElement } from "../utils/define.js"
import { CLONE, CURRENT, PART } from "./attributes.js"
import { Drag } from "./drag.js"
import {
  atEnd,
  atStart,
  maxScroll,
  measurable,
  offsetOf,
  scrollByX,
  sibling,
} from "./geometry.js"
import { copiedIndex, copies } from "./loop.js"
import { Navigation, trackScroller } from "./navigation.js"
import { adoptCarouselStyles } from "./styles.js"

/** Marks the parts of a carousel: `track`, `prev`, `next`, `play`, `markers`. */
export const PART_ATTRIBUTE: string = PART

/** Set on the copies `loop` adds at both ends of the track, with the index of the slide they copy. */
export const CLONE_ATTRIBUTE: string = CLONE

/** Set on the slide (or copy) that is snapped in view. */
export const CURRENT_ATTRIBUTE: string = CURRENT

const DEFAULT_INTERVAL = 5000
const MIN_INTERVAL = 1000

/** Options for {@link SurfaceCarousel.goTo}. */
export interface CarouselScrollOptions {
  /** Defaults to `smooth`, or `instant` under `prefers-reduced-motion: reduce`. */
  behavior?: ScrollBehavior
}

/** Detail of the `surface-carousel-change` event. */
export interface CarouselChangeDetail {
  index: number
  slide: HTMLElement
}

/**
 * Web component for a carousel or slider built on a native scroll-snap
 * container. The browser does the scrolling, swiping, snapping and keyboard
 * scrolling; the web component wires the buttons and markers you write, and
 * adds an infinite `loop`, `autoplay` and mouse `drag` on top. Adds the
 * carousel styles to the document, so no CSS import is needed.
 *
 * Mark the parts with `data-surface-carousel`: the scroll container is
 * `track` and its children are the slides; `prev`, `next` and `play` are
 * buttons; `markers` holds one link or button per slide. Anchor markers
 * (`<a href="#slide-id">`) also work without JavaScript.
 *
 * The element is a `region` with the role description `carousel`, so give it
 * an `aria-label`. Slides without a role become groups described as `slide`
 * and labelled "1 of 5"; set `aria-label` and `aria-roledescription` on them
 * to use your own words.
 *
 * @tag surface-carousel
 * @slot - The track, the buttons and the markers, anywhere inside.
 * @attr {boolean} loop - Wrap around at both ends. Copies of the first and last slides are added to the track, inert and hidden from assistive technology.
 * @attr {boolean} autoplay - Advance on its own every `interval`, unless the reader prefers reduced motion. Pauses while hovered, off screen or in a hidden tab, and stops for good when the reader focuses, drags or uses a control inside.
 * @attr {number} interval - Milliseconds between autoplay steps. Defaults to 5000, at least 1000.
 * @attr {boolean} drag - Scroll by dragging with a mouse, as touch swipes do. A quick drag goes on to the next slide; a slow one settles on the nearest.
 * @cssstate playing - Autoplay is on.
 * @cssstate dragging - The reader is dragging the track with a mouse.
 * @cssprop [--surface-carousel-per-view=1] - Slides in view at once.
 * @cssprop [--surface-carousel-gap=1rem] - Space between slides.
 * @cssprop [--surface-carousel-align=start] - `scroll-snap-align` of the slides: `start`, `center` or `end`.
 * @fires {CustomEvent<CarouselChangeDetail>} surface-carousel-change - A different slide settled in view. Bubbles.
 */
export class SurfaceCarousel extends HTMLElement {
  static readonly tagName = "surface-carousel"
  static readonly observedAttributes = ["loop", "autoplay", "interval"]

  #internals: ElementInternals | undefined
  #track: HTMLElement | undefined
  // The scrolls this element starts, and the mouse drag.
  #nav: Navigation | undefined
  #drag: Drag | undefined
  #index = 0
  // The index the last change event announced.
  #announced = 0
  #cloneCount = 0
  #frame = 0
  #playTimer = 0
  #playing = false
  #hovered = false
  #onScreen = true
  // Whether the track had a size at the last resize; false while hidden.
  #measured = false
  // Attributes this element added, as opposed to the author.
  #added = new WeakMap<Element, Set<string>>()
  #mutations: MutationObserver | undefined
  #waiting: MutationObserver | undefined
  #resizes: ResizeObserver | undefined
  #intersections: IntersectionObserver | undefined

  constructor() {
    super()
    this.#internals = this.attachInternals?.()
  }

  /** The scroll container, marked `data-surface-carousel="track"`. */
  get track(): HTMLElement | null {
    return this.#own(`[${PART}="track"]`)[0] ?? null
  }

  /** The slides: the children of the track, without the copies `loop` adds. */
  get slides(): HTMLElement[] {
    return [...(this.track?.children ?? [])].filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && !el.hasAttribute(CLONE)
    )
  }

  /** Index of the slide in view, in {@link SurfaceCarousel.slides}. */
  get index(): number {
    return this.#index
  }

  /** Whether autoplay is on. */
  get playing(): boolean {
    return this.#playing
  }

  /**
   * Scrolls `index` of {@link SurfaceCarousel.slides} into view. Out of range
   * it wraps with `loop` and clamps without. Resolves when the scroll settles,
   * or when something else takes over the track first.
   */
  goTo(index: number, options: CarouselScrollOptions = {}): Promise<void> {
    const slides = this.slides
    const n = slides.length

    if (n === 0) return Promise.resolve()

    const i = this.#loops() ? mod(index, n) : clamp(index, 0, n - 1)
    const slide = slides[i]

    return slide ? this.#go(slide, options.behavior) : Promise.resolve()
  }

  /** Scrolls to the next slide. With `loop`, the last one leads to the first. */
  next(options: CarouselScrollOptions = {}): Promise<void> {
    return this.#step(1, options.behavior)
  }

  /** Scrolls to the previous slide. With `loop`, the first one leads to the last. */
  prev(options: CarouselScrollOptions = {}): Promise<void> {
    return this.#step(-1, options.behavior)
  }

  /** Starts autoplay, as the play button does. */
  play(): void {
    this.#setPlaying(true)
  }

  /** Stops autoplay until {@link SurfaceCarousel.play} or the play button. */
  pause(): void {
    this.#setPlaying(false)
  }

  connectedCallback(): void {
    adoptCarouselStyles()

    const track = this.track

    // The track can come after the element, from a framework or innerHTML:
    // set up once it is there.
    if (!track) {
      this.#waiting ??= new MutationObserver(() => {
        if (!this.track) return

        this.#waiting?.disconnect()
        this.connectedCallback()
      })
      this.#waiting.observe(this, { childList: true, subtree: true })

      return
    }

    this.#waiting?.disconnect()
    this.#track = track
    this.#nav = new Navigation(trackScroller(track), this.#rested)
    this.#drag = new Drag(this.#dragHost(track))
    this.#index = this.#nearest(track)?.index ?? 0
    this.#announced = this.#index

    if (this.#internals) {
      this.#internals.role = "region"
      this.#internals.ariaRoleDescription = "carousel"
    }

    if (!track.hasAttribute("tabindex")) this.#set(track, "tabindex", "0")

    this.addEventListener("click", this.#onClick)
    this.addEventListener("focusin", this.#onFocusIn)
    this.addEventListener("pointerenter", this.#onPointerEnter)
    this.addEventListener("pointerleave", this.#onPointerLeave)
    track.addEventListener("scroll", this.#onScroll, { passive: true })
    track.addEventListener("scrollend", this.#onScrollEnd)
    track.addEventListener("keydown", this.#onKeyDown)
    track.addEventListener("pointerdown", this.#onUserScroll, { passive: true })
    track.addEventListener("wheel", this.#onUserScroll, { passive: true })
    document.addEventListener("visibilitychange", this.#onVisibility)
    this.#drag.connect()

    this.#mutations ??= new MutationObserver((records) => {
      const slidesChanged = records.some((record) =>
        [...record.addedNodes, ...record.removedNodes].some(
          (node) => !(node instanceof Element && node.hasAttribute(CLONE))
        )
      )

      if (slidesChanged) this.#refresh()
    })
    this.#mutations.observe(track, { childList: true })

    if ("ResizeObserver" in globalThis) {
      this.#resizes ??= new ResizeObserver(() => this.#onResize())
      this.#resizes.observe(track)
    }

    if ("IntersectionObserver" in globalThis) {
      this.#intersections ??= new IntersectionObserver(([entry]) => {
        this.#onScreen = entry?.isIntersecting ?? true
        this.#schedule()
      })
      this.#intersections.observe(this)
    }

    this.#refresh()
    this.#measured = measurable(track)

    if (this.hasAttribute("autoplay") && !prefersReducedMotion()) this.play()
  }

  attributeChangedCallback(
    name: string,
    old: string | null,
    value: string | null
  ): void {
    if (!this.#track || old === value) return

    if (name === "loop") this.#refresh()
    else if (name === "autoplay") {
      if (value === null) this.pause()
      else if (old === null && !prefersReducedMotion()) this.play()
    } else this.#schedule()
  }

  disconnectedCallback(): void {
    const track = this.#track

    this.removeEventListener("click", this.#onClick)
    this.removeEventListener("focusin", this.#onFocusIn)
    this.removeEventListener("pointerenter", this.#onPointerEnter)
    this.removeEventListener("pointerleave", this.#onPointerLeave)
    document.removeEventListener("visibilitychange", this.#onVisibility)
    this.#waiting?.disconnect()
    this.#mutations?.disconnect()
    this.#resizes?.disconnect()
    this.#intersections?.disconnect()
    cancelAnimationFrame(this.#frame)
    clearTimeout(this.#playTimer)
    this.#frame = 0
    this.#playing = false
    this.#setState("playing", false)
    this.#drag?.disconnect()
    this.#nav?.dispose()

    if (track) {
      track.removeEventListener("scroll", this.#onScroll)
      track.removeEventListener("scrollend", this.#onScrollEnd)
      track.removeEventListener("keydown", this.#onKeyDown)
      track.removeEventListener("pointerdown", this.#onUserScroll)
      track.removeEventListener("wheel", this.#onUserScroll)
      this.#removeClones(track)

      for (const el of [track, ...track.children, ...this.#controls()]) {
        this.#restore(el)
      }

      for (const el of track.children) el.removeAttribute(CURRENT)

      for (const marker of this.#markers()) {
        marker.removeAttribute("aria-current")
      }
    }

    this.#nav = undefined
    this.#drag = undefined
    this.#track = undefined
  }

  // Slides changed, or `loop` did: label them, rebuild the copies, sync.
  #refresh(): void {
    const track = this.#track

    if (!track) return

    // A trip headed for a slide that left the track can never arrive.
    if (this.#nav?.destinations.some((el) => !track.contains(el))) {
      this.#nav.abandon()
    }

    const slides = this.slides
    this.#index = clamp(this.#index, 0, Math.max(0, slides.length - 1))
    this.#label(slides)
    this.#renderClones()
    this.#update()
  }

  #onResize(): void {
    const track = this.#track
    const visible = !!track && measurable(track)

    // Copies are re-made around the current slide. Without that, a track that
    // just became visible (it started in display: none, where the first jump
    // measured 0) still has to be put on its slide.
    if (this.#cloneCount !== this.#neededClones()) this.#renderClones()
    else if (visible && !this.#measured) {
      const slide = this.slides[this.#index]

      if (slide) this.#jump(slide)
    }

    this.#measured = visible
    this.#update()
  }

  #label(slides: HTMLElement[]): void {
    for (const [i, slide] of slides.entries()) {
      if (!slide.hasAttribute("role")) this.#set(slide, "role", "group")

      if (!slide.hasAttribute("aria-roledescription")) {
        this.#set(slide, "aria-roledescription", "slide")
      }

      const ours = this.#added.get(slide)?.has("aria-label")

      const labelled =
        slide.hasAttribute("aria-label") ||
        slide.hasAttribute("aria-labelledby")

      if (ours || !labelled) {
        this.#set(slide, "aria-label", `${i + 1} of ${slides.length}`)
      }
    }
  }

  // ---- Loop -------------------------------------------------------------

  #loops(): boolean {
    return this.hasAttribute("loop") && this.slides.length > 1
  }

  // Enough copies at each end to fill the view next to the first or last
  // slide, plus one to scroll into.
  #neededClones(): number {
    const track = this.#track
    const slides = this.slides

    if (!track || !this.#loops()) return 0

    const width = slides[0]?.getBoundingClientRect().width ?? 0
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0
    const inView = width > 0 ? Math.ceil(track.clientWidth / (width + gap)) : 1

    return Math.min(slides.length, inView + 1)
  }

  #renderClones(): void {
    const track = this.#track

    if (!track) return

    const had = this.#cloneCount > 0
    this.#removeClones(track)
    const slides = this.slides
    const count = this.#neededClones()
    this.#cloneCount = count

    // Re-making the copies scrolls the track at once, which cuts a trip short.
    if (had || count > 0) this.#nav?.abandon()

    if (count === 0) return

    track.prepend(...copies(slides, slides.length - count, slides.length))
    track.append(...copies(slides, 0, count))

    // The copies pushed the slides along; put the current one back in view.
    const current = slides[this.#index]

    if (current) this.#jump(current)
  }

  #removeClones(track: HTMLElement): void {
    const clones = track.querySelectorAll(`:scope > [${CLONE}]`)

    if (clones.length === 0) return

    // Keep what is in view in place while the copies before it go.
    const nearest = this.#nearest(track)
    const real = nearest ? this.slides[nearest.index] : undefined
    const before = real ? offsetOf(track, real) : 0

    for (const clone of clones) clone.remove()

    if (real) scrollByX(track, offsetOf(track, real) - before, "instant")
  }

  // How far to scroll to swap a copy in view for the slide it copies, which
  // looks the same; 0 when a slide itself is in view.
  #copyShift(): number {
    const track = this.#track
    const nearest = track && this.#loops() ? this.#nearest(track) : undefined
    const real = nearest && this.#realOf(nearest.el)

    if (!track || !nearest || !real || real === nearest.el) return 0

    return offsetOf(track, real) - offsetOf(track, nearest.el)
  }

  // The slide a copy stands for, or the slide itself.
  #realOf(el: HTMLElement): HTMLElement | undefined {
    const copied = copiedIndex(el)

    return copied === undefined ? el : this.slides[copied]
  }

  // ---- Scrolling --------------------------------------------------------

  #go(el: HTMLElement, behavior?: ScrollBehavior): Promise<void> {
    return this.#nav?.go(el, behavior ?? defaultBehavior()) ?? Promise.resolve()
  }

  #step(direction: 1 | -1, behavior?: ScrollBehavior): Promise<void> {
    const track = this.#track
    const heading = this.#nav?.heading

    if (!track) return Promise.resolve()

    if (this.#loops()) {
      let from = heading ?? this.#nearest(track)?.el
      let to = from && sibling(from, direction)

      // A copy at the very end of the track: swap it for the slide it copies,
      // in place, and step on from there.
      const real = from && !to ? this.#realOf(from) : undefined

      if (from && real && real !== from) {
        scrollByX(
          track,
          offsetOf(track, real) - offsetOf(track, from),
          "instant"
        )
        from = real
        to = sibling(real, direction)
      }

      return to ? this.#go(to, behavior) : Promise.resolve()
    }

    const edge = direction > 0 ? atEnd(track) : atStart(track)

    if (edge && !heading) return Promise.resolve()

    const slides = this.slides
    const from = heading ? slides.indexOf(heading) : this.#index
    const to = slides[clamp(from + direction, 0, slides.length - 1)]

    return to ? this.#go(to, behavior) : Promise.resolve()
  }

  // Scrolls `el` into place at once, outside any trip.
  #jump(el: HTMLElement): void {
    const track = this.#track

    if (track) scrollByX(track, offsetOf(track, el), "instant")
  }

  #onScroll = (): void => {
    this.#frame ||= requestAnimationFrame(() => {
      this.#frame = 0
      this.#update()
    })

    this.#nav?.scrolled()
  }

  #onScrollEnd = (): void => {
    this.#nav?.ended()
  }

  // The track came to rest: swap a copy for its slide (unless a queued trip
  // starts from here), sync and announce.
  #rested = (final: boolean): void => {
    const track = this.#track

    if (!track) return

    const shift = final ? this.#copyShift() : 0

    if (shift !== 0) scrollByX(track, shift, "instant")

    this.#update(true)
  }

  // Syncs the current slide, the markers and the buttons with the scroll.
  #update(settled = false): void {
    const track = this.#track

    if (!track) return

    const slides = this.slides
    // A hidden track (display: none) measures 0 everywhere, so where it is
    // scrolled says nothing: keep the slide it had.
    const nearest = measurable(track) ? this.#nearest(track) : undefined
    const index = nearest?.index ?? this.#index
    const current = nearest?.el ?? slides[index]
    this.#index = index

    for (const el of track.children) {
      el.toggleAttribute(CURRENT, el === current)
    }

    for (const [i, marker] of this.#markers().entries()) {
      if (this.#slideOf(marker, i) === index) {
        marker.setAttribute("aria-current", "true")
      } else marker.removeAttribute("aria-current")
    }

    const loops = this.#loops()
    const overflows = maxScroll(track) > 0

    for (const button of this.#own(`[${PART}="prev"]`)) {
      this.#disable(button, !overflows || (!loops && atStart(track)))
    }

    for (const button of this.#own(`[${PART}="next"]`)) {
      this.#disable(button, !overflows || (!loops && atEnd(track)))
    }

    for (const toggle of this.#own(`[${PART}="play"]`)) {
      this.#set(toggle, "aria-pressed", String(this.#playing))
    }

    const slide = slides[index]

    if (settled && slide && index !== this.#announced) {
      this.#announced = index
      this.dispatchEvent(
        new CustomEvent<CarouselChangeDetail>("surface-carousel-change", {
          bubbles: true,
          detail: { index, slide },
        })
      )
    }
  }

  // The track child whose snap position is closest to the scroll position,
  // and the index of the slide it is or copies.
  #nearest(track: HTMLElement): { el: HTMLElement; index: number } | undefined {
    const slides = this.slides
    let best: { el: HTMLElement; index: number } | undefined
    let distance = Infinity

    for (const el of track.children) {
      if (!(el instanceof HTMLElement)) continue

      const d = Math.abs(offsetOf(track, el))

      if (d >= distance) continue

      const index = copiedIndex(el) ?? slides.indexOf(el)

      if (index < 0) continue

      distance = d
      best = { el, index }
    }

    return best
  }

  // ---- Drag -------------------------------------------------------------

  #dragHost(track: HTMLElement): ConstructorParameters<typeof Drag>[0] {
    return {
      track,
      accepts: (target) =>
        this.hasAttribute("drag") &&
        // A carousel nested in a slide drags its own track.
        target.closest(SurfaceCarousel.tagName) === this &&
        !target.closest("input, select, textarea, [contenteditable]"),
      copyShift: () => this.#copyShift(),
      nearest: () => this.#nearest(track)?.el,
      started: () => {
        this.#nav?.abandon()
        this.#setState("dragging", true)
      },
      ended: () => this.#setState("dragging", false),
      go: (to) => this.#go(to),
    }
  }

  // ---- Controls ---------------------------------------------------------

  #onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || !(event.target instanceof Element)) return

    const target = event.target
    const marker = this.#markers().find((el) => el.contains(target))

    if (marker) {
      event.preventDefault()
      this.pause()
      void this.goTo(this.#slideOf(marker, this.#markers().indexOf(marker)))

      return
    }

    const control = target.closest(`[${PART}]`)

    if (!control || control.closest(SurfaceCarousel.tagName) !== this) return

    if (control.getAttribute("aria-disabled") === "true") return

    const part = control.getAttribute(PART)

    if (part === "play") this.#setPlaying(!this.#playing)
    else if (part === "prev" || part === "next") {
      this.pause()
      void (part === "prev" ? this.prev() : this.next())
    }
  }

  #onKeyDown = (event: KeyboardEvent): void => {
    const track = this.#track

    if (
      !track ||
      event.target !== track ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return
    }

    const rtl = getComputedStyle(track).direction === "rtl"
    const key = event.key

    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return

    event.preventDefault()
    this.pause()

    if (key === "Home") void this.goTo(0)
    else if (key === "End") void this.goTo(this.slides.length - 1)
    else if ((key === "ArrowRight") !== rtl) void this.next()
    else void this.prev()
  }

  // The marker's slide: the target of an anchor marker, else its position.
  #slideOf(marker: HTMLElement, position: number): number {
    const href = marker.getAttribute("href")

    if (href?.startsWith("#") && href.length > 1) {
      const id = decodeURIComponent(href.slice(1))
      const index = this.slides.findIndex((slide) => slide.id === id)

      if (index >= 0) return index
    }

    return position
  }

  #markers(): HTMLElement[] {
    return this.#own(`[${PART}="markers"]`).flatMap((group) =>
      [...group.querySelectorAll<HTMLElement>("a[href], button")].filter(
        (el) => el.closest(SurfaceCarousel.tagName) === this
      )
    )
  }

  #controls(): HTMLElement[] {
    return [
      ...this.#own(`[${PART}]:not([${PART}="track"])`),
      ...this.#markers(),
    ]
  }

  // Elements matching `selector` that belong to this carousel, not a nested one.
  #own(selector: string): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(selector)].filter(
      (el) => el.closest(SurfaceCarousel.tagName) === this
    )
  }

  #disable(button: HTMLElement, disabled: boolean): void {
    if (disabled) this.#set(button, "aria-disabled", "true")
    else if (this.#added.get(button)?.has("aria-disabled")) {
      button.removeAttribute("aria-disabled")
      this.#added.get(button)?.delete("aria-disabled")
    }
  }

  // ---- Autoplay ---------------------------------------------------------

  #setPlaying(on: boolean): void {
    this.#playing = on && this.slides.length > 1
    this.#setState("playing", this.#playing)
    this.#update()
    this.#schedule()
  }

  #schedule(): void {
    clearTimeout(this.#playTimer)

    if (!this.#playing || this.#hovered || !this.#onScreen || document.hidden) {
      return
    }

    this.#playTimer = window.setTimeout(() => {
      const track = this.#track

      const advance =
        track && !this.#loops() && atEnd(track) ? this.goTo(0) : this.next()

      void advance.then(() => this.#schedule())
    }, this.#interval())
  }

  #interval(): number {
    const value = Number(this.getAttribute("interval"))

    return Number.isFinite(value) && value > 0
      ? Math.max(MIN_INTERVAL, value)
      : DEFAULT_INTERVAL
  }

  // Focus on anything but the play button stops autoplay for good (APG).
  #onFocusIn = (event: FocusEvent): void => {
    const target = event.target

    if (target instanceof Element && target.closest(`[${PART}="play"]`)) return

    this.pause()
  }

  // The reader takes over: autoplay stops, and the trip under way is theirs.
  #onUserScroll = (): void => {
    this.#nav?.abandon()
    this.pause()
  }

  #onPointerEnter = (event: PointerEvent): void => {
    if (event.pointerType !== "mouse") return

    this.#hovered = true
    this.#schedule()
  }

  #onPointerLeave = (event: PointerEvent): void => {
    if (event.pointerType !== "mouse") return

    this.#hovered = false
    this.#schedule()
  }

  #onVisibility = (): void => {
    this.#schedule()
  }

  // ---- Bookkeeping ------------------------------------------------------

  // Sets an attribute and remembers it was this element, not the author.
  #set(el: Element, name: string, value: string): void {
    el.setAttribute(name, value)
    const names = this.#added.get(el) ?? new Set()
    names.add(name)
    this.#added.set(el, names)
  }

  // Removes the attributes this element added.
  #restore(el: Element): void {
    for (const name of this.#added.get(el) ?? []) el.removeAttribute(name)

    this.#added.delete(el)
  }

  #setState(state: string, on: boolean): void {
    const states = this.#internals?.states

    if (!states) return

    if (on) states.add(state)
    else states.delete(state)
  }
}

const defaultBehavior = (): ScrollBehavior =>
  prefersReducedMotion() ? "instant" : "smooth"

// jsdom has no matchMedia.
const prefersReducedMotion = (): boolean =>
  globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

/** Whether the browser fires `scrollend`; elsewhere a quiet period stands in. */
export const supportsScrollEnd = (): boolean => "onscrollend" in window

const mod = (n: number, m: number): number => ((n % m) + m) % m

const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n))

defineElement(SurfaceCarousel.tagName, SurfaceCarousel)

declare global {
  interface HTMLElementTagNameMap {
    "surface-carousel": SurfaceCarousel
  }

  // Bubbles, so documents and windows can listen too.
  interface GlobalEventHandlersEventMap {
    "surface-carousel-change": CustomEvent<CarouselChangeDetail>
  }
}
