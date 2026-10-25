# Modal

The surface-modal web component, a native dialog centered over the page, with sizes and alert dialogs.

`<surface-modal>` turns the native `<dialog>` inside it into a centered modal. The dialog stays the source of truth: open state lives in `dialog.open`, and nothing mirrors it.

## Install and use

```js
import "surface-elements/modal"
```

```html
<button commandfor="settings" command="show-modal">Settings</button>

<surface-modal>
  <dialog id="settings" closedby="any" aria-labelledby="settings-title">
    <h2 id="settings-title">Settings</h2>
    <button commandfor="settings" command="close">Close</button>
  </dialog>
</surface-modal>
```

The import defines the web component, which adds the styles to the document, so there is no CSS to import. It enhances its direct child dialog, rebinds when you swap it, and cleans up when it leaves the page.

- `command="show-modal"` opens it as a modal, in the top layer, with focus moved inside.
- `closedby="any"` closes it on Esc and on a click on the backdrop.
- `<form method="dialog">` closes it and sets `returnValue` from the submit button.

### Sizes

`size` picks a preset width: `small` (`24rem`), `medium` (`32rem`, the default), `large` (`48rem`) or `full` (the whole viewport, with no border radius). For any other width, set `--surface-modal-size` and leave `size` out. The modal never gets closer than `--surface-modal-gutter` to the viewport edges.

With `size="full"` on a page that sets `viewport-fit=cover`, content can sit under a notch or home indicator. Add the safe-area insets to the padding yourself, for example `padding-block-end: max(1.5rem, env(safe-area-inset-bottom))`.

### Alert and confirm

An alert or a confirmation interrupts the user and needs an answer. It is the same web component with `role="alertdialog"` on the dialog:

```html
<surface-modal size="small">
  <dialog
    id="delete"
    role="alertdialog"
    aria-labelledby="delete-title"
    aria-describedby="delete-text"
  >
    <h2 id="delete-title">Delete this file?</h2>
    <p id="delete-text">This cannot be undone.</p>
    <form method="dialog">
      <button value="cancel" autofocus>Cancel</button>
      <button value="delete">Delete</button>
    </form>
  </dialog>
</surface-modal>
```

- Leave out `closedby="any"`: a stray click on the backdrop should not answer the question. Esc still closes it without setting `returnValue`.
- Put `autofocus` on the least destructive button.
- Read the answer from `dialog.returnValue` in its `close` event, then set it back to `""`. The browser never clears it, so without the reset, Esc after an earlier "Delete" reads as `"delete"` again.
- An alert has a single button.

```js
dialog.addEventListener("close", () => {
  if (dialog.returnValue === "delete") deleteFile()
  dialog.returnValue = ""
})
```

### Long content

The modal is as tall as its content, up to the viewport minus `--surface-modal-gutter`, and then its content scrolls inside. Keep a header or footer in view with `position: sticky` inside the dialog.

## Copy

The copy file is `copy/surface-modal.js` in the repository: the whole web component in one ES module, with its styles and dependencies inlined. Load it with `<script type="module" src="/surface-modal.js"></script>`.

## API

See the `<surface-modal>` tables under "API reference (generated from source)" in [modal.md](modal.md).

The web component is `display: contents`, so it adds no box to the layout. While a fallback exit animation plays, its dialog carries `data-closing`: select it with `surface-modal > dialog[data-closing]`.

## If you implement it by hand

### Markup

The same as above. Keep the `<surface-modal>` wrapper even without the JavaScript: the styles select `surface-modal > dialog`, and an undefined tag still renders its children.

### CSS

Load the stylesheet instead of the web component. No JavaScript from this library runs.

```css
@import "surface-elements/modal.css";
```

You get the layout, the sizes and the enter and exit transitions where the browser supports them natively. The rules live in `@layer surface-elements`, so any unlayered rule of yours wins.

### What the JavaScript adds

The web component calls [`enhanceDialog()`](dialog.md) on its dialog and adds the styles. Without it:

