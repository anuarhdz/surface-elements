# Carousel

The surface-carousel web component, a native scroll-snap carousel or slider with buttons, markers, an infinite loop and autoplay.

## Install and use

```js
import "surface-elements/carousel"
```

```html
<surface-carousel aria-label="Featured">
  <div data-surface-carousel="track">
    <article id="slide-1">…</article>
    <article id="slide-2">…</article>
    <article id="slide-3">…</article>
  </div>
  <button type="button" data-surface-carousel="prev" aria-label="Previous slide">‹</button>
  <button type="button" data-surface-carousel="next" aria-label="Next slide">›</button>
  <nav data-surface-carousel="markers" aria-label="Slides">
    <a href="#slide-1" aria-label="Slide 1"></a>
    <a href="#slide-2" aria-label="Slide 2"></a>
    <a href="#slide-3" aria-label="Slide 3"></a>
  </nav>
</surface-carousel>
```

The track is a native scroll-snap container and its children are the slides. The browser does the hard part: swiping, trackpad and wheel scrolling, momentum, snapping, find in page and focus scrolling all work as with any scroller, before and without the script. The web component wires the buttons and markers you write, keeps them in sync with the scroll, and adds the `loop` and `autoplay` that CSS cannot do. It adds its styles to the document, so you do not import the CSS.

Mark the parts with `data-surface-carousel`. Only `track` is required, and the parts can sit anywhere inside the element, so lay them out as you like.

### Slider: several slides in view

A slider is the same element with more than one slide in view. Set how many, the gap and where they snap:

```css
.products {
  --surface-carousel-per-view: 3;
  --surface-carousel-gap: 0.5rem;
}

@media (width < 40rem) {
  .products {
    --surface-carousel-per-view: 1.2; /* a peek of the next one */
  }
}

.gallery {
  --surface-carousel-per-view: 1.4;
  --surface-carousel-align: center;
}
```

Prev and next move one slide at a time. Without `loop`, they get `aria-disabled="true"` when the track cannot scroll further that way, which with several slides in view is before the last slide becomes current.

### Infinite loop

Add `loop` and the carousel wraps around: next on the last slide goes on to the first, in the same direction, and so do swipes and the arrow keys.

```html
<surface-carousel aria-label="Featured" loop>…</surface-carousel>
```

The web component adds copies of the first slides after the last one and of the last slides before the first one, enough to fill the view. When a scroll comes to rest on a copy, it swaps it for the slide it copies by moving the scroll position, which looks the same. The copies are `inert`, `aria-hidden`, have no `id` or `name`, their form controls are disabled and their media do not autoplay, so screen readers, the tab order, find in page, forms and anchors only ever see the real slides. They carry `data-surface-carousel-clone` with the index of the slide they copy.

Copies are taken when the slides change and when the view grows. Content that changes inside a slide afterwards (a playing video, a counter) is not mirrored in its copies, and an `<iframe>` in a slide loads once per copy.

### Autoplay

```html
<surface-carousel aria-label="News" autoplay interval="6000" loop>
  …
  <button type="button" data-surface-carousel="play">Rotate slides</button>
</surface-carousel>
```

`autoplay` advances every `interval` milliseconds (5000 by default, at least 1000). Without `loop` it goes back to the first slide after the last. It follows the WAI-ARIA carousel pattern and WCAG 2.2.2:

- It does not start when the reader prefers reduced motion. The play button still starts it.
- It pauses while the mouse is over the carousel, while it is off screen and while the tab is hidden.
- It stops for good when focus moves inside (except to the play button), when the reader drags or scrolls the track, presses an arrow key, Home or End on it, or uses prev, next or a marker. Only the play button, or `play()`, starts it again.

Always include the play button: it is how the reader stops it. It gets `aria-pressed="true"` while autoplay is on, so give it a fixed label ("Rotate slides") and style the pressed state, or swap an icon with `surface-carousel:state(playing)`.

### Markers

