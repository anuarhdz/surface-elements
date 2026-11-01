# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Conventional Commits](https://www.conventionalcommits.org/).

## [0.3.0] - 2026-11-01

### Added

- `surface-dropdown`: dropdown on a native `popover`, tethered to its button with CSS anchor positioning and placed from JavaScript where that is missing. The browser keeps opening and closing it; the web component also closes it when Tab leaves or a link is followed, and returns focus from nested panels.
- `surface-dropdown` nesting: a nested dropdown opens as a flyout beside the panel around it and flips at the viewport edges.
- `surface-dropdown` `hover`: also opens and closes with a mouse, where the device can hover. Tap, click and keyboard keep working.
- `surface-dropdown` methods `show()`, `close()` and `toggle()`, the `open` custom state, and custom properties for offset, size, colors and motion. The panel scales from the corner next to its button, and appears at once with `prefers-reduced-motion`.
- `SurfaceDropdown`, `dropdownStyles` and `adoptDropdownStyles()` from the root entry; `surface-elements/dropdown` and `surface-elements/dropdown.css` entry points.

## [0.2.0] - 2026-10-31

### Added

- `surface-carousel`: carousel and slider on a native scroll-snap track, with author-written prev, next, play and marker controls. Slides per view, gap and alignment are CSS custom properties.
- `surface-carousel` `loop`: infinite wrap with inert, `aria-hidden` copies at both ends.
- `surface-carousel` `autoplay` and `interval`: follows the WAI-ARIA carousel pattern and WCAG 2.2.2; pauses on hover, off screen and in hidden tabs, and stops on focus or reader input.
- `surface-carousel` `drag`: mouse drag with flick or nearest-slide settling; touch and pen keep native scrolling.
- `surface-carousel` methods `goTo()`, `next()`, `prev()`, `play()` and `pause()`, and the `surface-carousel-change` event. Step promises always resolve, whether the step arrives or is interrupted.
- `supportsScrollEnd()`, `carouselStyles` and `adoptCarouselStyles()` from the root entry; `surface-elements/carousel` and `surface-elements/carousel.css` entry points.

## [0.1.0] - 2026-10-30

### Added

- `surface-drawer`: drawer on a light DOM `<dialog>`, with light dismiss, animated close and scroll lock.
- `surface-modal`: centered modal on a light DOM `<dialog>`, with size presets.
- `surface-header`: sticky header.
- `surface-accordion`: animated native `<details>`.
- `dialog` and `scroll-lock` utilities as separate entry points; scroll-lock state is shared between the package and the copy files.
- Per-component CSS (`*.css`) that works without JavaScript, and `custom-elements.json`.
- Agent skill in `skills/surface-elements/`.