# surface-elements

Vanilla web components and utilities for common interface surfaces.

**Docs and live demos:** https://surface-elements-docs.iniciatico.workers.dev

## Install

```bash
pnpm add surface-elements
```

## Drawer

A drawer is a native `<dialog>` with `data-drawer`. Use it at the level you need.

### 1. HTML + CSS

```js
import "surface-elements/dialog-drawer.css" // or @import it from your CSS
```

```html
<button commandfor="cart" command="show-modal">Cart</button>

<dialog id="cart" data-drawer="end" closedby="any" aria-labelledby="cart-title">
  <h2 id="cart-title">Cart</h2>
  <button commandfor="cart" command="close">Close</button>
</dialog>
```

`data-drawer` is the edge: `end` (default), `start`, `top` or `bottom`.

### 2. Functions

```js
import { enhanceDialog, closeAnimated } from "surface-elements/dialog"

const cleanup = enhanceDialog(dialog) // { lockScroll: false } to opt out
await closeAnimated(dialog, "done")
```

| Function | Does |
| --- | --- |
| `enhanceDialog(dialog, options?)` | All of the below. Returns a cleanup. |
| `lightDismiss(dialog)` | `closedby="any"` fallback where it is not native. |
| `routeCloseRequests(dialog)` | Animates Esc, light dismiss, `command="close"` and `<form method="dialog">` where exit transitions are not native. |
| `lockScrollWhileOpen(dialog)` | Locks page scroll while the dialog is modal. |
| `closeAnimated(dialog, returnValue?)` | Closes after the exit transition. |
| `showModal(dialog)` | Opens, cancelling an exit in progress. |

`lockScroll()` from `surface-elements/scroll-lock` is the ref-counted lock on its own.

### 3. Custom element

```js
import "surface-elements/dialog-drawer"
```

```html
<dialog-drawer>
  <dialog id="cart" data-drawer="end" closedby="any" aria-labelledby="cart-title">
    …
  </dialog>
</dialog-drawer>
```

Wraps level 2 and adds the styles to the document. API: `show()`, `close(returnValue?)`, `toggle()`, `open`, `dialog`. Styling hook: `dialog-drawer:state(open)`. Attribute `no-scroll-lock` opts out of the scroll lock.

### Custom properties

| Property | Default |
| --- | --- |
| `--drawer-size` | `28rem` (inline) / `auto` (block) |
| `--drawer-max-size` | `calc(100% - 3rem)` |
| `--drawer-padding` | `1rem` |
| `--drawer-background` / `--drawer-color` | `Canvas` / `CanvasText` |
| `--drawer-border` / `--drawer-radius` / `--drawer-shadow` | `none` / `0` / soft shadow |
| `--drawer-backdrop` / `--drawer-backdrop-filter` | `rgb(0 0 0 / 0.5)` / `none` |
| `--drawer-duration` / `--drawer-easing` | `0.3s` / ease-out curve |

Styles live in `@layer surface-elements`, so any unlayered rule overrides them.

### Browser support

Invoker commands (`commandfor`) are not polyfilled by this library. For older browsers load [`invokers-polyfill`](https://github.com/keithamus/invokers-polyfill) only where missing:

```js
if (!("commandForElement" in HTMLButtonElement.prototype)) {
  import("invokers-polyfill")
}
```

## Develop

```bash
pnpm install
pnpm exec playwright install chromium # browser tests need Chromium, once
pnpm dev      # demo at demo/
pnpm docs:dev # docs site at site/
pnpm test
pnpm build
```

## License

MIT
