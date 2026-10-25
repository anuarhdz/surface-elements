/**
 * Modal styles for the `<dialog>` directly inside `<surface-modal>`. Light
 * DOM, wrapped in the `surface-elements` cascade layer so any unlayered
 * consumer rule wins. The selectors match before the web component is defined,
 * so the styles also work without its JavaScript.
 *
 * `size` on the tag picks a preset width: `small`, `medium` (default, also
 * missing or empty), `large` or `full`. `scroll="page"` turns the dialog into
 * a transparent scrolling layer and styles its only child as the panel.
 */
export const modalStyles = /* css */ `
@layer surface-elements {
  surface-modal {
    display: contents;
  }

  surface-modal > dialog {
    --_size: var(--surface-modal-size, 32rem);
    --_gutter: var(--surface-modal-gutter, 1rem);
    --_duration: var(--surface-modal-duration, 0.2s);
    --_easing: var(--surface-modal-easing, cubic-bezier(0.2, 0, 0, 1));
    --_hidden-scale: 0.96;

    box-sizing: border-box;
    position: fixed;
    inset: 0;
    margin: auto;
    padding: var(--surface-modal-padding, 1.5rem);
    border: var(--surface-modal-border, none);
    border-radius: var(--surface-modal-radius, 0.75rem);
    background: var(--surface-modal-background, Canvas);
    color: var(--surface-modal-color, CanvasText);
    box-shadow: var(--surface-modal-shadow, 0 1rem 3rem rgb(0 0 0 / 0.25));
    outline: none;

    /* Centered, as tall as its content, scrolling inside past the viewport. */
    inline-size: var(--_size);
    max-inline-size: calc(100% - 2 * var(--_gutter));
    block-size: fit-content;
    max-block-size: calc(100% - 2 * var(--_gutter));
    overflow: auto;

    scale: var(--_hidden-scale);
    opacity: 0;
    transition-property: scale, opacity, display, overlay;
    transition-duration: var(--_duration);
    transition-timing-function: var(--_easing);
    transition-behavior: allow-discrete;
  }

  surface-modal[size="small"] > dialog {
    --_size: 24rem;
  }

  surface-modal[size="large"] > dialog {
    --_size: 48rem;
  }

  surface-modal[size="full"] > dialog {
    inline-size: 100%;
    max-inline-size: none;
    block-size: 100%;
    max-block-size: none;
    border-radius: 0;
  }

  /* Page scroll: the dialog covers the viewport and scrolls; the panel is its
     only child and grows with its content. */
  surface-modal[scroll="page"] > dialog {
    inline-size: 100%;
    max-inline-size: none;
    block-size: 100%;
    max-block-size: none;
    padding: var(--_gutter);
    border: none;
    border-radius: 0;
    background: none;
    box-shadow: none;
  }

  surface-modal[scroll="page"] > dialog > * {
    box-sizing: border-box;
    inline-size: var(--_size);
    max-inline-size: 100%;
    margin-inline: auto;
    padding: var(--surface-modal-padding, 1.5rem);
    border: var(--surface-modal-border, none);
    border-radius: var(--surface-modal-radius, 0.75rem);
    background: var(--surface-modal-background, Canvas);
    color: var(--surface-modal-color, CanvasText);
    box-shadow: var(--surface-modal-shadow, 0 1rem 3rem rgb(0 0 0 / 0.25));
  }

  surface-modal[scroll="page"][size="full"] > dialog {
    padding: 0;
  }

  surface-modal[scroll="page"][size="full"] > dialog > * {
    inline-size: 100%;
    min-block-size: 100%;
    border-radius: 0;
  }

  /* Scroll containment is part of the scroll lock: with it, wheel and touch
     over the modal never reach the page, so no-scroll-lock drops it. */
  surface-modal:not([no-scroll-lock]) > dialog,
  surface-modal:not([no-scroll-lock]) > dialog::backdrop {
    overscroll-behavior: contain;
  }

  /* ::backdrop reads the public properties directly: older engines do not
     let it inherit from the dialog. */
  surface-modal > dialog::backdrop {
    background: var(--surface-modal-backdrop, rgb(0 0 0 / 0.5));
    backdrop-filter: var(--surface-modal-backdrop-filter, none);
    opacity: 0;
    overflow: hidden;
    transition-property: opacity, display, overlay;
    transition-duration: var(--surface-modal-duration, 0.2s);
    transition-timing-function: var(--surface-modal-easing, ease-out);
    transition-behavior: allow-discrete;
  }

  /* Open state. :where() keeps the specificity equal to the
     @starting-style rules below so those still apply on entry. */
  surface-modal > dialog[open]:where(:not([data-closing])) {
    scale: 1;
    opacity: 1;
  }

  surface-modal > dialog[open]:where(:not([data-closing]))::backdrop {
    opacity: 1;
  }

  @starting-style {
    surface-modal > dialog[open] {
      scale: var(--_hidden-scale);
      opacity: 0;
    }

    surface-modal > dialog[open]::backdrop {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    surface-modal > dialog {
      --_hidden-scale: 1;
    }
  }
}
`

let adopted = false

/** Adds {@link modalStyles} to the document once. */
export function adoptModalStyles(root: Document = document): void {
  if (adopted) return
  adopted = true

  if (
    "adoptedStyleSheets" in root &&
    "replaceSync" in CSSStyleSheet.prototype
  ) {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(modalStyles)
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]

    return
  }

  const style = root.createElement("style")
  style.dataset["surfaceElements"] = "surface-modal"
  style.textContent = modalStyles
  root.head.append(style)
}
