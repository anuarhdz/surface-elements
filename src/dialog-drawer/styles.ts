/**
 * Drawer styles for `dialog[data-drawer]`. Light DOM, wrapped in the
 * `surface-elements` cascade layer so any unlayered consumer rule wins.
 *
 * `data-drawer` takes the edge the drawer is attached to:
 * `end` (default, also the empty value), `start`, `top` or `bottom`.
 */
export const drawerStyles = /* css */ `
@layer surface-elements {
  dialog-drawer {
    display: contents;
  }

  dialog[data-drawer] {
    --_size: var(--drawer-size, 28rem);
    --_max-size: var(--drawer-max-size, calc(100% - 3rem));
    --_duration: var(--drawer-duration, 0.3s);
    --_easing: var(--drawer-easing, cubic-bezier(0.38, 0.005, 0.215, 1));

    /* Hidden offset: --_x/--_y per edge, --_dir flips inline edges in RTL,
       --_motion drops the slide under reduced motion. */
    --_dir: 1;
    --_motion: 1;
    --_x: calc(100% * var(--_dir));
    --_y: 0%;
    --_hidden: calc(var(--_x) * var(--_motion)) calc(var(--_y) * var(--_motion));
    --_hidden-opacity: 1;

    box-sizing: border-box;
    position: fixed;
    margin: 0;
    padding: var(--drawer-padding, 1rem);
    border: var(--drawer-border, none);
    border-radius: var(--drawer-radius, 0);
    background: var(--drawer-background, Canvas);
    color: var(--drawer-color, CanvasText);
    box-shadow: var(--drawer-shadow, 0 0 2rem rgb(0 0 0 / 0.2));
    outline: none;

    /* Attached to the inline-end edge, full height. */
    inset-block: 0;
    inset-inline: auto 0;
    block-size: auto;
    max-block-size: none;
    inline-size: var(--_size);
    max-inline-size: var(--_max-size);

    overflow: auto;
    overscroll-behavior: contain;

    translate: var(--_hidden);
    opacity: var(--_hidden-opacity);
    transition-property: translate, opacity, display, overlay;
    transition-duration: var(--_duration);
    transition-timing-function: var(--_easing);
    transition-behavior: allow-discrete;
  }

  dialog[data-drawer]:dir(rtl) {
    --_dir: -1;
  }

  dialog[data-drawer="start"] {
    inset-inline: 0 auto;
    --_x: calc(-100% * var(--_dir));
  }

  dialog[data-drawer="top"],
  dialog[data-drawer="bottom"] {
    inset-inline: 0;
    inline-size: auto;
    max-inline-size: none;
    block-size: var(--drawer-size, auto);
    max-block-size: var(--_max-size);
    --_x: 0%;
  }

  dialog[data-drawer="top"] {
    inset-block: 0 auto;
    --_y: -100%;
  }

  dialog[data-drawer="bottom"] {
    inset-block: auto 0;
    --_y: 100%;
  }

  /* ::backdrop reads the public properties directly: older engines do not
     let it inherit from the dialog. */
  dialog[data-drawer]::backdrop {
    background: var(--drawer-backdrop, rgb(0 0 0 / 0.5));
    backdrop-filter: var(--drawer-backdrop-filter, none);
    opacity: 0;
    overflow: hidden;
    overscroll-behavior: contain;
    transition-property: opacity, display, overlay;
    transition-duration: var(--drawer-duration, 0.3s);
    transition-timing-function: var(--drawer-easing, ease-out);
    transition-behavior: allow-discrete;
  }

  /* Open state. :where() keeps the specificity equal to the
     @starting-style rules below so those still apply on entry. */
  dialog[data-drawer][open]:where(:not([data-closing])) {
    translate: 0 0;
    opacity: 1;
  }

  dialog[data-drawer][open]:where(:not([data-closing]))::backdrop {
    opacity: 1;
  }

  @starting-style {
    dialog[data-drawer][open] {
      translate: var(--_hidden);
      opacity: var(--_hidden-opacity);
    }

    dialog[data-drawer][open]::backdrop {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    dialog[data-drawer] {
      --_motion: 0;
      --_hidden-opacity: 0;
      --_duration: 0.15s;
    }
  }
}
`

let adopted = false

/** Adds {@link drawerStyles} to the document once. */
export function adoptDrawerStyles(root: Document = document): void {
  if (adopted) return
  adopted = true

  if (
    "adoptedStyleSheets" in root &&
    "replaceSync" in CSSStyleSheet.prototype
  ) {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(drawerStyles)
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]

    return
  }

  const style = root.createElement("style")
  style.dataset["surfaceElements"] = "dialog-drawer"
  style.textContent = drawerStyles
  root.head.append(style)
}
