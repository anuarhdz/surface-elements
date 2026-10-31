import { ahead } from "./geometry.js"

// How far a mouse must move before a press becomes a drag, so clicks stay clicks.
const DRAG_THRESHOLD = 5

// Release speed, in px/ms, past which a drag goes on to the next slide.
const FLICK_SPEED = 0.3

/** What a drag needs from the carousel it drags. */
export interface DragHost {
  readonly track: HTMLElement
  /** Whether a press on `target` may start a drag. */
  accepts(target: Element): boolean
  /** How far to scroll to swap a loop copy in view for its slide, else 0. */
  copyShift(): number
  /** The track child nearest its snap position. */
  nearest(): HTMLElement | undefined
  /** A press became a drag: the reader takes over the track. */
  started(): void
  /** The drag ended, before its release scroll. */
  ended(): void
  /** Scrolls `to` into its snap position; resolves when the scroll ends. */
  go(to: HTMLElement): Promise<void>
}

interface Press {
  pointerId: number
  startX: number
  startScroll: number
  // The last few pointer positions, for the release speed.
  samples: Array<{ x: number; t: number }>
  moved: boolean
}

/**
 * Mouse drag on a carousel track. Past a 5 px threshold the track follows
 * the pointer with snapping off. On release, a quick drag goes to the next
 * snap position ahead, like a touch flick, and a slow one to the nearest;
 * snapping comes back once the track rests there. Touch and pen keep the
 * browser's own scrolling.
 */
export class Drag {
  readonly #host: DragHost
  #press: Press | undefined
  // The track's own inline snapping, saved by the first of a series of drags
  // and given back once the last one comes to rest.
  #unsnapped: { snapType: string; behavior: string } | undefined
  #series = 0
  // Whether a release scroll is under way, which gives snapping back itself.
  #releasing = false

  constructor(host: DragHost) {
    this.#host = host
  }

  connect(): void {
    const track = this.#host.track
    track.addEventListener("pointerdown", this.#onDown)
    track.addEventListener("dragstart", this.#onNativeDrag)
  }

  disconnect(): void {
    const track = this.#host.track
    track.removeEventListener("pointerdown", this.#onDown)
    track.removeEventListener("dragstart", this.#onNativeDrag)
    this.#end()
    this.#resnap()
  }

  #onDown = (event: PointerEvent): void => {
    if (
      event.pointerType !== "mouse" ||
      event.button !== 0 ||
      !(event.target instanceof Element) ||
      !this.#host.accepts(event.target)
    ) {
      return
    }

    const track = this.#host.track
    this.#press = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: track.scrollLeft,
      samples: [{ x: event.clientX, t: event.timeStamp }],
      moved: false,
    }
    track.addEventListener("pointermove", this.#onMove)
    track.addEventListener("pointerup", this.#onUp)
    track.addEventListener("pointercancel", this.#onUp)
  }

  #onMove = (event: PointerEvent): void => {
    const track = this.#host.track
    const press = this.#press

    if (!press || event.pointerId !== press.pointerId) return

    // Let go outside the track, where no pointerup reached it (the pointer is
    // only captured once the press becomes a drag): end it here.
    if ((event.buttons & 1) === 0) {
      this.#onUp(event)

      return
    }

    const dx = event.clientX - press.startX

    if (!press.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return

      // Now a drag: the track follows the pointer, free of snapping.
      press.moved = true
      this.#series++
      this.#unsnapped ??= {
        snapType: track.style.scrollSnapType,
        behavior: track.style.scrollBehavior,
      }
      track.style.scrollSnapType = "none"
      track.style.scrollBehavior = "auto"
      capture(track, event.pointerId)
      getSelection()?.removeAllRanges()
      this.#host.started()
    }

    track.scrollLeft = press.startScroll - dx
    press.samples.push({ x: event.clientX, t: event.timeStamp })

    if (press.samples.length > 10) press.samples.shift()

    // With loop, swap a copy for its slide mid-drag, so the drag never ends.
    const shift = this.#host.copyShift()

    if (shift !== 0) {
      track.scrollLeft += shift
      press.startScroll += shift
    }
  }

  #onUp = (event: PointerEvent): void => {
    const track = this.#host.track
    const press = this.#press

    if (!press || event.pointerId !== press.pointerId) return

    this.#end()

    // A press that never became a drag: snapping, if a drag left it off and
    // no release scroll is still to give it back, comes back now.
    if (!press.moved) {
      if (!this.#releasing) this.#resnap()

      return
    }

    // The click that ends a drag is not a click on the slide under it.
    track.addEventListener("click", swallow, { capture: true, once: true })
    setTimeout(() => track.removeEventListener("click", swallow, true))

    const speed = releaseSpeed(press.samples, event.timeStamp)

    // Moving the pointer right (positive) scrolls toward smaller scrollLeft.
    const flick =
      Math.abs(speed) > FLICK_SPEED
        ? ahead(track, speed > 0 ? -1 : 1)
        : undefined

    const to = flick ?? this.#host.nearest()

    // Snapping comes back once the track rests on a slide, so it cannot jump,
    // unless a newer drag grabbed the track before then.
    const series = this.#series

    const resnap = () => {
      this.#releasing = false

      if (series === this.#series && !this.#press) this.#resnap()
    }

    this.#releasing = true

    if (to) void this.#host.go(to).then(resnap)
    else resnap()
  }

  // Stops listening for the press; the scroll that ends it is the caller's.
  #end(): void {
    const track = this.#host.track
    const press = this.#press

    track.removeEventListener("pointermove", this.#onMove)
    track.removeEventListener("pointerup", this.#onUp)
    track.removeEventListener("pointercancel", this.#onUp)

    if (press && track.hasPointerCapture?.(press.pointerId)) {
      track.releasePointerCapture(press.pointerId)
    }

    this.#press = undefined
    this.#host.ended()
  }

  #resnap(): void {
    const saved = this.#unsnapped

    if (!saved) return

    const track = this.#host.track
    track.style.scrollSnapType = saved.snapType
    track.style.scrollBehavior = saved.behavior
    this.#unsnapped = undefined
  }

  // Images and links would start a native drag and drop instead.
  #onNativeDrag = (event: DragEvent): void => {
    if (event.target instanceof Element && this.#host.accepts(event.target)) {
      event.preventDefault()
    }
  }
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
