# Enhance a light DOM `<dialog>` instead of rendering one in shadow DOM

Dialog-based components (starting with `<dialog-drawer>`) wrap a `<dialog>` the consumer writes, and style it through `dialog[data-drawer]` in a cascade layer, rather than rendering the dialog inside a shadow root. ARIA `id` references cannot cross a shadow boundary, so a shadow-internal dialog cannot be labelled by the consumer's heading; light DOM also keeps invoker commands, `closedby` and `<form method="dialog">` working with no JS. The open state lives only in `dialog.open`; the custom element and the functions in `surface-elements/dialog` never mirror it in their own attribute.

## Consequences

Styles are not encapsulated. They ship in `@layer surface-elements` so unlayered consumer rules win, and theming goes through `--drawer-*` custom properties.
