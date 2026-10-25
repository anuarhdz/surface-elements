# Accordion

The surface-accordion web component, native details that animate open and closed, one at a time or several.

## Install and use

```js
import "surface-elements/accordion"
```

```html
<surface-accordion>
  <details name="faq" open>
    <summary>Shipping</summary>
    <p>Orders ship within two business days.</p>
  </details>
  <details name="faq">
    <summary>Returns</summary>
    <p>Return anything within 30 days.</p>
  </details>
</surface-accordion>
```

Put native `<details>` elements directly inside `<surface-accordion>`. They stay the source of truth: open state lives in their `open` attribute, the `<summary>` is the button, and find in page, keyboard and screen readers work as with plain HTML. The web component only animates them, and adds its styles to the document, so you do not import the CSS.

### One open at a time, or several

Give the `<details>` the same `name` and opening one closes the others. That is native HTML: it works before the script loads and without it. Leave `name` out to let several stay open.

```html
<surface-accordion>
  <details><summary>Ingredients</summary>…</details>
  <details><summary>Nutrition</summary>…</details>
</surface-accordion>
```

### Open and close from JavaScript

`toggle(item, force?)` animates like a click. Without `force` it flips the item; with it, it opens (`true`) or closes (`false`). It resolves when the animation ends.

```js
const accordion = document.querySelector("surface-accordion")

for (const item of accordion.items) accordion.toggle(item, true)
```

Setting `item.open` directly still works; it just skips the fallback animation.

### Timing

```css
surface-accordion {
  --surface-accordion-duration: 0.4s;
  --surface-accordion-easing: cubic-bezier(0.2, 0.9, 0.3, 1);
}
```

Under `prefers-reduced-motion: reduce` the items open and close at once.

### Style the open state

Where the fallback runs, a closing item keeps `open` until the animation ends and carries `data-closing` meanwhile. Match both, so a marker turns as soon as the reader clicks:

```css
details[open]:not([data-closing]) > summary::after {
  rotate: 45deg;
}
```

## Copy

The copy file is `copy/surface-accordion.js` in the repository: the whole web component in one ES module, with its styles and dependencies inlined. Load it with `<script type="module" src="/surface-accordion.js"></script>`.

## API

See the `<surface-accordion>` tables under "API reference (generated from source)" in [accordion.md](accordion.md).

The fallback sets `data-closing` on a `<details>` while it animates closed.

The styles are in the `surface-elements` cascade layer, so your own rules win. For CSS-only use, import `surface-elements/accordion.css`: Chromium animates, other browsers open and close at once.

## If you implement it by hand

Minimal markup: native `<details>`, with a shared `name` for an exclusive group.

```html
<div class="accordion">
  <details name="faq"><summary>Shipping</summary><p>…</p></details>
  <details name="faq"><summary>Returns</summary><p>…</p></details>
</div>
```

Minimal CSS. Where supported, `::details-content` and `interpolate-size` animate to the content's `auto` height, and `content-visibility` with `allow-discrete` keeps the content visible while it closes:

```css
@supports (interpolate-size: allow-keywords) and selector(::details-content) {
  .accordion details {
    interpolate-size: allow-keywords;
  }

  .accordion details::details-content {
    block-size: 0;
    opacity: 0;
    overflow-y: clip;
    transition: block-size 0.3s, opacity 0.3s, content-visibility 0.3s allow-discrete;
  }

  .accordion details[open]::details-content {
    block-size: auto;
    opacity: 1;
  }
}
```

What the JavaScript adds, and what happens without it:

- **Animation where CSS cannot.** Where the CSS above is not supported, a click on a `<summary>` is intercepted (`preventDefault`). Opening sets `open`, then animates the `<details>` height from its closed size to its full size with `element.animate()` and fades the content in. Closing animates down to the summary's height and removes `open` at the end. Without it, the items open and close at once, which is still correct.
- **Exclusive groups during the animation.** Setting `open` on one item of a `name` group closes the others immediately, before they could animate. So the closing sibling loses its `name` while it animates and gets it back when done.
- **Interruptions.** A click while an item animates starts the new animation from its current height.
- Clicks on links and controls inside the `<summary>` are left alone, and nested accordions handle their own items.

Accessibility checklist:

- Keep the `<summary>` as the first child of each `<details>`: it is the button, with its expanded state, Enter and Space built in.
- Put a heading inside the `<summary>` if the panels are page sections (`<summary><h3>Shipping</h3></summary>`).
- Respect `prefers-reduced-motion`.
- Keep `open` on the item until it has visibly closed, so what is read and what is seen agree.

Browser support and fallbacks:

- `<details>` and exclusive `name` groups are Baseline.
- `::details-content` is Baseline newly available; `interpolate-size` is Chromium only. The web component's Web Animations fallback covers Safari and Firefox.

> **Note:** The web component manages only its direct child `<details>`. Nest a second `<surface-accordion>` inside a panel for a nested accordion.

## API reference (generated from source)

### `CLOSING_ATTRIBUTE`

Set on a `<details>` while it animates closed, before `open` goes away.

```ts
import { CLOSING_ATTRIBUTE } from "surface-elements/accordion"

const CLOSING_ATTRIBUTE: string
```

### `<surface-accordion>` (`SurfaceAccordion`)

Web component that animates the native `<details>` elements directly
inside it as they open and close. The `<details>` stay the source of
truth: open state lives in `open`, and a shared `name` makes them
exclusive (one open at a time), as in plain HTML. Adds the accordion styles
to the document, so no CSS import is needed.

Where the browser can animate `::details-content` to `auto` (Chromium), the
styles do all the work. Elsewhere the web component animates the height and
the content's opacity with the Web Animations API, and keeps the closing
`<details>` open, marked with `data-closing`, until the animation ends.

```js
import "surface-elements/accordion"
```

#### Properties

| Property | Type | Description |
| --- | --- | --- |
| `items` | `HTMLDetailsElement[]`, read-only | The direct child `<details>` elements. |

#### Methods

| Method | Returns | Description |
| --- | --- | --- |
| `toggle(item, force?)` | `Promise<void>` | Opens or closes `item`, one of SurfaceAccordion.items, with the animation. Without `force` it flips the current state. Resolves when the animation ends or another toggle of the same item replaces it. |

#### Slots

| Slot | Description |
| --- | --- |
| (default) | The `<details>` elements, as direct children. |

#### CSS custom properties

| Property | Default | Description |
| --- | --- | --- |
| `--surface-accordion-duration` | `0.3s` | Open and close duration. |
| `--surface-accordion-easing` | `ease` | Open and close easing. |

### `supportsDetailsAnimation()`

Whether the styles alone animate `<details>` (Chromium).

```ts
import { supportsDetailsAnimation } from "surface-elements/accordion"

function supportsDetailsAnimation(): boolean
```

### `accordionStyles`

Accordion styles for the `<details>` directly inside `<surface-accordion>`.
Light DOM, wrapped in the `surface-elements` cascade layer so any unlayered
consumer rule wins. The selectors match before the web component is defined,
so the styles also work without its JavaScript.

Where `::details-content` and `interpolate-size` exist (Chromium), the
open and close animation is pure CSS. Elsewhere the panels toggle at once,
and the web component animates them with the Web Animations API.

```ts
import { accordionStyles } from "surface-elements"
```

### `adoptAccordionStyles()`

Adds accordionStyles to the document once.

```ts
import { adoptAccordionStyles } from "surface-elements"

function adoptAccordionStyles(root?: Document): void
```
