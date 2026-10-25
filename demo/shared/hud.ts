// A fixed readout in the corner, refreshed every frame. For playground pages.
export function hud(read: () => Record<string, unknown>): void {
  const out = document.createElement("output")
  out.setAttribute("aria-hidden", "true")
  out.style.cssText = [
    "position: fixed",
    "inset-inline-end: 0.75rem",
    "inset-block-end: 0.75rem",
    "z-index: 2147483647",
    "padding: 0.5rem 0.75rem",
    "border: 1px solid color-mix(in srgb, CanvasText 20%, transparent)",
    "border-radius: 0.5rem",
    "background: Canvas",
    "color: CanvasText",
    "font: 0.75rem/1.4 ui-monospace, monospace",
    "white-space: pre",
    "pointer-events: none",
  ].join(";")
  document.body.append(out)

  const render = () => {
    const entries = Object.entries(read())
    const width = Math.max(...entries.map(([key]) => key.length))
    out.textContent = entries
      .map(([key, value]) => `${key.padEnd(width)}  ${String(value)}`)
      .join("\n")
    requestAnimationFrame(render)
  }
  render()
}
