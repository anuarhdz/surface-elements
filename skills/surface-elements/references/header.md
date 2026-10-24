# Sticky header

A page header that sticks to the top, reports when it is stuck, and can hide while you scroll down.

## Install and use

```js
import "surface-elements/header"
```

```html
<surface-header>
  <header>
    <a href="/">Store</a>
    <button commandfor="cart" command="show-modal">Cart</button>
  </header>
</surface-header>
```

Wrap your page `<header>` in `<surface-header>`. The `<header>` stays native, so it keeps its `banner` landmark. The element sticks to the top of its scroll container and adds its styles to the document, so you do not import the CSS.

### Hide on scroll

Add `hide-on-scroll` to move the header out of view while the reader scrolls down. It comes back as soon as they scroll up, and whenever focus moves inside it, so keyboard users never tab into a hidden header.

```html
<surface-header hide-on-scroll>…</surface-header>
```

### Style the stuck state

`:state(stuck)` matches while the header is stuck. Style the header inside it, for example to add a shadow or make it smaller.

```css
surface-header:state(stuck) header {
  box-shadow: 0 0.25rem 1rem rgb(0 0 0 / 0.1);
}
```

If you change its size when stuck, set `overflow-anchor: none` on the element's parent. Without it, scroll anchoring compensates for the size change, pushes the header out of its stuck position, and it flickers.

### Keep anchors visible

The element publishes its height as `--surface-header-height` on its scroll container (`<html>` for the page). Use it so links to `#anchors` do not land under the header:

```css
html {
  scroll-padding-block-start: var(--surface-header-height, 0px);
}
```

## API

| Member   | Type                 | Does                                                        |
| -------- | -------------------- | ----------------------------------------------------------- |
| `stuck`  | `boolean`, read-only | Whether the header is stuck to the top of its container.    |

| Attribute        | Does                                                                         |
| ---------------- | ---------------------------------------------------------------------------- |
| `hide-on-scroll` | Hides while scrolling down; shows on scroll up or when focus moves inside.   |

| Selector                        | Matches                                         |
| ------------------------------- | ----------------------------------------------- |
| `surface-header:state(stuck)`   | The element while it is stuck.                  |
| `surface-header:state(hidden)`  | The element while `hide-on-scroll` has hidden it. |

| Property                    | Default    | Sets                                       |
| --------------------------- | ---------- | ------------------------------------------ |
| `--surface-header-offset`   | `0px`      | Distance from the top edge where it sticks. |
| `--surface-header-duration` | `0.2s`     | Hide and show transition duration.         |
| `--surface-header-easing`   | `ease-out` | Hide and show easing.                      |
| `--surface-header-height`   | (output)   | Set by the element on its scroll container. |

Set the offset with `--surface-header-offset`, not `top`: the hide transition needs it to move the header fully out of view.

The styles are in the `surface-elements` cascade layer, so your own rules win. For CSS-only use, import `surface-elements/header.css`.

## If you implement it by hand

Minimal markup: a sticky wrapper around a native `<header>`.

```html
<div class="site-header">
  <header>…</header>
</div>
```

Minimal CSS. The `scroll-state` container lets descendants style the stuck state with no JavaScript, where the browser supports it:

```css
.site-header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: Canvas;
  container: site-header / scroll-state;
}

@container site-header scroll-state(stuck: top) {
  header {
    box-shadow: 0 0.25rem 1rem rgb(0 0 0 / 0.1);
  }
}
```

What the JavaScript adds, and what happens without it:

- **Stuck state everywhere.** A `scroll` listener, throttled to one read per frame, compares the element's position with its sticky offset and sets `:state(stuck)`. Without it, only browsers with scroll-state queries (Chromium) get stuck styles; the header still sticks everywhere.
- **Hide on scroll.** The same listener compares each scroll position with the last one: down past the header's own height hides it (`translate` past the top edge), up shows it. `focusin` shows it. Without it, the header simply stays.
- **Height variable.** A `ResizeObserver` writes `--surface-header-height`. Without it, hard-code the height in `scroll-padding-block-start`.

Accessibility checklist:

- Keep a native `<header>` (top level, not inside `<main>` or `<article>`) so it is the `banner` landmark.
- Never leave focus on a hidden header: show it on `focusin`, and do not hide while it holds focus.
- Under `prefers-reduced-motion: reduce`, hide and show without sliding.
- Set `scroll-padding-block-start` so focused elements and anchor targets are not covered.

Browser support and fallbacks:

- `position: sticky` and custom states (`:state()`) are Baseline.
- Scroll-state container queries are Chromium only. The element's `:state(stuck)` covers the other browsers.

> **Note:** One page, one `<surface-header>`: the height variable is written by the last one connected.

## API reference (generated from source)

### `<surface-header>` (`SurfaceHeader`)

A page header that sticks to the top of its scroll container. Wrap your
`<header>` in it so the `banner` landmark stays native. Adds the header
styles to the document, so no CSS import is needed.

Publishes its height as `--surface-header-height` on the scroll container
(`<html>` for the page), for `scroll-padding-block-start`.

```js
import "surface-elements/header"
```

#### Attributes

| Attribute | Type | Description |
| --- | --- | --- |
| `hide-on-scroll` | `boolean` | Hide while scrolling down, show again on scroll up or when focus moves inside. |

#### Properties

| Property | Type | Description |
| --- | --- | --- |
| `stuck` | `boolean`, read-only | Whether the header is stuck to the top of its scroll container. |

#### Slots

| Slot | Description |
| --- | --- |
| (default) | The page `<header>`. |

#### CSS states

| Selector | Description |
| --- | --- |
| `surface-header:state(stuck)` | The header is stuck to the top of its scroll container. |
| `surface-header:state(hidden)` | `hide-on-scroll` has moved the header out of view. |

#### CSS custom properties

| Property | Default | Description |
| --- | --- | --- |
| `--surface-header-offset` | `0px` | Distance from the top edge where the header sticks. |
| `--surface-header-duration` | `0.2s` | Hide and show transition duration. |
| `--surface-header-easing` | `ease-out` | Hide and show easing. |

### `headerStyles`

Header styles for `surface-header`. Light DOM, wrapped in the
`surface-elements` cascade layer so any unlayered consumer rule wins.

Without the script the header still sticks, and its descendants can query
`@container surface-header scroll-state(stuck: top)` where supported.

```ts
import { headerStyles } from "surface-elements"
```

### `adoptHeaderStyles()`

Adds headerStyles to the document once.

```ts
import { adoptHeaderStyles } from "surface-elements"

function adoptHeaderStyles(root?: Document): void
```
