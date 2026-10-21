# Styling

Custom properties, cascade layers and state hooks for theming the drawer.

## Cascade layer

Every rule ships inside `@layer surface-elements`. Any rule you write outside a layer wins, whatever its specificity, so you never need `!important`.

```css
/* Beats the library's padding, no specificity games. */
dialog[data-drawer] {
  padding: 2rem;
}
```

If you use layers yourself, declare the order once:

```css
@layer reset, surface-elements, components;
```

## Custom properties

Set them on the dialog, or on any ancestor.

| Property                   | Default                                              |
| -------------------------- | ---------------------------------------------------- |
| `--drawer-size`            | `28rem` for `start`/`end`, `auto` for `top`/`bottom` |
| `--drawer-max-size`        | `calc(100% - 3rem)`                                  |
| `--drawer-padding`         | `1rem`                                               |
| `--drawer-background`      | `Canvas`                                             |
| `--drawer-color`           | `CanvasText`                                         |
| `--drawer-border`          | `none`                                               |
| `--drawer-radius`          | `0`                                                  |
| `--drawer-shadow`          | `0 0 2rem rgb(0 0 0 / 0.2)`                          |
| `--drawer-backdrop`        | `rgb(0 0 0 / 0.5)`                                   |
| `--drawer-backdrop-filter` | `none`                                               |
| `--drawer-duration`        | `0.3s`                                               |
| `--drawer-easing`          | `cubic-bezier(0.38, 0.005, 0.215, 1)`                |

```html
<dialog
  data-drawer="bottom"
  style="
    --drawer-radius: 1rem 1rem 0 0;
    --drawer-padding: 1.5rem;
    --drawer-backdrop: rgb(0 0 0 / 0.25);
    --drawer-backdrop-filter: blur(4px);
    --drawer-duration: 0.5s;
    --drawer-max-size: 60vh;
  "
></dialog>
```

## State hooks

| Selector                            | Matches                                      |
| ----------------------------------- | -------------------------------------------- |
| `dialog[data-drawer][open]`         | An open drawer.                              |
| `dialog[data-drawer][data-closing]` | A drawer playing a fallback exit animation.  |
| `dialog-drawer:state(open)`         | The custom element while its dialog is open. |

```css
/* Dim the trigger area while the cart is open. */
body:has(dialog-drawer:state(open)) .toolbar {
  opacity: 0.5;
}
```

## Motion

The drawer slides in from its edge. Under `prefers-reduced-motion: reduce` it fades instead, and the duration drops to `0.15s`.
