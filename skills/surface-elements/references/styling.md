# Styling

Custom properties, cascade layers and state hooks for theming the drawer.

## Cascade layer

Every rule ships inside `@layer surface-elements`. Any rule you write outside a layer wins, whatever its specificity, so you never need `!important`.

```css
/* Beats the library's padding, no specificity games. */
surface-drawer > dialog {
  padding: 2rem;
}
```

If you use layers yourself, declare the order once:

```css
@layer reset, surface-elements, components;
```

## Custom properties

Set them on the dialog, on `<surface-drawer>` or on any ancestor.

See the `<surface-drawer>` tables under "API reference (generated from source)" in [drawer.md](drawer.md).

```html
<surface-drawer edge="bottom">
  <dialog
    style="
      --surface-drawer-radius: 1rem 1rem 0 0;
      --surface-drawer-padding: 1.5rem;
      --surface-drawer-backdrop: rgb(0 0 0 / 0.25);
      --surface-drawer-backdrop-filter: blur(4px);
      --surface-drawer-duration: 0.5s;
      --surface-drawer-max-size: 60vh;
    "
  ></dialog>
</surface-drawer>
```

## State hooks

| Selector                                 | Matches                                      |
| ---------------------------------------- | -------------------------------------------- |
| `surface-drawer > dialog[open]`          | An open drawer.                              |
| `surface-drawer > dialog[data-closing]`  | A drawer playing a fallback exit animation.  |
| `surface-drawer:state(open)`             | The web component while its dialog is open.  |

```css
/* Dim the trigger area while the cart is open. */
body:has(surface-drawer:state(open)) .toolbar {
  opacity: 0.5;
}
```

## Motion

The drawer slides in from its edge. Under `prefers-reduced-motion: reduce` it fades instead, and the duration drops to `0.15s`.
