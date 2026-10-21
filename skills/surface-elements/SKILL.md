---
name: surface-elements
description: Use when writing HTML, CSS or JavaScript with the surface-elements package (<dialog-drawer>, <header-sticky> and enhanceDialog(), lightDismiss(), routeCloseRequests(), closeAnimated(), showModal(), lockScrollWhileOpen(), supportsClosedBy(), supportsTopLayerExit(), adoptDrawerStyles(), lockScroll(), isScrollLocked()). Covers imports, markup, attributes, methods, styling hooks, accessibility and browser fallbacks for native dialogs and drawers.
---

# surface-elements

Vanilla web components and utilities for interface surfaces: drawers, sticky headers and native `<dialog>` helpers. Light DOM, ESM only, no dependencies, no framework.

This skill is generated from the library's source and docs. Do not edit it by hand.

## Install

```sh
pnpm add surface-elements
```

## Entry points

| Import | Contains |
| --- | --- |
| `surface-elements` | Everything below. |
| `surface-elements/header-sticky` | `<header-sticky>` (registers itself on import) |
| `surface-elements/dialog-drawer` | `<dialog-drawer>` (registers itself on import) |
| `surface-elements/dialog-drawer.css` | Stylesheet for CSS-only use. |
| `surface-elements/dialog` | `CLOSING_ATTRIBUTE`, `enhanceDialog`, `lightDismiss`, `routeCloseRequests`, `closeAnimated`, `showModal`, `lockScrollWhileOpen`, `supportsClosedBy`, `supportsTopLayerExit` |
| `surface-elements/scroll-lock` | `lockScroll`, `isScrollLocked` |
| `surface-elements/custom-elements.json` |  |

## Rules

- **The `<dialog>` is the source of truth.** Open state lives in `dialog.open`. Never mirror it in your own state, and never set `open` by hand.
- **Open as a modal.** Use `<button commandfor="id" command="show-modal">`, `showModal(dialog)` or `element.show()`. A plain `dialog.show()` is non-modal: no top layer, no backdrop, no scroll lock.
- **Close through the library** with `command="close"`, `<form method="dialog">`, `closeAnimated(dialog)` or `element.close()`. A direct `dialog.close()` skips the exit animation in browsers that need the fallback.
- **Pick one level per dialog.** CSS only (`dialog-drawer.css`), functions (`enhanceDialog()` from `surface-elements/dialog`), or the `<dialog-drawer>` element, which wraps a direct child `<dialog data-drawer>` and needs no CSS import. Do not also call `enhanceDialog()` on a dialog inside `<dialog-drawer>`: the element already does it.
- **Clean up.** Every function that attaches listeners returns a cleanup. Call it when the dialog leaves the page. The element cleans up by itself.
- **Accessibility.** Label every dialog (`aria-labelledby` or `aria-label`), give it a visible close button, and use `closedby="any"` for Esc and backdrop dismiss. Focus and inertness come from the native modal; do not reimplement them.
- **Styling.** All rules live in `@layer surface-elements`, so any unlayered rule wins. Theme with the `--drawer-*` custom properties. Never use `!important`.
- **No polyfills ship.** Fallbacks are feature-detected. Read the browser-support reference before targeting older browsers.

## Minimal drawer

```js
import "surface-elements/dialog-drawer"
```

```html
<button commandfor="cart" command="show-modal">Cart</button>

<dialog-drawer>
  <dialog id="cart" data-drawer="end" closedby="any" aria-labelledby="cart-title">
    <h2 id="cart-title">Cart</h2>
    <button commandfor="cart" command="close">Close</button>
  </dialog>
</dialog-drawer>
```

`data-drawer` is the edge: `end` (default), `start`, `top` or `bottom`. Inline edges follow the writing direction.

## Elements

| Element | What it is | Reference |
| --- | --- | --- |
| `<dialog-drawer>` | Progressive enhancement for a drawer `<dialog>` placed as its direct child. | [dialog-drawer.md](references/dialog-drawer.md) |
| `<header-sticky>` | A page header that sticks to the top. | [header-sticky.md](references/header-sticky.md) |

## References

Read only the one you need.

- [references/browser-support.md](references/browser-support.md): What is native, what the library fills in, and what you load yourself.
- [references/dialog.md](references/dialog.md): Enhance any native dialog with light-dismiss and exit-animation fallbacks and a scroll lock.
- [references/dialog-drawer.md](references/dialog-drawer.md): A native dialog that slides in from any edge. Use the CSS, the functions or the custom element.
- [references/header-sticky.md](references/header-sticky.md): A custom element for a page header that sticks to the top.
- [references/scroll-lock.md](references/scroll-lock.md): A ref-counted lock that stops the page from scrolling.
- [references/styling.md](references/styling.md): Custom properties, cascade layers and state hooks for theming the drawer.