`markers` holds one link or button per slide, in order. Anchor markers (`<a href="#slide-id">`) point at their slide's `id`, so they work before and without the script: the browser scrolls the track to the slide, and where `scroll-target-group` is supported (Chromium) the marker whose slide is in view matches `:target-current`. With the script, a marker click scrolls only the track, without changing the URL or scrolling the page, and the current marker gets `aria-current="true"`:

```css
[data-surface-carousel="markers"] > [aria-current="true"],
surface-carousel:not(:defined) [data-surface-carousel="markers"] > :target-current {
  background: currentColor;
}
```

Keep `:target-current` in its own rule or inside `:is()`: browsers that do not know it drop the whole selector list.

### Style the current slide

The slide in view carries `data-current` (a copy can carry it while it is in view). Where scroll-state queries exist, the slides are also `scroll-state` containers, so their content can react while the reader is still swiping:

```css
[data-surface-carousel="track"] > [data-current] .caption {
  opacity: 1;
}

@container scroll-state(snapped: x) {
  .caption {
    opacity: 1;
  }
}
```

If your slides set their own `container-type`, add `scroll-state` to it to keep the query.

### Keyboard

The track is focusable (the web component adds `tabindex="0"` if you did not). On it, Left and Right move one slide (mirrored right to left), and Home and End go to the first and last slide. Focusable content inside a slide keeps its own keys.

### From JavaScript

```js
const carousel = document.querySelector("surface-carousel")

await carousel.next()
await carousel.goTo(2, { behavior: "instant" })
carousel.pause()

carousel.addEventListener("surface-carousel-change", (event) => {
  console.log(event.detail.index, event.detail.slide)
})
```

`goTo()`, `next()` and `prev()` resolve when the scroll comes to rest. `surface-carousel-change` fires once per slide that settles in view, from buttons, markers, keys, autoplay or the reader's own scroll.

## Copy

The copy file is `copy/surface-carousel.js` in the repository: the whole web component in one ES module, with its styles and dependencies inlined. Load it with `<script type="module" src="/surface-carousel.js"></script>`.

## API

See the `<surface-carousel>` tables under "API reference (generated from source)" in [carousel.md](carousel.md).

| Attribute on a child                  | Where                       | Meaning                                                                   |
| ------------------------------------- | --------------------------- | ------------------------------------------------------------------------- |
| `data-surface-carousel="track"`       | The scroll container        | Required. Its children are the slides.                                    |
| `data-surface-carousel="prev"`/`next` | Buttons                     | Scroll one slide back or on. Hidden until the web component is defined.   |
| `data-surface-carousel="play"`        | A button                    | Starts and stops autoplay. Hidden until the web component is defined.     |
| `data-surface-carousel="markers"`     | A container                 | Its links and buttons are the markers, one per slide in order.            |
| `data-current`                        | Set on the slide in view    | Output, for styling.                                                      |
| `data-surface-carousel-clone`         | Set on the copies of `loop` | Output: the index of the slide it copies.                                 |

The element is a `region` with the role description "carousel"; label it with `aria-label`. Slides without a `role` become groups with the role description "slide" and the label "1 of 5". To use your own language, set `aria-roledescription` on the element and `aria-label` and `aria-roledescription` on the slides: the web component never overrides yours, and removes its own when it leaves the page.

The styles are in the `surface-elements` cascade layer, so your own rules win. For CSS-only use, import `surface-elements/carousel.css`: the track scrolls and snaps, anchor markers work, and the buttons stay hidden.

## If you implement it by hand

Minimal markup: a scroller with the slides as children, and links to the slides.

```html
<section class="carousel" aria-roledescription="carousel" aria-label="Featured">
  <div class="track" tabindex="0">
    <div id="slide-1" role="group" aria-roledescription="slide" aria-label="1 of 3">…</div>
    <div id="slide-2" role="group" aria-roledescription="slide" aria-label="2 of 3">…</div>
    <div id="slide-3" role="group" aria-roledescription="slide" aria-label="3 of 3">…</div>
  </div>
  <nav class="markers" aria-label="Slides">
    <a href="#slide-1">1</a> <a href="#slide-2">2</a> <a href="#slide-3">3</a>
  </nav>
</section>
```

