/**
 * Carousel styles for `<surface-carousel>`. Light DOM, wrapped in the
 * `surface-elements` cascade layer so any unlayered consumer rule wins. The
 * selectors match before the web component is defined, so the track scrolls
 * and snaps without its JavaScript too.
 *
 * Without the script, anchor markers (`<a href="#slide-id">`) still scroll to
 * their slide, and where `scroll-target-group` exists (Chromium) the one whose
 * slide is in view matches `:target-current`. Prev, next and play buttons need
 * the script, so they stay hidden until the web component is defined.
 */
export const carouselStyles = /* css */ `
@layer surface-elements {
  surface-carousel {
    --_gap: var(--surface-carousel-gap, 1rem);
    --_per-view: var(--surface-carousel-per-view, 1);

    display: block;
  }

  surface-carousel [data-surface-carousel="track"] {
    display: flex;
    gap: var(--_gap);
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
  }

  /* Slides can query @container scroll-state(snapped: x) where supported. */
  surface-carousel [data-surface-carousel="track"] > * {
    flex: 0 0 calc((100% - (var(--_per-view) - 1) * var(--_gap)) / var(--_per-view));
    min-inline-size: 0;
    scroll-snap-align: var(--surface-carousel-align, start);
    container-type: scroll-state;
  }

  surface-carousel [data-surface-carousel="markers"] {
    scroll-target-group: auto;
  }

  surface-carousel:not(:defined)
    :is([data-surface-carousel="prev"], [data-surface-carousel="next"], [data-surface-carousel="play"]) {
    display: none;
  }

  @media (any-pointer: fine) {
    surface-carousel[drag] [data-surface-carousel="track"] {
      cursor: grab;
    }
  }

  surface-carousel:state(dragging) [data-surface-carousel="track"] {
    cursor: grabbing;
    user-select: none;
  }

  surface-carousel [data-surface-carousel][aria-disabled="true"] {
    cursor: default;
  }

  @media (prefers-reduced-motion: no-preference) {
    surface-carousel [data-surface-carousel="track"] {
      scroll-behavior: smooth;
    }
  }
}
`

let adopted = false

/** Adds {@link carouselStyles} to the document once. */
export function adoptCarouselStyles(root: Document = document): void {
  if (adopted) return
  adopted = true

  if (
    "adoptedStyleSheets" in root &&
    "replaceSync" in CSSStyleSheet.prototype
  ) {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(carouselStyles)
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]

    return
  }

  const style = root.createElement("style")
  style.dataset["surfaceElements"] = "carousel"
  style.textContent = carouselStyles
  root.head.append(style)
}
