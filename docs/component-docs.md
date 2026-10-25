# Documenting a web component

Each web component gets one page in `site/src/content/docs/components/<name>.mdx`. Use the same sections in the same order. Facts that exist in the code (attributes, slots, events, states, CSS properties) come from the JSDoc via the manifest; do not retype them.

1. **Install and use.** Documented as if the package were installed (`import "surface-elements/<name>"`), with minimal markup and a live demo.
2. **Copy.** `<CopyFile tag="surface-<name>" />` shows the generated copy file (`copy/surface-<name>.js`, written by `pnpm build`). Never written by hand; CI fails if stale.
3. **API.** `<ApiReference tag="surface-<name>" />` renders attributes, properties, methods, events, slots, states and CSS properties from the manifest. Add prose only for facts JSDoc cannot carry (for example a data attribute on a child).
4. **If you implement it by hand.** What the web component does on top of native HTML, so it can be reproduced or adapted:
   - minimal markup
   - minimal CSS
   - behavior the JS adds, and what happens without it
   - accessibility checklist (roles, focus, keyboard)
   - browser support and fallbacks

## Using without the package

One guide page, `guides/without-installing.mdx`, explains the copy-file route: paste the file, keep it up to date by hand, and expect no updates otherwise. Add the CDN route to that page only once the package is published to npm, with a real pinned version.

State shared between web components (for example the scroll lock counter) lives under a `Symbol.for("surface-elements.<name>")` global, so copies coexist with each other and with the package.
