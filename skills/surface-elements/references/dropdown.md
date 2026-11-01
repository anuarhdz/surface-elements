# Dropdown

The surface-dropdown web component, a native popover tethered to its button, for navigation links and nested flyouts.

## Install and use

```js
import "surface-elements/dropdown"
```

```html
<surface-dropdown>
  <button popovertarget="products">Products</button>
  <ul id="products" popover="auto">
    <li><a href="/editor">Editor</a></li>
    <li><a href="/analytics">Analytics</a></li>
  </ul>
</surface-dropdown>
```

Put a `<button popovertarget>` and, right after it, its `[popover]` directly inside `<surface-dropdown>`. The popover stays the source of truth: the browser opens and closes it from the button, closes it on Esc and on a click outside, and keeps one open at a time. The web component places it, adds the rest of the behavior below, and adds its styles to the document, so you do not import the CSS.

The `<nav>` around your dropdowns is yours to write: the tag wraps one dropdown.

### Dropdown or menu

They can look alike, and the content does not decide: both can hold links. The difference is the keyboard. A reader moves through a dropdown with Tab, with no special roles. A menu has one tab stop, `role="menu"` and arrow keys. Do not add `role="menu"` or `aria-haspopup` here: they promise a keyboard contract this component does not implement.

### Nested dropdowns

Nest the whole tag, not only the popover. A nested dropdown opens as a flyout beside the panel around it, level with its button, and flips at the viewport edges.

```html
<surface-dropdown>
  <button popovertarget="products">Products</button>
  <ul id="products" popover="auto">
    <li><a href="/editor">Editor</a></li>
    <li>
      <surface-dropdown>
        <button popovertarget="more">More</button>
        <ul id="more" popover="auto">
          <li><a href="/api">API</a></li>
        </ul>
      </surface-dropdown>
    </li>
  </ul>
</surface-dropdown>
```

Keep to one nested level. Each level adds Tab stops and another panel to keep track of, so anything deeper is better served by a menu with arrow keys.

The keyboard moves through the levels like this:

- **Esc** closes one level and returns focus to that level's button.
- **Tab** follows the document order. Past the end of a nested panel, focus moves to what comes after its button, and only that panel closes. If its button is the last thing in the panel around it too, focus leaves both and both close.

### Open on hover

Add `hover` to also open and close with the mouse. Tap, click and keyboard keep working.

```html
<surface-dropdown hover>…</surface-dropdown>
```

The attribute only takes effect with a mouse, on a device that matches `(hover: hover) and (pointer: fine)`. On a phone it does nothing, and a touch on a touch-screen laptop counts as a tap. It is set per dropdown, so a nested one can differ from its parent. The panel stays open while keyboard focus is inside it.

### Small screens

The behavior is the same on every viewport: there is no accordion mode and no breakpoint. On a phone, two panels side by side rarely fit, so a flyout ends up below its button, over the panel. For a mobile navigation, compose another pattern and choose with your own CSS, for example a [drawer](drawer.md) with an [accordion](accordion.md) inside.

```css
@media (width < 48rem) {
  .desktop-nav {
    display: none;
  }
}

@media (width >= 48rem) {
  .mobile-nav {
    display: none;
  }
}
```

### Open and close from JavaScript

```js
const dropdown = document.querySelector("surface-dropdown")

dropdown.show()
dropdown.close()
dropdown.toggle()
dropdown.toggle(true) // only opens
```

### Position

It opens below the button. Change the side with `position-area` on the panel, and the fallbacks with `position-try-fallbacks`:

```css
surface-dropdown > [popover] {
  position-area: block-end span-inline-start;
}
```

The JavaScript fallback for browsers without anchor positioning does not read these properties.

### Style it

```css
surface-dropdown {
  --surface-dropdown-offset: 0.5rem;
  --surface-dropdown-background: #111;
  --surface-dropdown-color: #fff;
  --surface-dropdown-radius: 0;
}

surface-dropdown:state(open) > button {
  text-decoration: underline;
}
```

Without the script, `:state(open)` does not exist. `button:has(+ :popover-open)` works in both cases.

The panel fades and scales from the corner next to its button, more slowly on the way in than on the way out:

