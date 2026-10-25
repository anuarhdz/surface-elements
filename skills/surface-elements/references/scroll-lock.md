# Scroll lock

A ref-counted lock that stops the page from scrolling.

```js
import { lockScroll, isScrollLocked } from "surface-elements/scroll-lock"

const release = lockScroll()
// …
release()
```

## `lockScroll()`

Sets `overflow: hidden` on `<html>` and returns a release function.

- **Ref-counted.** The page unlocks when every caller has released. Stacked drawers each hold their own lock.
- **One count per page.** The count lives on `Symbol.for("surface-elements.scroll-lock")`, so copy files and the package share it when they run on the same page.
- **Idempotent release.** Calling a release twice is harmless.
- **No layout shift.** With a classic scrollbar it sets `scrollbar-gutter: stable` so the page does not jump sideways.
- **Restores what it found.** Inline `overflow` and `scrollbar-gutter` values you had set come back on unlock.

```ts
function lockScroll(): () => void
```

## `isScrollLocked()`

Whether any lock is held.

```ts
function isScrollLocked(): boolean
```

## Why root overflow

Platform guidance prefers `overscroll-behavior: contain` on the dialog and its backdrop. Safari ignores it on containers that do not scroll, so the page behind still scrolls there. The library keeps the CSS containment and adds this lock on top. The trade-offs are in [ADR 0002](https://github.com/anuarhdz/surface-elements/blob/main/docs/adr/0002-scroll-lock-on-root-overflow.md).

## API reference (generated from source)

### `lockScroll()`

Blocks page scroll by setting `overflow: hidden` on `<html>`. `<body>` is left
alone: hiding its overflow too would make it a scroll container and unstick
every `position: sticky` element on a scrolled page.
Ref-counted: the page unlocks when every caller has released its lock,
across every copy of this module on the page.
Returns an idempotent release function.

```ts
import { lockScroll } from "surface-elements/scroll-lock"

function lockScroll(): () => void
```

### `isScrollLocked()`

Whether any caller currently holds a lockScroll lock.

```ts
import { isScrollLocked } from "surface-elements/scroll-lock"

function isScrollLocked(): boolean
```
