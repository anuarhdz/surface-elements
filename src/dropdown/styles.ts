/**
 * Dropdown styles for the `[popover]` directly inside `<surface-dropdown>`.
 * Light DOM, wrapped in the `surface-elements` cascade layer so any unlayered
 * consumer rule wins. The selectors match before the web component is defined,
 * so the styles also work without its JavaScript.
 *
 * Where anchor positioning exists, CSS places the panel next to its button and
 * flips it at the viewport edges. Elsewhere the web component places it, and
 * without either the panel stays where the browser puts a popover: centered.
 */
export const dropdownStyles = /* css */ `
@layer surface-elements {
  surface-dropdown {
    display: inline-block;
  }

  /* The whole row, so the mouse stays on it on its way to the flyout. */
  surface-dropdown surface-dropdown {
    display: block;
  }

  surface-dropdown > [popover] {
    box-sizing: border-box;
    min-inline-size: var(--surface-dropdown-min-size, 12rem);
    padding: var(--surface-dropdown-padding, 0.5rem);
    border: var(--surface-dropdown-border, 1px solid color-mix(in srgb, CanvasText 15%, transparent));
    border-radius: var(--surface-dropdown-radius, 0.5rem);
    background: var(--surface-dropdown-background, Canvas);
    color: var(--surface-dropdown-color, CanvasText);
    box-shadow: var(--surface-dropdown-shadow, 0 0.5rem 1.5rem rgb(0 0 0 / 0.15));
    list-style: none;
  }

  @media (prefers-reduced-motion: no-preference) {
    /* The web component sets the origin to the corner next to the button, since
       only it knows which fallback the browser chose. A panel inherits from the
       panel around it, so each one resets the property. */
    surface-dropdown > [popover] {
      --_surface-dropdown-origin: initial;
      opacity: 0;
      scale: var(--surface-dropdown-scale, 0.96);
      transform-origin: var(--_surface-dropdown-origin, top left);
      transition-property: opacity, scale, display, overlay;
      transition-duration: var(--surface-dropdown-close-duration, 0.1s);
      transition-timing-function: var(--surface-dropdown-easing, ease-out);
      transition-behavior: allow-discrete;
    }

    surface-dropdown > [popover]:dir(rtl) {
      transform-origin: var(--_surface-dropdown-origin, top right);
    }

    surface-dropdown > [popover]:popover-open {
      opacity: 1;
      scale: 1;
      transition-duration: var(--surface-dropdown-open-duration, 0.18s);

      @starting-style {
        opacity: 0;
        scale: var(--surface-dropdown-scale, 0.96);
      }
    }
  }

  @supports (anchor-name: --a) {
    surface-dropdown > [popover] {
      inset: auto;
      margin: 0;
      margin-block-start: var(--surface-dropdown-offset, 0.25rem);
      position-area: block-end span-inline-end;
      position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline;
    }

    /* A dropdown inside a dropdown is a flyout: beside the panel around it, level
       with its button. The web component names that panel; until then, and
       without JavaScript, the fallback is the button's own edge. */
    surface-dropdown surface-dropdown > [popover] {
      margin: 0;
      margin-inline-start: var(--surface-dropdown-offset, 0.25rem);
      position-area: none;
      inset-block-start: anchor(start);
      inset-inline-start: anchor(var(--_surface-dropdown-edge,) end, anchor(end));
      position-try-fallbacks: flip-inline, flip-block, flip-block flip-inline, --surface-dropdown-below;
    }

    /* Last resort on narrow viewports, where neither side fits. */
    @position-try --surface-dropdown-below {
      position-area: block-end span-inline-end;
      inset-block-start: auto;
      inset-inline-start: auto;
      margin: 0;
      margin-block-start: var(--surface-dropdown-offset, 0.25rem);
      margin-inline-start: 1rem;
      min-inline-size: 0;
      max-inline-size: calc(100% - 1rem);
    }
  }
}
`

let adopted = false

/** Adds {@link dropdownStyles} to the document once. */
export function adoptDropdownStyles(root: Document = document): void {
  if (adopted) return
  adopted = true

  if (
    "adoptedStyleSheets" in root &&
    "replaceSync" in CSSStyleSheet.prototype
  ) {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(dropdownStyles)
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]

    return
  }

  const style = root.createElement("style")
  style.dataset["surfaceElements"] = "dropdown"
  style.textContent = dropdownStyles
  root.head.append(style)
}
