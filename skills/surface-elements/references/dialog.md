# Dialog functions

Enhance any native dialog with light-dismiss and exit-animation fallbacks and a scroll lock.

```js
import {
  enhanceDialog,
  lightDismiss,
  routeCloseRequests,
  lockScrollWhileOpen,
  closeAnimated,
  showModal,
  supportsClosedBy,
  supportsTopLayerExit,
} from "surface-elements/dialog"
```

These work on any `<dialog>`, not only drawers. They feature-detect: where the browser already does the job, they do nothing.

Every function that attaches listeners returns a cleanup. Call it when the dialog leaves the page.

## `enhanceDialog(dialog, options?)`

Applies `lightDismiss`, `routeCloseRequests` and, unless you opt out, `lockScrollWhileOpen`. Returns one cleanup for all of them.

```ts
function enhanceDialog(
  dialog: HTMLDialogElement,
  options?: { lockScroll?: boolean } // default: true
): () => void
```

## `lightDismiss(dialog, close?)`

Fallback for `closedby="any"` where the browser lacks it. Closes the dialog when a click both starts and ends on the backdrop, so selecting text inside and releasing outside does not close it.

It only acts while the dialog is modal and has `closedby="any"`. `close` defaults to `() => closeAnimated(dialog)`.

```ts
function lightDismiss(
  dialog: HTMLDialogElement,
  close?: () => unknown
): () => void
```

## `routeCloseRequests(dialog)`

Where exit transitions out of the top layer are not native, sends these through `closeAnimated` so they animate:

- Esc (`cancel`)
- `command="close"` from an invoker
- a submit from `<form method="dialog">` or a button with `formmethod="dialog"`; the button's `value` becomes `returnValue`

```ts
function routeCloseRequests(dialog: HTMLDialogElement): () => void
```

## `closeAnimated(dialog, returnValue?)`

Closes the dialog after its exit transition and resolves when it is closed.

Where the browser transitions `display` and `overlay` natively this is `dialog.close()`. Elsewhere it sets `data-closing`, waits for the dialog's animations (2 s at most) and then closes. If the dialog is reopened during the exit, it stays open.

```ts
function closeAnimated(
  dialog: HTMLDialogElement,
  returnValue?: string
): Promise<void>
```

## `showModal(dialog)`

Opens the dialog as a modal. Unlike `dialog.showModal()`, it cancels an exit animation in progress and does nothing if the dialog is already open.

```ts
function showModal(dialog: HTMLDialogElement): void
```

## `lockScrollWhileOpen(dialog)`

Holds a [scroll lock](scroll-lock.md) for as long as the dialog is open as a modal. A non-modal `dialog.show()` does not lock.

```ts
function lockScrollWhileOpen(dialog: HTMLDialogElement): () => void
```

## Feature detection

| Function                 | Returns `true` when                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `supportsClosedBy()`     | The browser supports `closedby` on dialogs.                                                      |
| `supportsTopLayerExit()` | The browser can transition a dialog out of the top layer (`overlay` and a `display` transition). |

> **Note:** `supportsTopLayerExit()` probes the computed style instead of trusting `CSS.supports()`, because Firefox parses `transition-behavior: allow-discrete` without transitioning `display`. The result is cached.

## API reference (generated from source)

### `CLOSING_ATTRIBUTE`

Attribute set while an exit transition plays in browsers without `overlay`.

```ts
import { CLOSING_ATTRIBUTE } from "surface-elements/dialog"

const CLOSING_ATTRIBUTE: string
```

### `enhanceDialog()`

Applies every dialog enhancement this library provides: light-dismiss
fallback, animated close requests and scroll lock. Returns a cleanup.

```ts
import { enhanceDialog } from "surface-elements/dialog"

function enhanceDialog(dialog: HTMLDialogElement, options?: EnhanceDialogOptions): Cleanup
```

### `lightDismiss()`

Fallback for `closedby="any"` where the browser lacks it: closes the
dialog when a click starts and ends on the backdrop. No-op where native.

```ts
import { lightDismiss } from "surface-elements/dialog"

function lightDismiss(dialog: HTMLDialogElement, close?: () => void): Cleanup
```

### `routeCloseRequests()`

Where exit transitions out of the top layer are unsupported, routes Esc,
light dismiss, `command="close"` and `<form method="dialog">` through
closeAnimated so they animate too. No-op where native.

```ts
import { routeCloseRequests } from "surface-elements/dialog"

function routeCloseRequests(dialog: HTMLDialogElement): Cleanup
```

### `closeAnimated()`

Closes the dialog after its exit transition. In browsers that transition
`display` and `overlay` natively this is a plain `close()`; elsewhere it
sets `data-closing`, waits for the animations and then closes.

```ts
import { closeAnimated } from "surface-elements/dialog"

function closeAnimated(dialog: HTMLDialogElement, returnValue?: string): Promise<void>
```

### `showModal()`

Opens the dialog as a modal, cancelling an exit transition in progress.

```ts
import { showModal } from "surface-elements/dialog"

function showModal(dialog: HTMLDialogElement): void
```

### `lockScrollWhileOpen()`

Holds a lockScroll lock for as long as the dialog is modal.

```ts
import { lockScrollWhileOpen } from "surface-elements/dialog"

function lockScrollWhileOpen(dialog: HTMLDialogElement): Cleanup
```

### `supportsClosedBy()`

Whether the browser supports `closedby` on dialogs.

```ts
import { supportsClosedBy } from "surface-elements/dialog"

function supportsClosedBy(): boolean
```

### `supportsTopLayerExit()`

Whether exit transitions out of the top layer work without help.

```ts
import { supportsTopLayerExit } from "surface-elements/dialog"

function supportsTopLayerExit(): boolean
```