- The exit transition only plays where the browser animates out of the top layer. Elsewhere the modal closes without animating.
- `closedby="any"` only works where it is native. Elsewhere a backdrop click does nothing.
- Page scroll is not locked while the modal is open.
- `surface-modal:state(open)` never matches. Style `surface-modal > dialog[open]` instead.

To get the first two and the scroll lock without the web component, call `enhanceDialog(dialog)` yourself and keep the CSS import. Do not do both on the same dialog.

### Accessibility

- Label the dialog. Point `aria-labelledby` at its heading, or set `aria-label`. For an alert dialog, also point `aria-describedby` at the message.
- Give it a visible close button, or explicit answers for an alert dialog. Esc and the backdrop are not discoverable for everyone.
- Focus, the inert page behind and Esc come from the native modal dialog. The library does not trap focus: Tab can reach the browser's own interface, as the native dialog allows.
- Under `prefers-reduced-motion: reduce` the modal fades without scaling.

Why the dialog lives in light DOM: [ADR 0001](https://github.com/anuarhdz/surface-elements/blob/main/docs/adr/0001-light-dom-dialog-enhancement.md).

### Browser support

See [Browser support](browser-support.md) for what is native, what falls back and which polyfills you may load.

## API reference (generated from source)

### `<surface-modal>` (`SurfaceModal`)

Web component that turns its direct child `<dialog>` into a centered modal.
The dialog stays the source of truth: open state lives in `dialog.open`.
Adds the modal styles to the document, so no CSS import is needed. The
styles key on the tag, so the markup works with `modal.css` and no JS too.

```js
import "surface-elements/modal"
```

#### Attributes

| Attribute | Type | Description |
| --- | --- | --- |
| `no-scroll-lock` | `boolean` | Leave page scroll untouched while open. |
| `size` | `"small" \| "medium" \| "large" \| "full"` | Preset width: `24rem`, `32rem` (default), `48rem`, or the whole viewport. |

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
| `toggle()` | `void` | Calls `close()` when open, `show()` when closed or closing. |

#### Slots

| Slot | Description |
| --- | --- |
| (default) | The modal `<dialog>`, as the direct child. |

#### CSS states

| Selector | Description |
| --- | --- |
| `surface-modal:state(open)` | The child dialog is open. |

#### CSS custom properties

| Property | Default | Description |
| --- | --- | --- |
| `--surface-modal-size` | `32rem` | Inline size when `size` is not set. |
| `--surface-modal-gutter` | `1rem` | Minimum space between the modal and the viewport edges. Long content scrolls inside the modal. |
| `--surface-modal-padding` | `1.5rem` | Padding of the panel. |
| `--surface-modal-background` | `Canvas` | Background of the panel. |
| `--surface-modal-color` | `CanvasText` | Text color of the panel. |
| `--surface-modal-border` | `none` | Border of the panel. |
| `--surface-modal-radius` | `0.75rem` | Border radius of the panel. |
| `--surface-modal-shadow` | `0 1rem 3rem rgb(0 0 0 / 0.25)` | Shadow of the panel. |
| `--surface-modal-backdrop` | `rgb(0 0 0 / 0.5)` | Backdrop background. |
| `--surface-modal-backdrop-filter` | `none` | Backdrop filter. |
| `--surface-modal-duration` | `0.2s` | Enter and exit transition duration. |
| `--surface-modal-easing` | `cubic-bezier(0.2, 0, 0, 1)` | Enter and exit easing. |

### `modalStyles`

Modal styles for the `<dialog>` directly inside `<surface-modal>`. Light
DOM, wrapped in the `surface-elements` cascade layer so any unlayered
consumer rule wins. The selectors match before the web component is defined,
so the styles also work without its JavaScript.

`size` on the tag picks a preset width: `small`, `medium` (default, also
missing or empty), `large` or `full`. Long content scrolls inside.

```ts
import { modalStyles } from "surface-elements"
```

### `adoptModalStyles()`

Adds modalStyles to the document once.

```ts
import { adoptModalStyles } from "surface-elements"

function adoptModalStyles(root?: Document): void
```
