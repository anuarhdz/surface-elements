# Surface Elements

A library of web components for common interface surfaces (drawers, dialogs, headers, navigation), built on native HTML and enhanced progressively.

## Language

**Web component**:
A `surface-<use-case>` tag shipped by this package that enhances native HTML the consumer writes in the light DOM.
_Avoid_: Custom element (except where it is the literal API or tool name), widget

**Variant**:
A different presentation or behavior of one web component, chosen with an attribute on the same tag.
_Avoid_: Type, flavor, a separate tag

**Function**:
A tag-less export (`surface-elements/dialog`, `surface-elements/scroll-lock`) that web components and consumers can both use.
_Avoid_: Helper, util

**Copy file**:
The single self-contained file generated at build for one web component, which a consumer pastes into their project instead of installing the package.
_Avoid_: Snippet, standalone build