```css
surface-dropdown {
  --surface-dropdown-open-duration: 0.25s;
  --surface-dropdown-close-duration: 0.15s;
  --surface-dropdown-scale: 0.9;
}
```

With `prefers-reduced-motion`, it appears and disappears at once.

## Copy

The copy file is `copy/surface-dropdown.js` in the repository: the whole web component in one ES module, with its styles and dependencies inlined. Load it with `<script type="module" src="/surface-dropdown.js"></script>`.

## API

See the `<surface-dropdown>` tables under "API reference (generated from source)" in [dropdown.md](dropdown.md).

The browser fires `beforetoggle` and `toggle` on the panel. They do not bubble.

The styles are in the `surface-elements` cascade layer, so your own rules win. For CSS-only use, import `surface-elements/dropdown.css`.

## If you implement it by hand

Minimal markup: a button and the popover right after it. Placing it right after keeps browsers from adding an implicit `aria-details`, and keeps the tab order natural.

```html
<button popovertarget="products">Products</button>
<ul id="products" popover="auto">
  <li><a href="/editor">Editor</a></li>
</ul>
```

Minimal CSS. A `popovertarget` button is its popover's implicit anchor, so `position-area` needs no names. Logical keywords keep it right in right-to-left text.

```css
@supports (anchor-name: --a) {
  [popover] {
    inset: auto;
    margin: 0.25rem 0 0;
    position-area: block-end span-inline-end;
    position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline;
  }

  /* A flyout clears the panel around it, so that panel needs a name. */
  #products {
    anchor-name: --products;
  }

  [popover] [popover] {
    margin: 0 0 0 0.25rem;
    position-area: none;
    inset-block-start: anchor(start);
    inset-inline-start: anchor(--products end);
    position-try-fallbacks: flip-inline, flip-block, flip-block flip-inline;
  }
}
```

