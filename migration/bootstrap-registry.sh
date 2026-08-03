#!/usr/bin/env bash
set -euo pipefail

SOURCE_REPOSITORY="${SOURCE_REPOSITORY:-hara-lang/hara-specs}"
SOURCE_REF="${SOURCE_REF:-dc269add5de05d06ddf215ca9f1d2d2b0c49f135}"
TRIGGER_SHA="${GITHUB_SHA:?GITHUB_SHA is required for the force-with-lease guard}"
ROOT="$(git rev-parse --show-toplevel)"
OVERLAY="$(mktemp -d)"
trap 'rm -rf "$OVERLAY"' EXIT

cd "$ROOT"
cp -a migration/overlay/. "$OVERLAY/"

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git remote remove registry-source 2>/dev/null || true
git remote add registry-source "https://github.com/${SOURCE_REPOSITORY}.git"
git fetch --no-tags registry-source "$SOURCE_REF"
git checkout -B registry-migration FETCH_HEAD

git rm -r --ignore-unmatch \
  .github/workflows \
  .gitmodules \
  .nojekyll \
  CNAME \
  assets \
  astro.config.mjs \
  docs/repository-split.md \
  index.html \
  netlify \
  netlify.toml \
  package-lock.json \
  package.json \
  public \
  registry \
  scripts \
  specs.css \
  src \
  test \
  vendor

cp -a "$OVERLAY"/. .
node scripts/build-registry-index.mjs
node scripts/validate-registry.mjs
node --test test/*.test.mjs

git add -A
git commit -m "Complete specifications registry split"
git push --force-with-lease="refs/heads/main:${TRIGGER_SHA}" origin HEAD:refs/heads/main
