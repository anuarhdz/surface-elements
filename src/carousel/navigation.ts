import { offsetOf, reached, scrollByX, stopScroll } from "./geometry.js"

/** How a {@link Navigation} reads and moves the track. */
export interface Scroller {
  /** Whether `el` is in its snap position, or as close as the track goes. */
  reached(el: HTMLElement): boolean
  /** Starts scrolling `el` into its snap position. */
  scrollTo(el: HTMLElement, behavior: ScrollBehavior): void
  /** Stops a smooth scroll under way, where it is. */
  stop(): void
}

/** The {@link Scroller} of a scroll-snap track. */
export const trackScroller = (track: HTMLElement): Scroller => ({
  reached: (el) => reached(track, el),
  scrollTo: (el, behavior) => scrollByX(track, offsetOf(track, el), behavior),
  stop: () => stopScroll(track),
})

// How long a scroll must be quiet to count as settled, without `scrollend`.
const SETTLE_DELAY = 150

// How long a trip may go without arriving or any scroll before it is given up.
const STALL_TIMEOUT = 1000

const hasScrollEnd = (): boolean => "onscrollend" in window

interface Trip {
  to: HTMLElement
  behavior: ScrollBehavior
  done: Array<() => void>
}

/**
 * The scrolls a carousel starts itself (trips): one under way, and at most
 * one queued behind it. Every trip ends one of two ways, and both resolve its
 * promise:
 *
 * - it arrives: the track comes to rest on its slide;
 * - it is given up: a newer trip replaces it, {@link Navigation.abandon} is
 *   called (the reader took over, the slides changed), or it neither arrives
 *   nor scrolls for a second.
 *
 * So no promise can be left waiting, whatever interrupts it. The carousel
 * reports scroll events with {@link Navigation.scrolled} and
 * {@link Navigation.ended}, and hears back through `rested` each time the
 * track comes to rest.
 */
export class Navigation {
  readonly #scroller: Scroller
  readonly #rested: (final: boolean) => void
  #trip: Trip | undefined
  #queued: Trip | undefined
  #settleTimer = 0
  #stallTimer = 0

  /**
   * `rested` runs each time the track comes to rest; `final` is false when a
   * queued trip starts right after, so the carousel holds off on anything
   * that would move the track (swapping a loop copy for its slide).
   */
  constructor(scroller: Scroller, rested: (final: boolean) => void) {
    this.#scroller = scroller
    this.#rested = rested
  }

  /** Where the latest trip is headed, so quick steps chain from there. */
  get heading(): HTMLElement | undefined {
    return this.#queued?.to ?? this.#trip?.to
  }

  /** The elements the trips are headed for. */
  get destinations(): HTMLElement[] {
    return [this.#trip?.to, this.#queued?.to].filter(
      (el): el is HTMLElement => el !== undefined
    )
  }

  /**
   * Scrolls the track until `to` is in its snap position. Resolves when it
   * arrives or is given up.
   */
  go(to: HTMLElement, behavior: ScrollBehavior): Promise<void> {
    return new Promise((resolve) => {
      const trip = this.#trip

      // A trip that has arrived but not ended still snaps the track back to
      // its own slide when it ends, over a newer scroll: queue behind it.
      if (trip && this.#scroller.reached(trip.to)) {
        finish(this.#queued)
        this.#queued = { to, behavior, done: [resolve] }
        this.#armSettle()

        return
      }

      // A trip still on its way would carry the track off: stop it there.
      if (trip) {
        this.#scroller.stop()
        finish(trip)
        this.#trip = undefined
      }

      this.#start({ to, behavior, done: [resolve] })
    })
  }

  /** Gives up every trip, resolving their promises. */
  abandon(): void {
    finish(this.#trip)
    finish(this.#queued)
    this.#trip = undefined
    this.#queued = undefined
    clearTimeout(this.#stallTimer)
    // Settle once more, so the carousel syncs with wherever the track is.
    this.#armSettle()
  }

  /** The track scrolled. */
  scrolled(): void {
    if (this.#trip) this.#watch()

    if (!hasScrollEnd()) this.#armSettle()
  }

  /** The track fired `scrollend`. */
  ended(): void {
    this.#armSettle(0)
  }

  /** Gives up every trip and stops all timers. */
  dispose(): void {
    this.abandon()
    clearTimeout(this.#settleTimer)
  }

  #start(trip: Trip): void {
    // Already there, or as close as the track can scroll: no scroll, and so
    // no scrollend, would follow.
    if (this.#scroller.reached(trip.to)) {
      finish(trip)
      this.#armSettle(0)

      return
    }

    this.#trip = trip
    this.#scroller.scrollTo(trip.to, trip.behavior)
    this.#watch()

    // An instant scroll may not wait for a frame to report itself.
    if (trip.behavior === "instant") this.#armSettle()
  }

  // Gives the trip under way a second more to arrive or scroll.
  #watch(): void {
    clearTimeout(this.#stallTimer)
    this.#stallTimer = window.setTimeout(
      () => this.#settle(true),
      STALL_TIMEOUT
    )
  }

  #armSettle(delay = SETTLE_DELAY): void {
    clearTimeout(this.#settleTimer)
    this.#settleTimer = window.setTimeout(() => this.#settle(), delay)
  }

  // The track came to rest. A trip that has not arrived yet keeps going (a
  // jump inside a series of steps ends a scroll of its own) unless `stalled`.
  #settle(stalled = false): void {
    clearTimeout(this.#settleTimer)
    const trip = this.#trip

    if (trip && !stalled && !this.#scroller.reached(trip.to)) return

    clearTimeout(this.#stallTimer)
    const queued = this.#queued
    this.#trip = undefined
    this.#queued = undefined
    this.#rested(!queued)
    finish(trip)

    if (queued) this.#start(queued)
  }
}

const finish = (trip: Trip | undefined): void => {
  for (const resolve of trip?.done.splice(0) ?? []) resolve()
}