The browser already gives you, with no JavaScript: opening and closing from the button, Esc, a click outside, one open at a time, nested popovers that keep their parent open, the top layer (so no ancestor's `overflow` clips the panel), and the button's expanded state.

What the JavaScript adds, and what happens without it:

- **Explicit anchors.** `show()` and hover open the panel without its button, which drops the implicit anchor. Before each opening the button gets a unique `anchor-name`, and the panel the matching `position-anchor`. A flyout's outer panel gets a name too, so the flyout can clear it. Without the script, a flyout sits beside its button, over the panel.
- **Position without anchor positioning.** The panel is placed with `top` and `left` from the button's rectangle, flipping at the edges, and follows it on scroll and resize. Without it, the panel appears centered in the viewport.
- **Transform origin.** The panel should grow out of its button, and that corner changes when the browser flips it. An anchored container query can tell which fallback is active, but it only styles the panel's descendants, not the panel. So the origin comes from comparing both rectangles. Without it, the panel scales from the top corner at the start of the line.
- **Focus in nested panels.** The browser only restores focus for the first popover of a stack, so closing a nested one with focus inside would drop it to the body. The button takes it just before the panel closes.
- **Closing when Tab leaves.** A popover has no focus trap, so Tab could leave one open behind the reader. A `focusout` to somewhere outside the tag closes it.
- **Closing on a link.** A full page load closes the panel anyway, but a router or a `#` link would not. A click on a link closes the whole chain, unless it opens a new tab or window.
- **Hover.** A short delay before opening, and a longer one before closing to cross the gap. It needs `pointerType === "mouse"` as well as the media query, because a touch on a touch-screen laptop sends `pointerenter` and then `click`, which would open and at once close the panel.

Accessibility checklist:

- Use a real `<button>` as the trigger. It is the one that gets the expanded state.
- Use real `<a href>` for links, so they open in a new tab and copy as URLs.
- No `role="menu"`, `role="menuitem"` or `aria-haspopup`. Readers move with Tab.
- Name each `<nav>` with `aria-label` when a page has more than one.
- Never make hover the only way in.
- Respect `prefers-reduced-motion`.

Browser support and fallbacks:

- `popover` is Baseline newly available. No polyfill ships; where it is missing, the panel never opens unless you load [`@oddbird/popover-polyfill`](https://github.com/oddbird/popover-polyfill).
- Anchor positioning is not fully Baseline yet. It is feature-detected, and the web component places the panel where it is missing.
- `@starting-style` and `overlay` only animate the fade and the scale. Without them the panel appears and disappears at once.

> **Note:** The web component manages only its direct child button and panel. Each nested `<surface-dropdown>` manages its own.

## API reference (generated from source)

### `<surface-dropdown>` (`SurfaceDropdown`)

Web component that turns a button and the native popover after it into a
dropdown of links or other content. The popover stays the source of truth:
the browser opens and closes it from the button, closes it on Esc and on a
click outside, and keeps one open at a time. Adds the dropdown styles to the
document, so no CSS import is needed. The styles key on the tag, so the
markup works with `dropdown.css` and no JS too.

The behavior is the same on every viewport. Nest a `<surface-dropdown>` in a
panel for a flyout, one level deep at most. This is a disclosure, reached
with Tab: for arrow keys and a single tab stop, use a menu.

```js
import "surface-elements/dropdown"
```

#### Attributes

| Attribute | Type | Description |
| --- | --- | --- |
| `hover` | `boolean` | Also open and close on mouse hover, where the device can hover. Tap, click and keyboard keep working. |

#### Properties

| Property | Type | Description |
| --- | --- | --- |
| `trigger` | `HTMLElement \| null`, read-only | The direct child button that opens the panel, if any. |
| `panel` | `HTMLElement \| null`, read-only | The direct child `[popover]`, if any. |
| `open` | `boolean`, read-only | Whether the panel is open. |

#### Methods

| Method | Returns | Description |
| --- | --- | --- |
| `show()` | `void` | Opens the panel. |
| `close()` | `void` | Closes the panel, and any dropdown open inside it. |
| `toggle(force?)` | `void` | Flips the panel, or with `force` opens (`true`) or closes (`false`) it. |

#### Slots

| Slot | Description |
| --- | --- |
| (default) | The `<button popovertarget>` and, right after it, its `[popover]`, as direct children. |

#### CSS states

| Selector | Description |
| --- | --- |
| `surface-dropdown:state(open)` | The panel is open. |

#### CSS custom properties

| Property | Default | Description |
| --- | --- | --- |
| `--surface-dropdown-offset` | `0.25rem` | Space between the button and the panel. |
| `--surface-dropdown-min-size` | `12rem` | Minimum inline size of the panel. |
| `--surface-dropdown-padding` | `0.5rem` | Padding of the panel. |
| `--surface-dropdown-background` | `Canvas` | Background of the panel. |
| `--surface-dropdown-color` | `CanvasText` | Text color of the panel. |
| `--surface-dropdown-border` | `1px solid color-mix(in srgb, CanvasText 15%, transparent)` | Border of the panel. |
| `--surface-dropdown-radius` | `0.5rem` | Border radius of the panel. |
| `--surface-dropdown-shadow` | `0 0.5rem 1.5rem rgb(0 0 0 / 0.15)` | Shadow of the panel. |
| `--surface-dropdown-open-duration` | `0.18s` | Enter transition duration. |
| `--surface-dropdown-close-duration` | `0.1s` | Exit transition duration. |
| `--surface-dropdown-scale` | `0.96` | Scale the panel grows from and shrinks to. |
| `--surface-dropdown-easing` | `ease-out` | Enter and exit easing. |

### `dropdownStyles`

Dropdown styles for the `[popover]` directly inside `<surface-dropdown>`.
Light DOM, wrapped in the `surface-elements` cascade layer so any unlayered
consumer rule wins. The selectors match before the web component is defined,
so the styles also work without its JavaScript.

Where anchor positioning exists, CSS places the panel next to its button and
flips it at the viewport edges. Elsewhere the web component places it, and
without either the panel stays where the browser puts a popover: centered.

```ts
import { dropdownStyles } from "surface-elements"
```

### `adoptDropdownStyles()`

Adds dropdownStyles to the document once.

```ts
import { adoptDropdownStyles } from "surface-elements"

function adoptDropdownStyles(root?: Document): void
```
