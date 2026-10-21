---
name: conventional-commit
description: Write or fix git commits to Conventional Commits. Use when committing, amending, squashing, or the user mentions conventional commits / commit message format.
---

# Conventional Commit

Every commit message in this repo is a Conventional Commit. No other shape.

## Format

```
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

- **Subject line**: `<type>` lowercase; optional `(scope)` lowercase; optional `!` for a breaking change; `: ` then description.
- **Description**: imperative mood, no trailing period, ~72 chars max on the subject line.
- **Body**: free prose; wrap ~100 chars; explain *why*, not *what* the diff already shows.
- **Footers**: `BREAKING CHANGE: <summary>` when the public API breaks (required if `!` is used, or instead of `!`). `Fixes #123` / `Closes #123` as needed.

## Types

| type | when |
|------|------|
| `feat` | new user-facing capability |
| `fix` | bug fix |
| `docs` | docs only |
| `style` | formatting; no behaviour change |
| `refactor` | behaviour-preserving restructure |
| `perf` | performance improvement |
| `test` | tests only |
| `build` | build system or external deps |
| `ci` | CI config / scripts |
| `chore` | maintenance that fits nothing above |
| `revert` | reverts a prior commit (`revert: <subject>` or `revert: <hash>`) |

Pick the **primary** intent of the change. One commit, one type.

## Scope (optional)

Short noun for the area touched: element or package surface (`header-sticky`, `dialog-drawer`), or area (`release`, `deps`). Omit when the change is cross-cutting.

## Breaking changes

Public API break → mark it:

```
feat(dialog-drawer)!: rename open attribute to expanded

BREAKING CHANGE: `open` is removed; use `expanded` instead.
```

or:

```
feat(dialog-drawer): rename open attribute to expanded

BREAKING CHANGE: `open` is removed; use `expanded` instead.
```

Either `!` or the `BREAKING CHANGE:` footer is enough; both is fine.

## Steps

1. Inspect the change set: `git status`, `git diff` (and `git diff --cached` if partially staged). Stage only what belongs in this commit.
2. Choose **type**, optional **scope**, and whether it is **breaking**.
3. Write the subject; add body/footers only when they carry information the subject cannot.
4. Commit with a HEREDOC so formatting is preserved:

```bash
git commit -m "$(cat <<'EOF'
type(scope): description

Optional body.

Optional-Footer: value
EOF
)"
```

5. Done when `git log -1 --format=%B` matches the format above (valid type, subject shape, breaking footer if needed).

## Examples

```
feat(header-sticky): add scroll-padding CSS variable
```

```
fix(dialog-drawer): restore focus to trigger on close
```

```
docs: document dialog-drawer slots
```

```
chore(release): 0.2.0
```

```
feat!: drop CommonJS entry

BREAKING CHANGE: only ESM is published; require() no longer works.
```

## Guardrails

- Never invent a type outside the table.
- Never put multiple unrelated intents in one commit; split first.
- Never use non-conventional subjects (`Update stuff`, `WIP`, `fix bug`).
- `chore(release):` is reserved for version bumps produced by the release flow.
