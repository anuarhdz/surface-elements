---
name: release
description: Cut a release — changelog, version bump, GitHub Release, local npm publish. Use when the user wants to release, publish, ship a version, or bump and tag.
metadata:
  internal: true
---

# Release

Local, conscious release for this single package. CI never publishes; you (or the agent following this skill) do.

## Preconditions

Before any step:

1. On `main`, clean working tree (`git status`).
2. `git fetch origin && git pull --ff-only`.
3. Logged into the registry with pnpm (`pnpm whoami`; pnpm keeps its own session, so `npm login` alone is not enough) and GitHub CLI (`gh auth status`).
4. CI green on the tip of `main` you are releasing.

If any fail, stop and fix; do not release from a dirty or divergent tree.

## Bump choice

Ask the user unless they already named it. Map from commits since the last version tag (`git describe --tags --abbrev=0` or the full history if none):

| bump | when |
|------|------|
| `major` | any `BREAKING CHANGE` / `type!:` |
| `minor` | any `feat` (no breaking) |
| `patch` | `fix` / docs / chore / etc. only |

First public release: prefer `0.1.0` (or keep `0.0.x` if still experimental — confirm with the user).

## Steps

Run in order. Do not skip gates.

### 1. Verify

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm fmt:check
```

All must pass.

### 2. Changelog

Compute the upcoming version (do not bump yet). From current `package.json` version `M.m.p`:

- `major` → `M+1.0.0`
- `minor` → `M.m+1.0`
- `patch` → `M.m.p+1`

Update `CHANGELOG.md` for **that** version (leave the edit uncommitted — the release script folds it into the release commit):

1. Collect commits since the previous tag:

```bash
PREV=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -n "$PREV" ]; then git log "${PREV}..HEAD" --pretty=format:'%s'; else git log --pretty=format:'%s'; fi
```

2. Group by conventional type into Keep a Changelog sections:

| commit type | section |
|-------------|---------|
| `feat` | ### Added |
| `fix` | ### Fixed |
| `perf` | ### Changed |
| `refactor` / behaviour-visible tweaks | ### Changed |
| `docs` / `test` / `chore` / `ci` / `build` / `style` | omit unless user-facing |
| `BREAKING CHANGE` / `type!:` | ### Breaking Changes (list first) |

3. Prepend under the heading block:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Breaking Changes

- …

### Added

- …

### Fixed

- …
```

Rewrite subjects into short user-facing bullets (drop the type prefix; keep the intent). Skip `chore(release):` commits. Date is today (`YYYY-MM-DD`).

### 3. Dry-run pack

```bash
pnpm pack --dry-run
```

Confirm the tarball is only `dist/**` plus package metadata (`package.json`, `README`, `LICENSE`, `CHANGELOG` if included). `files` in `package.json` is the source of truth.

### 4. Run the release script

```bash
pnpm release <patch|minor|major>
```

The script (see `scripts/release.sh`):

1. Re-runs the verify gate, then `pnpm build`, and stops if the build changes tracked files.
2. `pnpm pack --dry-run` on the fresh `dist/`.
3. `npm version <bump> --no-git-tag-version` — bumps `package.json` only (`pnpm version` refuses the uncommitted changelog) and checks `CHANGELOG.md` has a `## [X.Y.Z]` section.
4. Commits `package.json` and `CHANGELOG.md` as `chore(release): X.Y.Z` and tags `vX.Y.Z`.
5. `git push origin main --follow-tags`.
6. `gh release create "vX.Y.Z"` with the notes from that changelog section.
7. `pnpm publish --access public`.

**Changelog + version commit:** before invoking the script, the changelog for `X.Y.Z` must already be written on disk (uncommitted). The script includes it in the release commit. If you write the changelog *after* the bump, stop and fix — do not leave changelog out of the tagged commit.

If the script is unavailable mid-session, perform the same sequence manually and keep the commit message `chore(release): X.Y.Z`.

### 5. Confirm

```bash
npm view surface-elements version
gh release view "v$(node -p "require('./package.json').version")"
```

Done when: tag exists on origin, GitHub Release is public, and `npm view` shows the new version.

## Guardrails

- Publish is **local only** — never add npm publish to GitHub Actions.
- One release commit per version; message always `chore(release): X.Y.Z`.
- Never force-push `main` or move an existing `v*` tag.
- Never publish with a dirty tree or from a branch other than `main`.
- If `pnpm publish` fails after the tag was pushed, fix the cause and publish the **same** version; do not bump again.
