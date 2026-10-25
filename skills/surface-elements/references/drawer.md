# Drawer

The surface-drawer web component, a native dialog that slides in from any edge.

`<surface-drawer>` turns the native `<dialog>` inside it into a drawer. The dialog stays the source of truth: open state lives in `dialog.open`, and nothing mirrors it.

## Install and use

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

The import defines the web component, which adds the styles to the document, so there is no CSS to import. It enhances its direct child dialog, rebinds when you swap it, and cleans up when it leaves the page.

- `command="show-modal"` opens it as a modal, in the top layer, with focus moved inside.
- `closedby="any"` closes it on Esc and on a click on the backdrop.
- `<form method="dialog">` closes it and sets `returnValue` from the submit button.

`edge` sets the edge: `end` (the default), `start`, `top` or `bottom`. Inline edges follow the writing direction, so `end` is on the left in RTL.

## Copy

> **Note:** The copy file for this web component is not generated yet. Until it is, install the package.

## API

| Member                | Type                                   | Does                                                      |
| --------------------- | -------------------------------------- | --------------------------------------------------------- |
| `show()`              | `() => void`                           | Opens the dialog as a modal. Cancels an exit in progress. |
| `close(returnValue?)` | `(string?) => Promise<void>`           | Closes after the exit transition. Resolves when closed.   |
| `toggle()`            | `() => void`                           | Calls `show()` or `close()`.                              |
| `open`                | `boolean`, read-only                   | `dialog.open`.                                            |
| `dialog`              | `HTMLDialogElement \| null`, read-only | The direct child dialog.                                  |

| Attribute        | Does                                                         |
| ---------------- | ------------------------------------------------------------ |
| `edge`           | `end` (default), `start`, `top` or `bottom`.                 |
| `no-scroll-lock` | Leaves page scroll alone while the drawer is open.           |

| Selector                                | Matches                                           |
| --------------------------------------- | ------------------------------------------------- |
| `surface-drawer:state(open)`            | The web component while its dialog is open.       |
| `surface-drawer > dialog[data-closing]` | The dialog while a fallback exit animation plays. |

The web component is `display: contents`, so it adds no box to the layout. The `--surface-drawer-*` custom properties are listed in [Styling](styling.md#custom-properties).

## If you implement it by hand

### Markup

The same as above. Keep the `<surface-drawer>` wrapper even without the JavaScript: the styles select `surface-drawer > dialog`, and an undefined tag still renders its children.

### CSS

Load the stylesheet instead of the web component. No JavaScript from this library runs.

```css
@import "surface-elements/drawer.css";
```

You get the layout, the edges and the enter and exit transitions where the browser supports them natively. The rules live in `@layer surface-elements`, so any unlayered rule of yours wins.

### What the JavaScript adds

The web component calls [`enhanceDialog()`](dialog.md) on its dialog and adds the styles. Without it:

- The exit transition only plays where the browser animates out of the top layer. Elsewhere the drawer closes without animating.
- `closedby="any"` only works where it is native. Elsewhere a backdrop click does nothing.
- Page scroll is not locked while the drawer is open.
- `surface-drawer:state(open)` never matches. Style `surface-drawer > dialog[open]` instead.

To get the first three without the web component, call `enhanceDialog(dialog)` yourself and keep the CSS import. Do not do both on the same dialog.

### Accessibility

- Label the dialog. Point `aria-labelledby` at its heading, or set `aria-label`.
- Give it a visible close button. Esc and the backdrop are not discoverable for everyone.
- Focus, the inert page behind and Esc come from the native modal dialog. The library does not reimplement them.
- Under `prefers-reduced-motion: reduce` the drawer fades instead of sliding.

Why the dialog lives in light DOM: [ADR 0001](https://github.com/anuarhdz/surface-elements/blob/main/docs/adr/0001-light-dom-dialog-enhancement.md).

### Browser support

See [Browser support](browser-support.md) for what is native, what falls back and which polyfills you may load.

## API reference (generated from source)

### `<surface-drawer>` (`SurfaceDrawer`)

Web component that turns its direct child `<dialog>` into a drawer.
The dialog stays the source of truth: open state lives in `dialog.open`.
Adds the drawer styles to the document, so no CSS import is needed. The
styles key on the tag, so the markup works with `drawer.css` and no JS too.

```js
import "surface-elements/drawer"
```

#### Attributes

| Attribute | Type | Description |
| --- | --- | --- |
| `no-scroll-lock` | `boolean` | Leave page scroll untouched while open. |
| `edge` | `"end" \| "start" \| "top" \| "bottom"` | Edge the drawer is attached to. Defaults to `end`. Inline edges follow the writing direction. |

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
| (default) | The drawer `<dialog>`, as the direct child. |

#### CSS states

| Selector | Description |
| --- | --- |
| `surface-drawer:state(open)` | The child dialog is open. |

#### CSS custom properties

| Property | Default | Description |
| --- | --- | --- |
| `--surface-drawer-size` | `28rem` | Inline size for `start`/`end`, block size for `top`/`bottom` (`auto`). |
| `--surface-drawer-max-size` | `calc(100% - 3rem)` | Upper bound for the size. |
| `--surface-drawer-padding` | `1rem` | Padding of the dialog. |
| `--surface-drawer-background` | `Canvas` | Background of the dialog. |
| `--surface-drawer-color` | `CanvasText` | Text color of the dialog. |
| `--surface-drawer-border` | `none` | Border of the dialog. |
| `--surface-drawer-radius` | `0` | Border radius of the dialog. |
| `--surface-drawer-shadow` | `0 0 2rem rgb(0 0 0 / 0.2)` | Shadow of the dialog. |
| `--surface-drawer-backdrop` | `rgb(0 0 0 / 0.5)` | Backdrop background. |
| `--surface-drawer-backdrop-filter` | `none` | Backdrop filter. |
| `--surface-drawer-duration` | `0.3s` | Enter and exit transition duration. |
| `--surface-drawer-easing` | `cubic-bezier(0.38, 0.005, 0.215, 1)` | Enter and exit easing. |

### `drawerStyles`

Drawer styles for the `<dialog>` directly inside `<surface-drawer>`. Light
DOM, wrapped in the `surface-elements` cascade layer so any unlayered
consumer rule wins. The selectors match before the web component is defined,
so the styles also work without its JavaScript.

`edge` on the tag takes the edge the drawer is attached to:
`end` (default, also missing or empty), `start`, `top` or `bottom`.

```ts
import { drawerStyles } from "surface-elements"
```

### `adoptDrawerStyles()`

Adds drawerStyles to the document once.

```ts
import { adoptDrawerStyles } from "surface-elements"

function adoptDrawerStyles(root?: Document): void
```