Minimal CSS. Scroll snap does the paging; the slide size sets how many are in view.

```css
.track {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
}

.track > * {
  flex: 0 0 100%;
  scroll-snap-align: start;
}

.markers {
  scroll-target-group: auto;
}

.markers a:target-current {
  font-weight: bold;
}

@media (prefers-reduced-motion: no-preference) {
  .track {
    scroll-behavior: smooth;
  }
}
```

What the JavaScript adds, and what happens without it:

- **Prev and next.** Each finds the slide nearest its snap position, from the slide and track rectangles, scroll padding and margins and `scroll-snap-align`, and scrolls the track by the distance to the next one with `scrollBy()`. Physical distances work the same left to right and right to left. Quick clicks step on from where the scroll is headed, not from where it is. Without it, there are no buttons; the reader swipes, scrolls or uses the markers.
- **Current slide.** On every scroll frame it marks the nearest slide (`data-current`) and marker (`aria-current`), and disables prev and next at the edges. When the scroll ends (`scrollend`, or 150 ms without scroll events where that event is missing) it fires `surface-carousel-change`.
- **Markers.** A click scrolls only the track, without a hash change or a page scroll. Without it, anchors still scroll to their slide (and the page, if the carousel is not in view).
- **Loop.** Copies at both ends, as above, swapped for their slide once a scroll ends on them. A step past the last copy swaps first and goes on, so quick clicks never hit the end of the track.
- **Autoplay.** A timer that is re-armed after each step, cleared on hover, when off screen (`IntersectionObserver`) and in a hidden tab, and stopped on focus or reader input.

Accessibility checklist:

- Label the carousel (`aria-label`) and give it `role="region"` with `aria-roledescription="carousel"`; the slides `role="group"`, `aria-roledescription="slide"` and a label (WAI-ARIA carousel pattern).
- Make the track focusable so keyboard users can scroll it.
- Label icon-only buttons and markers, and keep disabled buttons focusable with `aria-disabled`.
- Give autoplay a visible way to stop, stop it on focus, pause it on hover, and respect `prefers-reduced-motion`.
- Keep copies out of the accessibility tree and the tab order (`inert`).
- Prefer `scroll-snap-type: mandatory` only for slides no taller or wider than the view; with longer slides use `proximity` so nothing becomes unreachable.

Browser support and fallbacks:

- Scroll snap, `scrollBy()` and `inert` are Baseline.
- `scrollend` is Baseline newly available; elsewhere the web component waits for scrolling to stop.
- `scroll-target-group` and `:target-current` (Chromium) only matter without the script; with it, `aria-current` is set everywhere.
- Scroll-state container queries are Chromium only; `data-current` works everywhere.
- The CSS carousel pseudo-elements (`::scroll-button()`, `::scroll-marker`) are not used: they are Chromium only and cannot loop.

> **Note:** The web component manages only its own parts. A carousel nested in a slide is another `<surface-carousel>` with its own track.

## API reference (generated from source)

### `PART_ATTRIBUTE`

Marks the parts of a carousel: `track`, `prev`, `next`, `play`, `markers`.

```ts
import { PART_ATTRIBUTE } from "surface-elements/carousel"

const PART_ATTRIBUTE: string
```

### `CLONE_ATTRIBUTE`

Set on the copies `loop` adds at both ends of the track, with the index of the slide they copy.

```ts
import { CLONE_ATTRIBUTE } from "surface-elements/carousel"

const CLONE_ATTRIBUTE: string
```

### `CURRENT_ATTRIBUTE`

Set on the slide (or copy) that is snapped in view.

```ts
import { CURRENT_ATTRIBUTE } from "surface-elements/carousel"

const CURRENT_ATTRIBUTE: string
```

### `<surface-carousel>` (`SurfaceCarousel`)

Web component for a carousel or slider built on a native scroll-snap
container. The browser does the scrolling, swiping, snapping and keyboard
scrolling; the web component wires the buttons and markers you write, and
adds an infinite `loop` and `autoplay` on top. Adds the carousel styles to
the document, so no CSS import is needed.

