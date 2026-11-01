/** Whether CSS can tether the panel to its button. */
export function supportsAnchorPositioning(): boolean {
  // jsdom has no CSS namespace.
  return "CSS" in globalThis && CSS.supports("anchor-name: --a")
}

interface Box {
  top: number
  right: number
  bottom: number
  left: number
}

interface Size {
  width: number
  height: number
}

interface Point {
  top: number
  left: number
}

interface PlacementOptions {
  /** A flyout, beside its button, rather than below it. */
  nested: boolean
  rtl: boolean
  offset: number
}

// The first position that fits, else the first, kept inside the viewport.
function fit(
  preferred: number,
  flipped: number,
  size: number,
  room: number
): number {
  const fits = (start: number): boolean => start >= 0 && start + size <= room
  const start = fits(preferred) || !fits(flipped) ? preferred : flipped

  return Math.max(0, Math.min(start, room - size))
}

/**
 * Viewport coordinates for a panel where anchor positioning is missing, with
 * the placement and the flips the styles ask of the browser elsewhere.
 */
export function placement(
  anchor: Box,
  panel: Size,
  viewport: Size,
  { nested, rtl, offset }: PlacementOptions
): Point {
  const alignStart = rtl ? anchor.right - panel.width : anchor.left
  const alignEnd = rtl ? anchor.left : anchor.right - panel.width

  if (nested) {
    const after = anchor.right + offset
    const before = anchor.left - offset - panel.width

    return {
      top: fit(
        anchor.top,
        anchor.bottom - panel.height,
        panel.height,
        viewport.height
      ),
      left: fit(
        rtl ? before : after,
        rtl ? after : before,
        panel.width,
        viewport.width
      ),
    }
  }

  return {
    top: fit(
      anchor.bottom + offset,
      anchor.top - offset - panel.height,
      panel.height,
      viewport.height
    ),
    left: fit(alignStart, alignEnd, panel.width, viewport.width),
  }
}

// The panel's edge next to the button on one axis: the near one when the panel
// is past the button, else the one it is aligned with.
function nearEdge(
  anchorStart: number,
  anchorEnd: number,
  panelStart: number,
  panelEnd: number
): "start" | "end" {
  if (panelStart >= anchorEnd) return "start"

  if (panelEnd <= anchorStart) return "end"

  return Math.abs(panelStart - anchorStart) <= Math.abs(panelEnd - anchorEnd)
    ? "start"
    : "end"
}

/** The `transform-origin` that makes a panel grow out of its button. */
export function transformOrigin(anchor: Box, panel: Box): string {
  const x = nearEdge(anchor.left, anchor.right, panel.left, panel.right)
  const y = nearEdge(anchor.top, anchor.bottom, panel.top, panel.bottom)

  return `${x === "start" ? "left" : "right"} ${y === "start" ? "top" : "bottom"}`
}

/**
 * Places an open panel next to its button and keeps it there while the page
 * scrolls or resizes. Returns a function that stops following. The inline
 * position stays, since a closing panel still renders during its exit
 * transition; {@link clearPlacement} removes it.
 */
export function placePanel(
  trigger: HTMLElement,
  panel: HTMLElement,
  outerPanel: HTMLElement | null
): () => void {
  const { style } = panel

  const place = (): void => {
    // Resolves the offset to pixels, whatever its unit.
    style.margin = "0"
    style.marginBlockStart = "var(--surface-dropdown-offset, 0.25rem)"

    const offset =
      Number.parseFloat(getComputedStyle(panel).marginBlockStart) || 0

    style.margin = "0"

    const button = trigger.getBoundingClientRect()

    const { top, left } = placement(
      // A flyout clears the panel around it, level with its button. Sizes come
      // from layout, since rectangles include the scale of the enter transition.
      outerPanel
        ? {
            top: button.top,
            bottom: button.bottom,
            left: outerPanel.offsetLeft,
            right: outerPanel.offsetLeft + outerPanel.offsetWidth,
          }
        : button,
      { width: panel.offsetWidth, height: panel.offsetHeight },
      { width: innerWidth, height: innerHeight },
      {
        nested: Boolean(outerPanel),
        rtl: getComputedStyle(trigger).direction === "rtl",
        offset,
      }
    )

    style.inset = "auto"
    style.top = `${top}px`
    style.left = `${left}px`
  }

  place()
  addEventListener("resize", place, { passive: true })
  addEventListener("scroll", place, { capture: true, passive: true })

  return () => {
    removeEventListener("resize", place)
    removeEventListener("scroll", place, { capture: true })
  }
}

/** Removes the inline position {@link placePanel} set. */
export function clearPlacement(panel: HTMLElement): void {
  panel.style.removeProperty("margin")
  panel.style.removeProperty("inset")

  if (panel.getAttribute("style") === "") panel.removeAttribute("style")
}
