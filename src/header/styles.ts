/**
 * Header styles for `surface-header`. Light DOM, wrapped in the
 * `surface-elements` cascade layer so any unlayered consumer rule wins.
 *
 * Without the script the header still sticks, and its descendants can query
 * `@container surface-header scroll-state(stuck: top)` where supported.
 */
export const headerStyles = /* css */ `
@layer surface-elements {
  surface-header {
    --_offset: var(--surface-header-offset, 0px);

    display: block;
    position: sticky;
    inset-block-start: var(--_offset);
    z-index: 1;
    background: Canvas;
    color: CanvasText;
    container: surface-header / scroll-state;

    transition-property: translate;
    transition-duration: var(--surface-header-duration, 0.2s);
    transition-timing-function: var(--surface-header-easing, ease-out);
  }

  /* Moves past the top edge, offset included, so nothing peeks out. */
  surface-header:state(hidden) {
    translate: 0 calc(-100% - var(--_offset));
  }

  @media (prefers-reduced-motion: reduce) {
    surface-header {
      transition-duration: 0s;
    }
  }
}
`

let adopted = false

/** Adds {@link headerStyles} to the document once. */
export function adoptHeaderStyles(root: Document = document): void {
  if (adopted) return
  adopted = true

  if (
    "adoptedStyleSheets" in root &&
    "replaceSync" in CSSStyleSheet.prototype
  ) {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(headerStyles)
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]

    return
  }

  const style = root.createElement("style")
  style.dataset["surfaceElements"] = "header"
  style.textContent = headerStyles
  root.head.append(style)
}
