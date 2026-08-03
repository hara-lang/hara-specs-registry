#!/usr/bin/env bash
set -euo pipefail

SOURCE_REPOSITORY="${SOURCE_REPOSITORY:-hara-lang/hara-specs}"
SOURCE_COMMIT="${SOURCE_COMMIT:-dc269add5de05d06ddf215ca9f1d2d2b0c49f135}"
HEAD_REF="${HEAD_REF:?HEAD_REF is required}"
ROOT="$(git rev-parse --show-toplevel)"

cd "$ROOT"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

git remote remove migration-source 2>/dev/null || true
git remote add migration-source "https://github.com/${SOURCE_REPOSITORY}.git"
git fetch --no-tags migration-source "$SOURCE_COMMIT"
SOURCE_SHA="$(git rev-parse FETCH_HEAD)"
if [[ "$SOURCE_SHA" != "$SOURCE_COMMIT" ]]; then
  echo "Resolved source commit ${SOURCE_SHA}, expected ${SOURCE_COMMIT}." >&2
  exit 1
fi

rm -rf 00-unsorted 01-lang 02-platform 99-archive
rm -f spec-manifest.json

git archive "$SOURCE_SHA" \
  00-unsorted \
  01-lang \
  02-platform \
  99-archive \
  spec-manifest.json | tar -x -C "$ROOT"

cp migration/full-corpus/README.final.md README.md
cat > MIGRATION.edn <<EOF
{:migration/id :hara.specs/full-corpus
 :migration/status :complete
 :migration/source
 {:repository "${SOURCE_REPOSITORY}"
  :commit "${SOURCE_SHA}"}
 :migration/target
 {:repository "hara-lang/hara-specs-registry"
  :branch "main"}
 :migration/history :second-parent
 :migration/content
 #{:00-unsorted :01-lang :02-platform :99-archive :spec-manifest}}
EOF

node <<'NODE'
import fs from "node:fs";
const packagePath = "package.json";
const value = JSON.parse(fs.readFileSync(packagePath, "utf8"));
value.scripts.build = "node scripts/generate-index.mjs";
value.scripts.check = "node scripts/validate-registry.mjs && node scripts/generate-index.mjs --check && node scripts/check-index.mjs";
fs.writeFileSync(packagePath, `${JSON.stringify(value, null, 2)}\n`);
NODE

npm run registry:generate
npm test
npm run check

rm -f .github/workflows/import-full-corpus.yml
rm -f scripts/import-full-corpus.sh
rm -rf migration

git add -A
TREE_SHA="$(git write-tree)"
CURRENT_PARENT="$(git rev-parse HEAD)"
MERGE_COMMIT="$(printf '%s\n' 'Import the full specifications corpus' | git commit-tree "$TREE_SHA" -p "$CURRENT_PARENT" -p "$SOURCE_SHA")"
git reset --hard "$MERGE_COMMIT"
git push origin "HEAD:refs/heads/${HEAD_REF}"
