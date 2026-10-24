/**
 * Drawer styles for the `<dialog>` directly inside `<surface-drawer>`. Light
 * DOM, wrapped in the `surface-elements` cascade layer so any unlayered
 * consumer rule wins. The selectors match before the web component is defined,
 * so the styles also work without its JavaScript.
 *
 * `edge` on the tag takes the edge the drawer is attached to:
 * `end` (default, also missing or empty), `start`, `top` or `bottom`.
 */
export const drawerStyles = /* css */ `
@layer surface-elements {
  surface-drawer {
    display: contents;
  }

  surface-drawer > dialog {
    --_size: var(--surface-drawer-size, 28rem);
    --_max-size: var(--surface-drawer-max-size, calc(100% - 3rem));
    --_duration: var(--surface-drawer-duration, 0.3s);
    --_easing: var(--surface-drawer-easing, cubic-bezier(0.38, 0.005, 0.215, 1));

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
    padding: var(--surface-drawer-padding, 1rem);
    border: var(--surface-drawer-border, none);
    border-radius: var(--surface-drawer-radius, 0);
    background: var(--surface-drawer-background, Canvas);
    color: var(--surface-drawer-color, CanvasText);
    box-shadow: var(--surface-drawer-shadow, 0 0 2rem rgb(0 0 0 / 0.2));
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

  surface-drawer > dialog:dir(rtl) {
    --_dir: -1;
  }

  surface-drawer[edge="start"] > dialog {
    inset-inline: 0 auto;
    --_x: calc(-100% * var(--_dir));
  }

  surface-drawer[edge="top"] > dialog,
  surface-drawer[edge="bottom"] > dialog {
    inset-inline: 0;
    inline-size: auto;
    max-inline-size: none;
    block-size: var(--surface-drawer-size, auto);
    max-block-size: var(--_max-size);
    --_x: 0%;
  }

  surface-drawer[edge="top"] > dialog {
    inset-block: 0 auto;
    --_y: -100%;
  }

  surface-drawer[edge="bottom"] > dialog {
    inset-block: auto 0;
    --_y: 100%;
  }

  /* ::backdrop reads the public properties directly: older engines do not
     let it inherit from the dialog. */
  surface-drawer > dialog::backdrop {
    background: var(--surface-drawer-backdrop, rgb(0 0 0 / 0.5));
    backdrop-filter: var(--surface-drawer-backdrop-filter, none);
    opacity: 0;
    overflow: hidden;
    overscroll-behavior: contain;
    transition-property: opacity, display, overlay;
    transition-duration: var(--surface-drawer-duration, 0.3s);
    transition-timing-function: var(--surface-drawer-easing, ease-out);
    transition-behavior: allow-discrete;
  }

  /* Open state. :where() keeps the specificity equal to the
     @starting-style rules below so those still apply on entry. */
  surface-drawer > dialog[open]:where(:not([data-closing])) {
    translate: 0 0;
    opacity: 1;
  }

  surface-drawer > dialog[open]:where(:not([data-closing]))::backdrop {
    opacity: 1;
  }

  @starting-style {
    surface-drawer > dialog[open] {
      translate: var(--_hidden);
      opacity: var(--_hidden-opacity);
    }

    surface-drawer > dialog[open]::backdrop {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    surface-drawer > dialog {
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
  style.dataset["surfaceElements"] = "surface-drawer"
  style.textContent = drawerStyles
  root.head.append(style)
}
