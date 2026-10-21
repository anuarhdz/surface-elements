---
name: surface-elements
description: {{description}}
---

# surface-elements

Vanilla web components and utilities for interface surfaces: drawers, sticky headers and native `<dialog>` helpers. Light DOM, ESM only, no dependencies, no framework.

This skill is generated from the library's source and docs. Do not edit it by hand.

## Install

```sh
pnpm add surface-elements
```

## Entry points

{{entryPoints}}

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

{{elements}}

## References

Read only the one you need.

{{references}}
