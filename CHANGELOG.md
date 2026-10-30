# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Conventional Commits](https://www.conventionalcommits.org/).

## [0.1.0] - 2026-10-30

### Added

- `surface-drawer`: drawer on a light DOM `<dialog>`, with light dismiss, animated close and scroll lock.
- `surface-modal`: centered modal on a light DOM `<dialog>`, with size presets.
- `surface-header`: sticky header.
- `surface-accordion`: animated native `<details>`.
- `dialog` and `scroll-lock` utilities as separate entry points; scroll-lock state is shared between the package and the copy files.
- Per-component CSS (`*.css`) that works without JavaScript, and `custom-elements.json`.
- Agent skill in `skills/surface-elements/`.