# surface-elements

Vanilla web components and utilities for common interface surfaces.

**Docs and live demos:** https://surface-elements.anuar.dev

## Install

```bash
pnpm add surface-elements
```

## Drawer

A drawer is a native `<dialog>` inside `<surface-drawer>`. Use it at the level you need.

### 1. HTML + CSS

```js
import "surface-elements/drawer.css" // or @import it from your CSS
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

The styles match the tag even when its JavaScript is not loaded. `edge` is the edge: `end` (default), `start`, `top` or `bottom`.

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

### 3. Web component

```js
import "surface-elements/drawer"
```

```html
<surface-drawer>
  <dialog id="cart" closedby="any" aria-labelledby="cart-title">
    …
  </dialog>
</surface-drawer>
```

Defines `<surface-drawer>`, which runs level 2 on its dialog and adds the styles to the document. API: `show()`, `close(returnValue?)`, `toggle()`, `open`, `dialog`. Styling hook: `surface-drawer:state(open)`. Attribute `no-scroll-lock` opts out of the scroll lock.

### Custom properties

| Property | Default |
| --- | --- |
| `--surface-drawer-size` | `28rem` (inline) / `auto` (block) |
| `--surface-drawer-max-size` | `calc(100% - 3rem)` |
| `--surface-drawer-padding` | `1rem` |
| `--surface-drawer-background` / `--surface-drawer-color` | `Canvas` / `CanvasText` |
| `--surface-drawer-border` / `--surface-drawer-radius` / `--surface-drawer-shadow` | `none` / `0` / soft shadow |
| `--surface-drawer-backdrop` / `--surface-drawer-backdrop-filter` | `rgb(0 0 0 / 0.5)` / `none` |
| `--surface-drawer-duration` / `--surface-drawer-easing` | `0.3s` / ease-out curve |

Styles live in `@layer surface-elements`, so any unlayered rule overrides them.

### Browser support

Invoker commands (`commandfor`) are not polyfilled by this library. For older browsers load [`invokers-polyfill`](https://github.com/keithamus/invokers-polyfill) only where missing:

```js
if (!("commandForElement" in HTMLButtonElement.prototype)) {
  import("invokers-polyfill")
}
```

## Modal

A centered modal is a native `<dialog>` inside `<surface-modal>`, at the same three levels as the drawer: `modal.css`, the `surface-elements/dialog` functions, or the web component.

```js
import "surface-elements/modal"
```

```html
<button commandfor="settings" command="show-modal">Settings</button>

<surface-modal size="small">
  <dialog id="settings" closedby="any" aria-labelledby="settings-title">
    <h2 id="settings-title">Settings</h2>
    <button commandfor="settings" command="close">Close</button>
  </dialog>
</surface-modal>
```

`size` is `small`, `medium` (default), `large` or `full`. Long content scrolls inside the modal. For alerts and confirmations use `role="alertdialog"` on the dialog. Same API as the drawer; theme with `--surface-modal-*`.

## Agent skill

The package ships a skill that teaches coding agents how to use it, generated from the source and the docs on every build.

```bash
npx skills add anuarhdz/surface-elements
```

Or point your agent at `node_modules/surface-elements/skills/surface-elements/SKILL.md`. A [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest) ships at `surface-elements/custom-elements.json` for editors and tooling.

## Develop

```bash
pnpm install
pnpm exec playwright install chromium # browser tests need Chromium, once
pnpm dev      # playground at demo/ (see docs/playground.md)
pnpm docs:dev # docs site at site/
pnpm test
pnpm build
```

## License

MIT
