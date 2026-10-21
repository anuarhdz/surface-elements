# Drawer

A native dialog that slides in from any edge. Use the CSS, the functions or the custom element.

A drawer is a native `<dialog>` with a `data-drawer` attribute. The dialog stays the source of truth: open state lives in `dialog.open`, and nothing mirrors it.

You can use it at three levels. Each one adds to the one before.

| Level                                  | You import                       | You get                                                                    |
| -------------------------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| [1. HTML + CSS](#1-html--css)          | `dialog-drawer.css`              | Layout, edges, enter and exit transitions where the browser supports them. |
| [2. Functions](#2-functions)           | `surface-elements/dialog`        | Fallbacks for light dismiss and exit animations, plus the scroll lock.     |
| [3. Custom element](#3-custom-element) | `surface-elements/dialog-drawer` | Level 2 wired up for you, the styles included, and a small API.            |

## Edges

`data-drawer` sets the edge: `end` (the default, also the empty value), `start`, `top` or `bottom`. Inline edges follow the writing direction, so `end` is on the left in RTL.

## 1. HTML + CSS

Load the stylesheet and write the dialog. No JavaScript from this library runs.

JS import:

```js
import "surface-elements/dialog-drawer.css"
```

CSS @import:

```css
@import "surface-elements/dialog-drawer.css";
```

```html
<button commandfor="cart" command="show-modal">Cart</button>

<dialog id="cart" data-drawer="end" closedby="any" aria-labelledby="cart-title">
  <h2 id="cart-title">Cart</h2>
  <button commandfor="cart" command="close">Close</button>
</dialog>
```

- `command="show-modal"` opens it as a modal, in the top layer, with focus moved inside.
- `closedby="any"` closes it on Esc and on a click on the backdrop.
- `<form method="dialog">` closes it and sets `returnValue` from the submit button.

> **Note:** At this level the exit transition and `closedby` only work where the browser supports them natively. Elsewhere the drawer closes without animating, and a backdrop click does nothing. Level 2 fills both gaps.

## 2. Functions

Call `enhanceDialog()` on the dialog. It adds the fallbacks where the browser needs them and locks page scroll while the drawer is open.

```js
import "surface-elements/dialog-drawer.css"
import { enhanceDialog, closeAnimated } from "surface-elements/dialog"

const dialog = document.querySelector("#cart")
const cleanup = enhanceDialog(dialog) // { lockScroll: false } to opt out

// Later, from your own code:
await closeAnimated(dialog, "done")

// When the dialog leaves the page:
cleanup()
```

See [Dialog functions](dialog.md) for each function on its own.

## 3. Custom element

Wrap the dialog in `<dialog-drawer>`. The element calls `enhanceDialog()` on its direct child dialog and adds the styles to the document, so you do not import the CSS.

```js
import "surface-elements/dialog-drawer"
```

```html
<dialog-drawer>
  <dialog
    id="cart"
    data-drawer="end"
    closedby="any"
    aria-labelledby="cart-title"
  >
    …
  </dialog>
</dialog-drawer>
```

It rebinds when you swap the dialog, and cleans up when it leaves the page.

### API

| Member                | Type                                   | Does                                                      |
| --------------------- | -------------------------------------- | --------------------------------------------------------- |
| `show()`              | `() => void`                           | Opens the dialog as a modal. Cancels an exit in progress. |
| `close(returnValue?)` | `(string?) => Promise<void>`           | Closes after the exit transition. Resolves when closed.   |
| `toggle()`            | `() => void`                           | Calls `show()` or `close()`.                              |
| `open`                | `boolean`, read-only                   | `dialog.open`.                                            |
| `dialog`              | `HTMLDialogElement \| null`, read-only | The direct child dialog.                                  |

### Attributes

| Attribute        | Does                                               |
| ---------------- | -------------------------------------------------- |
| `no-scroll-lock` | Leaves page scroll alone while the drawer is open. |

### Styling hooks

| Selector                            | Matches                                           |
| ----------------------------------- | ------------------------------------------------- |
| `dialog-drawer:state(open)`         | The element while its dialog is open.             |
| `dialog[data-drawer][data-closing]` | The dialog while a fallback exit animation plays. |

The element itself is `display: contents`, so it adds no box to the layout.

## Accessibility

- Label the dialog. Point `aria-labelledby` at its heading, or set `aria-label`.
- Give it a visible close button. Esc and the backdrop are not discoverable for everyone.
- Focus, the inert page behind and Esc come from the native modal dialog. The library does not reimplement them.
- Under `prefers-reduced-motion: reduce` the drawer fades instead of sliding.

Why the dialog lives in light DOM: [ADR 0001](https://github.com/anuarhdz/surface-elements/blob/main/docs/adr/0001-light-dom-dialog-enhancement.md).

## API reference (generated from source)

### `<dialog-drawer>` (`DialogDrawer`)

Progressive enhancement for a drawer `<dialog>` placed as its direct child.
The dialog stays the source of truth: open state lives in `dialog.open`.
Adds the drawer styles to the document, so no CSS import is needed.

```js
import "surface-elements/dialog-drawer"
```

#### Attributes

| Attribute | Type | Description |
| --- | --- | --- |
| `no-scroll-lock` | `boolean` | Leave page scroll untouched while open. |

#### Properties

| Property | Type | Description |
| --- | --- | --- |
| `dialog` | `HTMLDialogElement \| null`, read-only | The direct child `<dialog>`, if any. |
| `open` | `boolean`, read-only | Mirrors `dialog.open`. |

#### Methods

| Method | Returns | Description |
| --- | --- | --- |
| `show()` | `void` | Opens the dialog as a modal, cancelling an exit in progress. |
| `close(returnValue?)` | `Promise<void>` | Closes after the exit transition. Resolves when closed. |
| `toggle()` | `void` | Calls `show()` or `close()`. |

#### Slots

| Slot | Description |
| --- | --- |
| (default) | The drawer `<dialog data-drawer>`, as the direct child. |

#### CSS states

| Selector | Description |
| --- | --- |
| `dialog-drawer:state(open)` | The child dialog is open. |

#### CSS custom properties

| Property | Default | Description |
| --- | --- | --- |
| `--drawer-size` | `28rem` | Inline size for `start`/`end`, block size for `top`/`bottom` (`auto`). |
| `--drawer-max-size` | `calc(100% - 3rem)` | Upper bound for the size. |
| `--drawer-padding` | `1rem` | Padding of the dialog. |
| `--drawer-background` | `Canvas` | Background of the dialog. |
| `--drawer-color` | `CanvasText` | Text color of the dialog. |
| `--drawer-border` | `none` | Border of the dialog. |
| `--drawer-radius` | `0` | Border radius of the dialog. |
| `--drawer-shadow` | `0 0 2rem rgb(0 0 0 / 0.2)` | Shadow of the dialog. |
| `--drawer-backdrop` | `rgb(0 0 0 / 0.5)` | Backdrop background. |
| `--drawer-backdrop-filter` | `none` | Backdrop filter. |
| `--drawer-duration` | `0.3s` | Enter and exit transition duration. |
| `--drawer-easing` | `cubic-bezier(0.38, 0.005, 0.215, 1)` | Enter and exit easing. |

### `drawerStyles`

Drawer styles for `dialog[data-drawer]`. Light DOM, wrapped in the
`surface-elements` cascade layer so any unlayered consumer rule wins.

`data-drawer` takes the edge the drawer is attached to:
`end` (default, also the empty value), `start`, `top` or `bottom`.

```ts
import { drawerStyles } from "surface-elements"
```

### `adoptDrawerStyles()`

Adds drawerStyles to the document once.

```ts
import { adoptDrawerStyles } from "surface-elements"

function adoptDrawerStyles(root?: Document): void
```
