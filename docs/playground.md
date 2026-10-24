# Playground

Bare test pages for each web component: no Starlight layout or styles, only the web component, the page's own CSS and whatever helps to test it. They are for trying behavior by hand, not for documentation.

- Source: `demo/`, a multi-page Vite app (`vite.config.ts`). It runs the library from `src/`, so a page always tests the branch's code.
- Local: `pnpm dev`, then open `http://localhost:5173/playground/<page>/`.
- Published: `pnpm docs:build` runs `pnpm playground:build` after the Astro build, which writes into `site/dist/playground/`. The docs Worker serves it at `/playground/<page>/`, so every PR's Cloudflare preview includes the playground pages of that branch.

## Add a page

1. Create `demo/<page>/index.html`. `<page>` is the folder name of the web component in `src/` (`demo/header/` for `src/header/`). Every `index.html` under `demo/` becomes a page; nothing else to register.
2. Put the script in `demo/<page>/main.ts` and load it with `<script type="module" src="./main.ts"></script>`. Import the web component from source: `import "../../src/<page>/<page>.js"`.
3. Keep the page self-contained: inline `<style>`, `<meta name="robots" content="noindex">`, `<link rel="icon" href="data:,">`. Do not import the docs site's CSS.
4. Optional helpers live in `demo/shared/`. `hud(() => ({ … }))` from `demo/shared/hud.ts` shows a live readout (scroll position, states, attributes) in a corner.
5. Check it with `pnpm dev`, then `pnpm playground:build` must pass. Link the preview URL (`<preview>/playground/<page>/`) in the PR.

Several scenarios for one web component can be separate pages in subfolders (`demo/header/offset/index.html` → `/playground/header/offset/`).

`demo/index.html` is the original all-in-one demo, served at `/playground/`.
