---
name: surface-elements
description: Use when writing HTML, CSS or JavaScript with the surface-elements package (<surface-accordion>, <surface-carousel>, <surface-drawer>, <surface-header>, <surface-modal> and supportsDetailsAnimation(), adoptAccordionStyles(), supportsScrollEnd(), adoptCarouselStyles(), enhanceDialog(), lightDismiss(), routeCloseRequests(), closeAnimated(), showModal(), lockScrollWhileOpen(), supportsClosedBy(), supportsTopLayerExit(), adoptDrawerStyles(), adoptHeaderStyles(), adoptModalStyles(), lockScroll(), isScrollLocked()). Covers imports, markup, attributes, methods, styling hooks, accessibility and browser fallbacks for native dialogs and drawers.
---

# surface-elements

Vanilla web components and utilities for interface surfaces: drawers, modals, sticky headers and native `<dialog>` helpers. Light DOM, ESM only, no dependencies, no framework.

This skill is generated from the library's source and docs. Do not edit it by hand.

## Install

```sh
pnpm add surface-elements
```

## Entry points

| Import | Contains |
| --- | --- |
| `surface-elements` | Everything below. |
| `surface-elements/accordion` | `<surface-accordion>` (registers itself on import), `CLOSING_ATTRIBUTE`, `supportsDetailsAnimation` |
| `surface-elements/accordion.css` | Stylesheet for CSS-only use. |
| `surface-elements/carousel` | `<surface-carousel>` (registers itself on import), `PART_ATTRIBUTE`, `CLONE_ATTRIBUTE`, `CURRENT_ATTRIBUTE`, `supportsScrollEnd` |
| `surface-elements/carousel.css` | Stylesheet for CSS-only use. |
| `surface-elements/header` | `<surface-header>` (registers itself on import) |
| `surface-elements/header.css` | Stylesheet for CSS-only use. |
| `surface-elements/drawer` | `<surface-drawer>` (registers itself on import) |
| `surface-elements/drawer.css` | Stylesheet for CSS-only use. |
| `surface-elements/modal` | `<surface-modal>` (registers itself on import) |
| `surface-elements/modal.css` | Stylesheet for CSS-only use. |
| `surface-elements/dialog` | `CLOSING_ATTRIBUTE`, `enhanceDialog`, `lightDismiss`, `routeCloseRequests`, `closeAnimated`, `showModal`, `lockScrollWhileOpen`, `supportsClosedBy`, `supportsTopLayerExit` |
| `surface-elements/scroll-lock` | `lockScroll`, `isScrollLocked` |
| `surface-elements/custom-elements.json` |  |

## Rules

- **The `<dialog>` is the source of truth.** Open state lives in `dialog.open`. Never mirror it in your own state, and never set `open` by hand.
- **Open as a modal.** Use `<button commandfor="id" command="show-modal">`, `showModal(dialog)` or `element.show()`. A plain `dialog.show()` is non-modal: no top layer, no backdrop, no scroll lock.
- **Close through the library** with `command="close"`, `<form method="dialog">`, `closeAnimated(dialog)` or `element.close()`. A direct `dialog.close()` skips the exit animation in browsers that need the fallback.
- **Always write the wrapper.** The drawer is `<surface-drawer>` and the modal is `<surface-modal>`, each around a direct child `<dialog>`. Importing `surface-elements/drawer` or `surface-elements/modal` defines the web component, which adds the styles and the behavior. Without it, import `drawer.css` or `modal.css` for the styles and optionally call `enhanceDialog()` from `surface-elements/dialog`. Never call `enhanceDialog()` on a dialog inside a defined `<surface-drawer>` or `<surface-modal>`: it already does it.
- **Clean up.** Every function that attaches listeners returns a cleanup. Call it when the dialog leaves the page. The element cleans up by itself.
- **Accessibility.** Label every dialog (`aria-labelledby` or `aria-label`), give it a visible close button, and use `closedby="any"` for Esc and backdrop dismiss. Focus and inertness come from the native modal; do not reimplement them.
- **Styling.** All rules live in `@layer surface-elements`, so any unlayered rule wins. Theme with the `--surface-<name>-*` custom properties of each web component. Never use `!important`.
- **No polyfills ship.** Fallbacks are feature-detected. Read the browser-support reference before targeting older browsers.

## Minimal drawer

```js
import "surface-elements/drawer"
```

```html
<button commandfor="cart" command="show-modal">Cart</button>

<surface-drawer>
  <dialog id="cart" closedby="any" aria-labelledby="cart-title">
    <h2 id="cart-title">Cart</h2>
    <button commandfor="cart" command="close">Close</button>
  </dialog>
</surface-drawer>
```

`edge` on `<surface-drawer>` is the edge: `end` (default), `start`, `top` or `bottom`. Inline edges follow the writing direction.

A centered modal is the same markup with `<surface-modal>`. `size` is `small`, `medium` (default), `large` or `full`; long content scrolls inside it. For a confirmation, set `role="alertdialog"` on the dialog, leave out `closedby="any"` and close it with a `<form method="dialog">`.

## Elements

| Element | What it is | Reference |
| --- | --- | --- |
| `<surface-accordion>` | Web component that animates the native `<details>` elements directly inside it as they open and close. | [surface-accordion.md](references/accordion.md) |
| `<surface-carousel>` | Web component for a carousel or slider built on a native scroll-snap container. | [surface-carousel.md](references/carousel.md) |
| `<surface-drawer>` | Web component that turns its direct child `<dialog>` into a drawer. | [surface-drawer.md](references/drawer.md) |
| `<surface-header>` | A page header that sticks to the top of its scroll container. | [surface-header.md](references/header.md) |
| `<surface-modal>` | Web component that turns its direct child `<dialog>` into a centered modal. | [surface-modal.md](references/modal.md) |

## References

Read only the one you need.

- [references/accordion.md](references/accordion.md): The surface-accordion web component, native details that animate open and closed, one at a time or several.
- [references/browser-support.md](references/browser-support.md): What is native, what the library fills in, and what you load yourself.
- [references/carousel.md](references/carousel.md): The surface-carousel web component, a native scroll-snap carousel or slider with buttons, markers, an infinite loop and autoplay.
- [references/dialog.md](references/dialog.md): Enhance any native dialog with light-dismiss and exit-animation fallbacks and a scroll lock.
- [references/drawer.md](references/drawer.md): The surface-drawer web component, a native dialog that slides in from any edge.
- [references/header.md](references/header.md): A page header that sticks to the top, reports when it is stuck, and can hide while you scroll down.
- [references/modal.md](references/modal.md): The surface-modal web component, a native dialog centered over the page, with sizes and alert dialogs.
- [references/scroll-lock.md](references/scroll-lock.md): A ref-counted lock that stops the page from scrolling.
- [references/styling.md](references/styling.md): Custom properties, cascade layers and state hooks for theming the drawer.
- [references/without-installing.md](references/without-installing.md): Paste a web component's copy file into your project instead of installing the package.
