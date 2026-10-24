# Name web components `surface-<use-case>` and namespace everything by the tag

Every web component's tag is `surface-` plus its use case (`surface-drawer`, not `dialog-drawer`), so the name says what it is for rather than which native element it wraps. The prefix avoids collisions with generic names and the spec allows any number of hyphen-separated words after it. The concrete name of each component is decided in that component's own thread, not here.

- **Variants are attributes** on the same tag. A separate tag is only justified when the structure, ARIA role or keyboard behavior differs.
- **The tag is the namespace.** CSS custom properties are `--<tag>-<property>` (`--surface-drawer-size`), and the same rule applies to other tag-scoped names (cascade layers, custom states). Document them with `@cssprop` on the class.
- **Folder and export drop the prefix:** `src/drawer/`, `surface-elements/drawer`, `surface-elements/drawer.css`. Shared functions without a tag (`dialog`, `scroll-lock`) live beside the components and never take the prefix.
- **Vocabulary:** prose, docs and comments say "web component". "Custom element" is reserved for names that are literally that (`customElements.define`, `custom-elements.json`, the package keyword). See `GLOSSARY.md`.

## Consequences

`dialog-drawer` and `header-sticky` predate this decision; they are renamed in their component threads. There are no consumers yet and the package is unpublished, so no compatibility shim is needed. The `--drawer-*` properties become `--surface-drawer-*` at the same time.
