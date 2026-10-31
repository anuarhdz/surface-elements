#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

usage() {
  echo "Usage: pnpm release <patch|minor|major>" >&2
  exit 1
}

BUMP="${1:-}"
case "$BUMP" in
  patch | minor | major) ;;
  *) usage ;;
esac

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "error: not a git repository" >&2
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != "main" ]]; then
  echo "error: release only from main (on ${BRANCH:-detached})" >&2
  exit 1
fi

# Paths with changes other than CHANGELOG.md (the notes for this release).
other_dirty() {
  git status --porcelain | while IFS= read -r line; do
    path="${line:3}"
    path="${path#\"}"
    path="${path%\"}"
    # renames: "old -> new" — take the new side
    if [[ "$path" == *" -> "* ]]; then
      path="${path##* -> }"
    fi
    if [[ "$path" != "CHANGELOG.md" ]]; then
      printf '%s\n' "$path"
    fi
  done
}

if [[ -n "$(other_dirty)" ]]; then
  echo "error: working tree dirty; only uncommitted CHANGELOG.md is allowed before release" >&2
  git status --short >&2
  exit 1
fi

if [[ ! -f CHANGELOG.md ]]; then
  echo "error: CHANGELOG.md missing — write the release notes first (see release skill)" >&2
  exit 1
fi

if [[ -z "$(git status --porcelain -- CHANGELOG.md)" ]]; then
  echo "error: CHANGELOG.md has no uncommitted changes for this release" >&2
  echo "hint: add a ## [X.Y.Z] section for the upcoming version, then re-run" >&2
  exit 1
fi

command -v gh >/dev/null || {
  echo "error: gh CLI required" >&2
  exit 1
}
command -v npm >/dev/null || {
  echo "error: npm required" >&2
  exit 1
}

# pnpm keeps its own registry session, apart from npm's: check the one that
# publishes, before anything is committed, tagged or released.
pnpm whoami >/dev/null || {
  echo "error: not logged in to the registry with pnpm (pnpm login)" >&2
  exit 1
}
gh auth status >/dev/null 2>&1 || {
  echo "error: gh not authenticated (gh auth login)" >&2
  exit 1
}

echo "==> verify"
pnpm test
pnpm typecheck
pnpm lint
pnpm fmt:check

# Build first: the dry-run lists whatever dist/ holds, and a stale dist/
# from an older build would pass for this release.
echo "==> build"
pnpm build

# The build regenerates skills/ and copy/. A change there means the commit
# being tagged does not match what would be published.
if [[ -n "$(other_dirty)" ]]; then
  echo "error: pnpm build changed tracked files; commit them on main first" >&2
  git status --short >&2
  exit 1
fi

echo "==> pack dry-run"
pnpm pack --dry-run

OLD_VERSION="$(node -p "require('./package.json').version")"
echo "==> bump ${OLD_VERSION} (${BUMP})"
# npm, not pnpm: pnpm version refuses the uncommitted CHANGELOG.md this
# script requires. With --no-git-tag-version npm only edits package.json.
npm version "$BUMP" --no-git-tag-version
VERSION="$(node -p "require('./package.json').version")"
TAG="v${VERSION}"

restore_version() {
  npm version "$OLD_VERSION" --no-git-tag-version --allow-same-version >/dev/null 2>&1 ||
    git checkout -- package.json
}

if ! grep -qE "^## \[${VERSION}\]" CHANGELOG.md; then
  echo "error: CHANGELOG.md has no ## [${VERSION}] section" >&2
  echo "hint: upcoming version is ${VERSION}; add that heading, then re-run" >&2
  restore_version
  exit 1
fi

echo "==> commit and tag ${TAG}"
git add package.json CHANGELOG.md
if [[ -f pnpm-lock.yaml ]] && [[ -n "$(git status --porcelain -- pnpm-lock.yaml)" ]]; then
  git add pnpm-lock.yaml
fi
git commit -m "chore(release): ${VERSION}"
git tag -a "$TAG" -m "chore(release): ${VERSION}"

echo "==> push"
git push origin main --follow-tags

NOTES_FILE="$(mktemp)"
trap 'rm -f "$NOTES_FILE"' EXIT

# The section for this version, without blank lines at either end. Plain
# awk only: the BSD sed on macOS rejects GNU-style one-liners.
awk -v ver="$VERSION" '
  $0 ~ "^## \\[" ver "\\]" { capture=1; next }
  capture && $0 ~ /^## \[/ { exit }
  capture { lines[++n] = $0 }
  END {
    first = 1
    while (first <= n && lines[first] ~ /^[[:space:]]*$/) first++
    last = n
    while (last >= first && lines[last] ~ /^[[:space:]]*$/) last--
    for (i = first; i <= last; i++) print lines[i]
  }
' CHANGELOG.md >"$NOTES_FILE"

if [[ ! -s "$NOTES_FILE" ]]; then
  echo "See CHANGELOG.md for details." >"$NOTES_FILE"
fi

echo "==> GitHub Release ${TAG}"
gh release create "$TAG" --title "$TAG" --notes-file "$NOTES_FILE"

echo "==> npm publish"
pnpm publish --access public

echo "==> done"
echo "    npm: $(npm view surface-elements version)"
echo "    gh:  $(gh release view "$TAG" --json url -q .url)"