Mark the parts with `data-surface-carousel`: the scroll container is
`track` and its children are the slides; `prev`, `next` and `play` are
buttons; `markers` holds one link or button per slide. Anchor markers
(`<a href="#slide-id">`) also work without JavaScript.

The element is a `region` with the role description `carousel`, so give it
an `aria-label`. Slides without a role become groups described as `slide`
and labelled "1 of 5"; set `aria-label` and `aria-roledescription` on them
to use your own words.

```js
import "surface-elements/carousel"
```

#### Attributes

| Attribute | Type | Description |
| --- | --- | --- |
| `loop` | `boolean` | Wrap around at both ends. Copies of the first and last slides are added to the track, inert and hidden from assistive technology. |
| `autoplay` | `boolean` | Advance on its own every `interval`, unless the reader prefers reduced motion. Pauses while hovered, off screen or in a hidden tab, and stops for good when the reader focuses, drags or uses a control inside. |
| `interval` | `number` | Milliseconds between autoplay steps. Defaults to 5000, at least 1000. |

#### Properties

| Property | Type | Description |
| --- | --- | --- |
| `track` | `HTMLElement \| null`, read-only | The scroll container, marked `data-surface-carousel="track"`. |
| `slides` | `HTMLElement[]`, read-only | The slides: the children of the track, without the copies `loop` adds. |
| `index` | `number`, read-only | Index of the slide in view, in SurfaceCarousel.slides. |
| `playing` | `boolean`, read-only | Whether autoplay is on. |

#### Methods

| Method | Returns | Description |
| --- | --- | --- |
| `goTo(index, options?)` | `Promise<void>` | Scrolls `index` of SurfaceCarousel.slides into view. Out of range it wraps with `loop` and clamps without. Resolves when the scroll settles. |
| `next(options?)` | `Promise<void>` | Scrolls to the next slide. With `loop`, the last one leads to the first. |
| `prev(options?)` | `Promise<void>` | Scrolls to the previous slide. With `loop`, the first one leads to the last. |
| `play()` | `void` | Starts autoplay, as the play button does. |
| `pause()` | `void` | Stops autoplay until SurfaceCarousel.play or the play button. |

#### Events

| Event | Type | Description |
| --- | --- | --- |
| `surface-carousel-change` | `CustomEvent<CarouselChangeDetail>` | A different slide settled in view. Bubbles. |

#### Slots

| Slot | Description |
| --- | --- |
| (default) | The track, the buttons and the markers, anywhere inside. |

#### CSS states

| Selector | Description |
| --- | --- |
| `surface-carousel:state(playing)` | Autoplay is on. |

#### CSS custom properties

| Property | Default | Description |
| --- | --- | --- |
| `--surface-carousel-per-view` | `1` | Slides in view at once. |
| `--surface-carousel-gap` | `1rem` | Space between slides. |
| `--surface-carousel-align` | `start` | `scroll-snap-align` of the slides: `start`, `center` or `end`. |

### `supportsScrollEnd()`

Whether the browser fires `scrollend`; elsewhere a quiet period stands in.

```ts
import { supportsScrollEnd } from "surface-elements/carousel"

function supportsScrollEnd(): boolean
```

### `carouselStyles`

Carousel styles for `<surface-carousel>`. Light DOM, wrapped in the
`surface-elements` cascade layer so any unlayered consumer rule wins. The
selectors match before the web component is defined, so the track scrolls
and snaps without its JavaScript too.

Without the script, anchor markers (`<a href="#slide-id">`) still scroll to
their slide, and where `scroll-target-group` exists (Chromium) the one whose
slide is in view matches `:target-current`. Prev, next and play buttons need
the script, so they stay hidden until the web component is defined.

```ts
import { carouselStyles } from "surface-elements"
```

### `adoptCarouselStyles()`

Adds carouselStyles to the document once.

```ts
import { adoptCarouselStyles } from "surface-elements"

function adoptCarouselStyles(root?: Document): void
```
