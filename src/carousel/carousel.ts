import { defineElement } from "../utils/define.js"
import { adoptCarouselStyles } from "./styles.js"

/** Marks the parts of a carousel: `track`, `prev`, `next`, `play`, `markers`. */
export const PART_ATTRIBUTE = "data-surface-carousel"

/** Set on the copies `loop` adds at both ends of the track, with the index of the slide they copy. */
export const CLONE_ATTRIBUTE = "data-surface-carousel-clone"

/** Set on the slide (or copy) that is snapped in view. */
export const CURRENT_ATTRIBUTE = "data-current"

const DEFAULT_INTERVAL = 5000
const MIN_INTERVAL = 1000

// How far a mouse must move before a press becomes a drag, so clicks stay clicks.
const DRAG_THRESHOLD = 5

// Release speed, in px/ms, past which a drag goes on to the next slide.
const FLICK_SPEED = 0.3

// How long a scroll must be quiet to count as settled, without `scrollend`.
const SETTLE_DELAY = 150

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
  #index = 0
  // The index the last change event announced.
  #announced = 0
  // Where a programmatic scroll is headed, so quick clicks step from there.
  #target: HTMLElement | undefined
  #cloneCount = 0
  #frame = 0
  #settleTimer = 0
  #playTimer = 0
  #playing = false
  #hovered = false
  #onScreen = true
  #drag: DragState | undefined
  // The track's own inline snapping, saved by the first of a series of drags
  // and given back once the last one comes to rest.
  #unsnapped: { snapType: string; behavior: string } | undefined
  #drags = 0
  #settles: Array<() => void> = []
  // Attributes this element added, as opposed to the author.
  #added = new WeakMap<Element, Set<string>>()
  #mutations: MutationObserver | undefined
  #resizes: ResizeObserver | undefined
  #intersections: IntersectionObserver | undefined

  constructor() {
    super()
    this.#internals = this.attachInternals?.()
  }

  /** The scroll container, marked `data-surface-carousel="track"`. */
  get track(): HTMLElement | null {
    return this.#own(`[${PART_ATTRIBUTE}="track"]`)[0] ?? null
  }

  /** The slides: the children of the track, without the copies `loop` adds. */
  get slides(): HTMLElement[] {
    return [...(this.track?.children ?? [])].filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && !el.hasAttribute(CLONE_ATTRIBUTE)
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
   * it wraps with `loop` and clamps without. Resolves when the scroll settles.
   */
  goTo(index: number, options: CarouselScrollOptions = {}): Promise<void> {
    const slides = this.slides
    const n = slides.length

    if (n === 0) return Promise.resolve()

    const i = this.#loops() ? mod(index, n) : clamp(index, 0, n - 1)
    const slide = slides[i]

    return slide ? this.#scrollTo(slide, options.behavior) : Promise.resolve()
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

    if (!track) return

    this.#track = track
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
    track.addEventListener("pointerdown", this.#onDragStart)
    track.addEventListener("dragstart", this.#onNativeDrag)
    document.addEventListener("visibilitychange", this.#onVisibility)

    this.#mutations ??= new MutationObserver((records) => {
      const slidesChanged = records.some((record) =>
        [...record.addedNodes, ...record.removedNodes].some(
          (node) =>
            !(node instanceof Element && node.hasAttribute(CLONE_ATTRIBUTE))
        )
      )

      if (slidesChanged) this.#refresh()
    })
    this.#mutations.observe(track, { childList: true })

    if ("ResizeObserver" in globalThis) {
      this.#resizes ??= new ResizeObserver(() => {
        if (this.#cloneCount !== this.#neededClones()) this.#renderClones()

        this.#update()
      })
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
    this.#mutations?.disconnect()
    this.#resizes?.disconnect()
    this.#intersections?.disconnect()
    cancelAnimationFrame(this.#frame)
    clearTimeout(this.#settleTimer)
    clearTimeout(this.#playTimer)
    this.#frame = 0
    this.#playing = false
    this.#setState("playing", false)

    if (track) {
      track.removeEventListener("scroll", this.#onScroll)
      track.removeEventListener("scrollend", this.#onScrollEnd)
      track.removeEventListener("keydown", this.#onKeyDown)
      track.removeEventListener("pointerdown", this.#onUserScroll)
      track.removeEventListener("wheel", this.#onUserScroll)
      track.removeEventListener("pointerdown", this.#onDragStart)
      track.removeEventListener("dragstart", this.#onNativeDrag)
      this.#endDrag(track)
      this.#resnap(track)
      this.#removeClones(track)

      for (const el of [track, ...track.children, ...this.#controls()]) {
        this.#restore(el)
      }

      for (const el of track.children) el.removeAttribute(CURRENT_ATTRIBUTE)

      for (const marker of this.#markers())
        marker.removeAttribute("aria-current")
    }

    this.#target = undefined
    this.#track = undefined

    for (const resolve of this.#settles.splice(0)) resolve()
  }

  // Slides changed, or `loop` did: label them, rebuild the copies, sync.
  #refresh(): void {
    const track = this.#track

    if (!track) return

    const slides = this.slides
    this.#index = clamp(this.#index, 0, Math.max(0, slides.length - 1))
    this.#label(slides)
    this.#renderClones()
    this.#update()
  }

  #label(slides: HTMLElement[]): void {
    for (const [i, slide] of slides.entries()) {
      if (!slide.hasAttribute("role")) this.#set(slide, "role", "group")

      if (!slide.hasAttribute("aria-roledescription")) {
        this.#set(slide, "aria-roledescription", "slide")
      }

      const ours = this.#added.get(slide)?.has("aria-label")

      if (
        ours ||
        !(
          slide.hasAttribute("aria-label") ||
          slide.hasAttribute("aria-labelledby")
        )
      ) {
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

    this.#removeClones(track)
    const slides = this.slides
    const count = this.#neededClones()
    this.#cloneCount = count

    if (count === 0) return

    track.prepend(...copies(slides, slides.length - count, slides.length))
    track.append(...copies(slides, 0, count))

    // The copies pushed the slides along; put the current one back in view.
    const current = slides[this.#index]

    if (current) this.#jump(current)
  }

  #removeClones(track: HTMLElement): void {
    const clones = track.querySelectorAll(`:scope > [${CLONE_ATTRIBUTE}]`)

    if (clones.length === 0) return

    // Keep what is in view in place while the copies before it go.
    const nearest = this.#nearest(track)
    const real = nearest ? this.slides[nearest.index] : undefined
    const before = real ? offsetOf(track, real) : 0

    for (const clone of clones) clone.remove()

    if (real) scrollByX(track, offsetOf(track, real) - before, "instant")
  }

  // Swaps a copy in view for the slide it copies, without a visible move.
  #normalize(): void {
    const track = this.#track
    const nearest = track && this.#nearest(track)

    if (!track || !nearest?.el.hasAttribute(CLONE_ATTRIBUTE)) return

    const real = this.slides[nearest.index]

    if (real) {
      scrollByX(
        track,
        offsetOf(track, real) - offsetOf(track, nearest.el),
        "instant"
      )
    }
  }

  // ---- Scrolling --------------------------------------------------------

  #step(direction: 1 | -1, behavior?: ScrollBehavior): Promise<void> {
    const track = this.#track

    if (!track) return Promise.resolve()

    if (this.#loops()) {
      let from = this.#target ?? this.#nearest(track)?.el
      let to = from && sibling(from, direction)

      // A copy at the very end of the track: swap it for the slide it copies,
      // in place, and step on from there.
      const copied = from && !to ? from.getAttribute(CLONE_ATTRIBUTE) : null
      const real = copied === null ? undefined : this.slides[Number(copied)]

      if (from && real) {
        scrollByX(
          track,
          offsetOf(track, real) - offsetOf(track, from),
          "instant"
        )
        from = real
        to = sibling(real, direction)
      }

      return to ? this.#scrollTo(to, behavior) : Promise.resolve()
    }

    const edge = direction > 0 ? atEnd(track) : atStart(track)

    if (edge && !this.#target) return Promise.resolve()

    const slides = this.slides
    const from = this.#target ? slides.indexOf(this.#target) : this.#index
    const to = slides[clamp(from + direction, 0, slides.length - 1)]

    return to ? this.#scrollTo(to, behavior) : Promise.resolve()
  }

  #scrollTo(
    el: HTMLElement,
    behavior: ScrollBehavior = defaultBehavior()
  ): Promise<void> {
    const track = this.#track

    if (!track) return Promise.resolve()

    // Already there, or as close as the track can scroll: no scroll, and so
    // no scrollend, would follow.
    if (reached(track, el)) {
      this.#target = undefined
      this.#update()

      return Promise.resolve()
    }

    this.#target = el

    return new Promise((resolve) => {
      this.#settles.push(resolve)
      scrollByX(track, offsetOf(track, el), behavior)

      // An instant scroll may not wait for a frame to report itself.
      if (behavior === "instant") this.#armSettle()
    })
  }

  // Scrolls `el` into place at once, outside any settle bookkeeping.
  #jump(el: HTMLElement): void {
    const track = this.#track

    if (track) scrollByX(track, offsetOf(track, el), "instant")
  }

  #onScroll = (): void => {
    this.#frame ||= requestAnimationFrame(() => {
      this.#frame = 0
      this.#update()
    })

    if (!supportsScrollEnd()) this.#armSettle()
  }

  #onScrollEnd = (): void => {
    this.#armSettle(0)
  }

  #armSettle(delay = SETTLE_DELAY): void {
    clearTimeout(this.#settleTimer)
    this.#settleTimer = window.setTimeout(() => this.#settle(), delay)
  }

  // The scroll came to rest: swap a copy for its slide, sync and announce.
  #settle(): void {
    clearTimeout(this.#settleTimer)
    const track = this.#track

    // A jump inside a quick series of steps ends a scroll of its own; keep
    // going until the step that is under way arrives.
    if (track && this.#target && !reached(track, this.#target)) return

    this.#target = undefined

    if (this.#loops()) this.#normalize()

    this.#update(true)

    for (const resolve of this.#settles.splice(0)) resolve()
  }

  // Syncs the current slide, the markers and the buttons with the scroll.
  #update(settled = false): void {
    const track = this.#track

    if (!track) return

    const slides = this.slides
    const nearest = this.#nearest(track)
    const index = nearest?.index ?? 0
    this.#index = index

    for (const el of track.children) {
      el.toggleAttribute(CURRENT_ATTRIBUTE, el === nearest?.el)
    }

    for (const [i, marker] of this.#markers().entries()) {
      if (this.#slideOf(marker, i) === index)
        marker.setAttribute("aria-current", "true")
      else marker.removeAttribute("aria-current")
    }

    const loops = this.#loops()
    const overflows = maxScroll(track) > 0

    for (const button of this.#own(`[${PART_ATTRIBUTE}="prev"]`)) {
      this.#disable(button, !overflows || (!loops && atStart(track)))
    }

    for (const button of this.#own(`[${PART_ATTRIBUTE}="next"]`)) {
      this.#disable(button, !overflows || (!loops && atEnd(track)))
    }

    for (const toggle of this.#own(`[${PART_ATTRIBUTE}="play"]`)) {
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

      const copied = el.getAttribute(CLONE_ATTRIBUTE)
      const index = copied === null ? slides.indexOf(el) : Number(copied)

      if (index < 0) continue

      distance = d
      best = { el, index }
    }

    return best
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

    const control = target.closest(`[${PART_ATTRIBUTE}]`)

    if (!control || control.closest(SurfaceCarousel.tagName) !== this) return

    if (control.getAttribute("aria-disabled") === "true") return

    const part = control.getAttribute(PART_ATTRIBUTE)

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
    return this.#own(`[${PART_ATTRIBUTE}="markers"]`).flatMap((group) =>
      [...group.querySelectorAll<HTMLElement>("a[href], button")].filter(
        (el) => el.closest(SurfaceCarousel.tagName) === this
      )
    )
  }

  #controls(): HTMLElement[] {
    return [
      ...this.#own(`[${PART_ATTRIBUTE}]:not([${PART_ATTRIBUTE}="track"])`),
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

  // ---- Drag -------------------------------------------------------------

  #onDragStart = (event: PointerEvent): void => {
    const track = this.#track

    if (
      !track ||
      !this.hasAttribute("drag") ||
      event.pointerType !== "mouse" ||
      event.button !== 0 ||
      !(event.target instanceof Element) ||
      event.target.closest("input, select, textarea, [contenteditable]")
    ) {
      return
    }

    this.#drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: track.scrollLeft,
      samples: [{ x: event.clientX, t: event.timeStamp }],
      moved: false,
    }
    track.addEventListener("pointermove", this.#onDragMove)
    track.addEventListener("pointerup", this.#onDragEnd)
    track.addEventListener("pointercancel", this.#onDragEnd)
  }

  #onDragMove = (event: PointerEvent): void => {
    const track = this.#track
    const drag = this.#drag

    if (!track || !drag || event.pointerId !== drag.pointerId) return

    const dx = event.clientX - drag.startX

    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return

      // Now a drag: the track follows the pointer, free of snapping.
      drag.moved = true
      this.#drags++
      this.#unsnapped ??= {
        snapType: track.style.scrollSnapType,
        behavior: track.style.scrollBehavior,
      }
      track.style.scrollSnapType = "none"
      track.style.scrollBehavior = "auto"
      capture(track, event.pointerId)
      getSelection()?.removeAllRanges()
      this.#target = undefined
      this.#setState("dragging", true)
    }

    track.scrollLeft = drag.startScroll - dx
    drag.samples.push({ x: event.clientX, t: event.timeStamp })

    if (drag.samples.length > 10) drag.samples.shift()

    // With loop, swap a copy for its slide mid-drag, so the drag never ends.
    if (this.#loops()) {
      const nearest = this.#nearest(track)
      const real = nearest && this.#realOf(nearest.el)

      if (nearest && real && real !== nearest.el) {
        const shift = offsetOf(track, real) - offsetOf(track, nearest.el)
        track.scrollLeft += shift
        drag.startScroll += shift
      }
    }
  }

  #onDragEnd = (event: PointerEvent): void => {
    const track = this.#track
    const drag = this.#drag

    if (!track || !drag || event.pointerId !== drag.pointerId) return

    this.#endDrag(track)

    if (!drag.moved) return

    // The click that ends a drag is not a click on the slide under it.
    track.addEventListener("click", swallow, { capture: true, once: true })
    setTimeout(() => track.removeEventListener("click", swallow, true))

    const speed = releaseSpeed(drag.samples, event.timeStamp)

    // Moving the pointer right (positive) scrolls toward smaller scrollLeft.
    const flick =
      Math.abs(speed) > FLICK_SPEED
        ? ahead(track, speed > 0 ? -1 : 1)
        : undefined

    const to = flick ?? this.#nearest(track)?.el

    // Snapping comes back once the track rests on a slide, so it cannot jump,
    // unless a newer drag grabbed the track before then.
    const series = this.#drags

    const resnap = () => {
      if (series === this.#drags && !this.#drag) this.#resnap(track)
    }

    if (to) void this.#scrollTo(to).then(resnap)
    else resnap()
  }

  #resnap(track: HTMLElement): void {
    const saved = this.#unsnapped

    if (!saved) return

    track.style.scrollSnapType = saved.snapType
    track.style.scrollBehavior = saved.behavior
    this.#unsnapped = undefined
  }

  // Stops listening for the drag; the scroll that ends it is the caller's.
  #endDrag(track: HTMLElement): void {
    const drag = this.#drag

    track.removeEventListener("pointermove", this.#onDragMove)
    track.removeEventListener("pointerup", this.#onDragEnd)
    track.removeEventListener("pointercancel", this.#onDragEnd)
    this.#setState("dragging", false)

    if (drag && track.hasPointerCapture?.(drag.pointerId)) {
      track.releasePointerCapture(drag.pointerId)
    }

    this.#drag = undefined
  }

  // Images and links would start a native drag and drop instead.
  #onNativeDrag = (event: DragEvent): void => {
    if (this.hasAttribute("drag")) event.preventDefault()
  }

  // The slide a copy stands for, or the slide itself.
  #realOf(el: HTMLElement): HTMLElement | undefined {
    const copied = el.getAttribute(CLONE_ATTRIBUTE)

    return copied === null ? el : this.slides[Number(copied)]
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

    if (
      target instanceof Element &&
      target.closest(`[${PART_ATTRIBUTE}="play"]`)
    )
      return

    this.pause()
  }

  // The reader takes over: autoplay stops, and a scroll under way is theirs.
  #onUserScroll = (): void => {
    this.#target = undefined
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

interface DragState {
  pointerId: number
  startX: number
  startScroll: number
  // The last few pointer positions, for the release speed.
  samples: Array<{ x: number; t: number }>
  moved: boolean
}

// Keeps the drag when the pointer leaves the track. Throws for a pointer
// that is no longer active (it was released in between).
function capture(track: HTMLElement, pointerId: number): void {
  try {
    track.setPointerCapture(pointerId)
  } catch {
    // The release that follows ends the drag anyway.
  }
}

const swallow = (event: Event): void => {
  event.preventDefault()
  event.stopPropagation()
}

// Pointer speed over the 100 ms before `release`, in px/ms; positive is to
// the right. A pointer that stopped before letting go has no speed.
function releaseSpeed(
  samples: Array<{ x: number; t: number }>,
  release: number
): number {
  const recent = samples.filter((sample) => sample.t >= release - 100)
  const first = recent[0]
  const last = recent.at(-1)

  if (!first || !last || last.t - first.t <= 0) return 0

  return (last.x - first.x) / (last.t - first.t)
}

// The first snap position ahead of the scroll position, as a touch flick
// finds it: `direction` 1 needs a larger scrollLeft, -1 a smaller one.
function ahead(track: HTMLElement, direction: 1 | -1): HTMLElement | undefined {
  let best: HTMLElement | undefined
  let distance = Infinity

  for (const el of track.children) {
    if (!(el instanceof HTMLElement)) continue

    const d = offsetOf(track, el) * direction

    if (d > 1 && d < distance) {
      distance = d
      best = el
    }
  }

  return best
}

// A copy of `slide` for the loop: inert, hidden from assistive technology,
// and unable to clash with the original (ids, names, autoplaying media).
function cloneSlide(slide: HTMLElement, index: number): HTMLElement {
  // SAFETY: a deep clone of an HTMLElement is an HTMLElement of the same type.
  const clone = slide.cloneNode(true) as HTMLElement
  clone.setAttribute(CLONE_ATTRIBUTE, String(index))
  clone.setAttribute("aria-hidden", "true")
  clone.inert = true
  clone.removeAttribute(CURRENT_ATTRIBUTE)

  for (const el of within(clone, "[id]")) el.removeAttribute("id")

  // A copied checked radio or open <details name> would steal its group.
  for (const el of within(clone, "[name]")) el.removeAttribute("name")

  for (const el of within(clone, "input, select, textarea, button")) {
    el.setAttribute("disabled", "")
  }

  for (const media of within(clone, "video, audio")) {
    media.removeAttribute("autoplay")
  }

  return clone
}

// `root` and its descendants that match `selector`.
const within = (root: Element, selector: string): Element[] => [
  ...(root.matches(selector) ? [root] : []),
  ...root.querySelectorAll(selector),
]

// Copies of `slides` from `start` to `end` (exclusive).
const copies = (
  slides: HTMLElement[],
  start: number,
  end: number
): HTMLElement[] =>
  slides.slice(start, end).map((slide, i) => cloneSlide(slide, start + i))

const sibling = (
  el: HTMLElement,
  direction: 1 | -1
): HTMLElement | undefined => {
  const next = direction > 0 ? el.nextElementSibling : el.previousElementSibling

  return next instanceof HTMLElement ? next : undefined
}

// How far `el` is from its snap position in the track, in physical pixels
// along x: scrolling the track by this much snaps it.
function offsetOf(track: HTMLElement, el: HTMLElement): number {
  const style = getComputedStyle(track)
  const own = getComputedStyle(el)
  const box = track.getBoundingClientRect()
  const rect = el.getBoundingClientRect()
  const rtl = style.direction === "rtl"

  const origin = box.left + track.clientLeft
  const left = origin + px(style.scrollPaddingLeft)
  const right = origin + track.clientWidth - px(style.scrollPaddingRight)

  const start = rect.left - px(own.scrollMarginLeft)
  const end = rect.right + px(own.scrollMarginRight)
  const align = own.scrollSnapAlign.trim().split(/\s+/).at(-1)

  if (align === "center") return (start + end) / 2 - (left + right) / 2

  if (align === "end") return rtl ? start - left : end - right

  return rtl ? end - right : start - left
}

// Whether `el` is in its snap position, or as close as the track can scroll.
function reached(track: HTMLElement, el: HTMLElement): boolean {
  const offset = offsetOf(track, el)

  if (Math.abs(offset) < 1) return true

  const max = maxScroll(track)
  const rtl = getComputedStyle(track).direction === "rtl"
  const low = rtl ? -max : 0
  const high = rtl ? 0 : max

  return offset > 0 ? track.scrollLeft >= high - 1 : track.scrollLeft <= low + 1
}

const px = (value: string): number => Number.parseFloat(value) || 0

// scrollLeft runs negative in right-to-left tracks.
const maxScroll = (track: HTMLElement): number =>
  Math.max(0, track.scrollWidth - track.clientWidth)

const atStart = (track: HTMLElement): boolean => Math.abs(track.scrollLeft) <= 1

const atEnd = (track: HTMLElement): boolean =>
  Math.abs(track.scrollLeft) >= maxScroll(track) - 1

// jsdom has no Element.scrollBy.
function scrollByX(
  track: HTMLElement,
  left: number,
  behavior: ScrollBehavior
): void {
  if (left !== 0) track.scrollBy?.({ left, behavior })
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
