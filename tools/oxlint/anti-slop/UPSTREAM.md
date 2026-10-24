# Vendored anti-slop

Source: [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop), commit `13909c9e07590f5a85d93c62712259fe14a883f7` (2026-10-13).

Copied from `skills/install-anti-slop/assets/anti-slop/` by the `install-anti-slop` skill on 2026-10-24. Verified with `diff -r` against a clone of that commit: the copy is identical, and the skill in `.agents/skills/install-anti-slop/` matches the same revision.

## Installed paths

- `tools/oxlint/anti-slop/index.ts` — generic plugin, registered as `anti-slop` in `.oxlintrc.json`.
- `tools/oxlint/anti-slop/effect/` — opt-in Effect plugin. Copied but not registered: the repository does not depend on `effect`.
- `tools/oxlint/anti-slop/vendor/eslint-stylistic/` — vendored `padding-line-between-statements` with its `LICENSE` and `UPSTREAM.md`.

## Configuration

- `@oxlint/plugins` pinned to `1.80.0`, matching the installed `oxlint`.
- All generic rules plus `oxc/no-accumulating-spread` enabled at `error`.
- This directory is excluded from Oxlint, Oxfmt and `tsc` (not in `tsconfig.json` `include`).

## Local deviations

None.
