/**
 * Accordion styles for the `<details>` directly inside `<surface-accordion>`.
 * Light DOM, wrapped in the `surface-elements` cascade layer so any unlayered
 * consumer rule wins. The selectors match before the web component is defined,
 * so the styles also work without its JavaScript.
 *
 * Where `::details-content` and `interpolate-size` exist (Chromium), the
 * open and close animation is pure CSS. Elsewhere the panels toggle at once,
 * and the web component animates them with the Web Animations API.
 */
export const accordionStyles = /* css */ `
@layer surface-elements {
  surface-accordion {
    display: block;
  }

  /* Disabled by the author, or the last open item with the persist attribute. */
  surface-accordion > details > summary[aria-disabled="true"] {
    cursor: default;
  }

  @supports (interpolate-size: allow-keywords) and selector(::details-content) {
    surface-accordion > details {
      --_duration: var(--surface-accordion-duration, 0.3s);

      interpolate-size: allow-keywords;
    }

    /* Clips only while closed or moving: overflow flips to visible once the
       open transition ends (its delay), and back to clip as closing starts. */
    surface-accordion > details::details-content {
      block-size: 0;
      opacity: 0;
      overflow-y: clip;
      transition-property: block-size, opacity, content-visibility, overflow;
      transition-duration: var(--_duration), var(--_duration), var(--_duration), 0s;
      transition-delay: 0s;
      transition-timing-function: var(--surface-accordion-easing, ease);
      transition-behavior: allow-discrete;
    }

    surface-accordion > details[open]::details-content {
      block-size: auto;
      opacity: 1;
      overflow-y: visible;
      transition-delay: 0s, 0s, 0s, var(--_duration);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    surface-accordion > details {
      --_duration: 0s;
    }
  }
}
`

let adopted = false

/** Adds {@link accordionStyles} to the document once. */
export function adoptAccordionStyles(root: Document = document): void {
  if (adopted) return
  adopted = true

  if (
    "adoptedStyleSheets" in root &&
    "replaceSync" in CSSStyleSheet.prototype
  ) {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(accordionStyles)
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]

    return
  }

  const style = root.createElement("style")
  style.dataset["surfaceElements"] = "accordion"
  style.textContent = accordionStyles
  root.head.append(style)
}
