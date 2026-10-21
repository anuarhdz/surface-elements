# Sticky header

A custom element for a page header that sticks to the top.

```js
import "surface-elements/header-sticky"
```

```html
<header-sticky>
  <strong>Store</strong>
  <button commandfor="cart" command="show-modal">Cart</button>
</header-sticky>
```

> **Early:** Today `<header-sticky>` only registers the element. It ships no styles and no behavior, so the sticking comes from your CSS. It reserves the name and gives you a stable hook while the behavior is built.

```css
header-sticky {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: Canvas;
}
```

## API

| Member                 | Value             |
| ---------------------- | ----------------- |
| `HeaderSticky.tagName` | `"header-sticky"` |

## API reference (generated from source)

### `<header-sticky>` (`HeaderSticky`)

A page header that sticks to the top. Early: it only registers the element
and ships no styles or behavior yet, so the sticking comes from your CSS.

```js
import "surface-elements/header-sticky"
```

#### Slots

| Slot | Description |
| --- | --- |
| (default) | The header content. |
