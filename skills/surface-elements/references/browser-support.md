# Browser support

What is native, what the library fills in, and what you load yourself.

The target is [Baseline](https://web.dev/baseline) newly available. Newer features are used behind feature detection, with a small fallback where the library depends on them. No polyfills ship in the bundle.

## Who covers what

| Feature                               | Native                                              | Fallback                                                         |
| ------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| `closedby="any"`                      | Light dismiss                                       | `lightDismiss()`, inside `enhanceDialog()` and `<surface-drawer>` |
| Exit transitions out of the top layer | `overlay` and `transition-behavior: allow-discrete` | `routeCloseRequests()` and `closeAnimated()` via `data-closing`  |
| Entry transitions                     | `@starting-style`                                   | None. The drawer appears without sliding in.                     |
| Invoker commands (`commandfor`)       | Opens and closes from HTML                          | **Not included.** Load a polyfill (below).                       |
| `<details>` open/close animation      | `::details-content` and `interpolate-size`          | `<surface-accordion>` animates with Web Animations               |
| `:state()`                            | `surface-drawer:state(open)`                         | None. Style `dialog[open]` instead.                              |
| `:modal`                              | Modal detection                                     | Treats any open dialog as modal.                                 |

## Invoker commands polyfill

Load [`invokers-polyfill`](https://github.com/keithamus/invokers-polyfill) only where it is missing:

```js
if (!("commandForElement" in HTMLButtonElement.prototype)) {
  import("invokers-polyfill")
}
```

> **Note:** Without invoker commands or the polyfill, `commandfor` buttons do nothing. Open the dialog from JavaScript instead: `showModal(dialog)` or the element's `show()`.

Deliberate deviations from platform guidance are recorded as [ADRs](https://github.com/anuarhdz/surface-elements/tree/main/docs/adr).
