from __future__ import annotations
import json, re, shutil
from pathlib import Path

root = Path.cwd()

def rm(path: str):
    target = root / path
    if target.is_dir(): shutil.rmtree(target)
    elif target.exists(): target.unlink()

for path in [
    "00-unsorted/package",
    "99-archive/planning/extensions",
    "02-platform/000007-extension/draft/conformance/descriptors.edn",
    "examples/hara-spec-package/hara.package.json",
    "schema/hara-spec-package.schema.json",
]:
    rm(path)

# Fold extension operations into the package command contract.
p = root / "02-platform/000001-cli/draft/hara-cli.edn"
s = p.read_text()
s = s.replace(":hara.cli.route/package-build :hara.cli.route/package-inspect", ":hara.cli.route/package-build :hara.cli.route/package-test\n                :hara.cli.route/package-inspect")
s = s.replace("\n                :hara.cli.route/package-harp :hara.cli.route/package-extension\n                :hara.cli.route/package-registry", "\n                :hara.cli.route/package-harp :hara.cli.route/package-registry")
s = re.sub(r'\n  \{:app/id :hara\.cli/extension\n.*?:hara\.cli\.route/extension-test\]\}', "", s, flags=re.S)
s = re.sub(r'\n  \{:route/id :hara\.cli\.route/extension\n.*?:route/formats \[:text :edn\]\}\n', "\n", s, flags=re.S)
s = re.sub(r'\n  \{:route/id :hara\.cli\.route/extension-check.*?\n  \{:route/id :hara\.cli\.route/id ', "\n\n  {:route/id :hara.cli.route/id ", s, flags=re.S)
s = re.sub(r'\n  \{:route/id :hara\.cli\.route/package-extension\n.*?:route/formats \[:text :edn\]\}', "", s, flags=re.S)
s = re.sub(r'\n  \{:handler/id :hara\.cli\.handler/extension\n.*?:handler/registry :closed\}', "", s, flags=re.S)
old = '''  {:route/id :hara.cli.route/package-build :route/path ["package" "build"]
   :route/aliases [] :route/handler :hara.cli.handler/package
   :route/execution :finite :route/tier :public
   :route/summary "Build a deterministic package archive." :route/arguments []
   :route/options [:hara.cli.option/project :hara.cli.option/format]
   :route/formats [:text :edn]}'''
new = '''  {:route/id :hara.cli.route/package-build :route/path ["package" "build"]
   :route/aliases [] :route/handler :hara.cli.handler/package
   :route/execution :finite :route/tier :public
   :route/summary "Build all project-declared code, extensions and artifacts into a deterministic package archive."
   :route/arguments []
   :route/options [:hara.cli.option/project :hara.cli.option/allow-process
                   :hara.cli.option/format]
   :route/formats [:text :edn]}
  {:route/id :hara.cli.route/package-test :route/path ["package" "test"]
   :route/aliases [] :route/handler :hara.cli.handler/package
   :route/execution :finite :route/tier :public
   :route/summary "Test project-declared package resources and extension targets."
   :route/arguments []
   :route/options [:hara.cli.option/project :hara.cli.option/allow-process
                   :hara.cli.option/format]
   :route/formats [:text :edn]}'''
if old not in s: raise SystemExit("CLI package-build marker changed")
s = s.replace(old, new)
if any(x in s for x in [":hara.cli/extension", ":hara.cli.route/extension", ":hara.cli.handler/extension", "package-extension"]):
    raise SystemExit("separate extension command remains")
p.write_text(s)

# Use an allowed-key contract without naming removed authoring surfaces.
p = root / "scripts/lib/registry-validation.mjs"
s = p.read_text()
s = re.sub(r'const FORBIDDEN_PROJECT_KEYS = new Set\(\[[^\n]+\]\);', '''const ALLOWED_PROJECT_KEYS = new Set([
  "hara/type", "hara/version", "project/id", "project/version", "project/source-paths",
  "project/test-paths", "project/extension-paths", "project/artifact-paths",
  "project/archive-root", "project/capabilities", "project/main", "project/default-profile",
  "project/profiles", "project/dependencies", "project/package", "project/build",
  "project/extensions", "project/remote-artifacts"
]);''', s)
s = s.replace('  for (const key of FORBIDDEN_PROJECT_KEYS) if (Object.hasOwn(project, key)) findings.push(finding("PROJECT_PARALLEL_MANIFEST_INVALID", `:${key} is not part of the single-manifest project contract.`, key));', '  for (const key of Object.keys(project)) if (!ALLOWED_PROJECT_KEYS.has(key)) findings.push(finding("PROJECT_UNKNOWN_KEY", `:${key} is not part of the project contract.`, key));')
p.write_text(s)

p = root / "test/registry-validation.test.mjs"
s = p.read_text().replace("parallel authoring surfaces are rejected", "unknown project fields are rejected")
s = s.replace(':project/capabilities #{} :project/recipe "other.edn"', ':project/capabilities #{} :project/unrecognized true')
s = s.replace('code === "PROJECT_PARALLEL_MANIFEST_INVALID"', 'code === "PROJECT_UNKNOWN_KEY"')
p.write_text(s)

# Align remaining publishing fixtures with exact project input.
for p in (root / "02-platform/000009-publishing").rglob("*"):
    if p.is_file():
        try: s = p.read_text()
        except UnicodeDecodeError: continue
        s = s.replace("recipe-sha256", "project-sha256").replace("Recipe digest", "Project manifest digest").replace("recipe digest", "project manifest digest")
        p.write_text(s)

# Historical files that describe removed package authoring surfaces are removed,
# while active files must be migrated explicitly. Generated indexes are rebuilt
# after this pass and are checked by the workflow's final scan.
for p in list(root.rglob("*")):
    if not p.is_file() or ".git" in p.parts or "node_modules" in p.parts: continue
    rel = p.relative_to(root).as_posix()
    if rel in {"spec-manifest.json", "registry-index.json"}: continue
    try: s = p.read_text()
    except UnicodeDecodeError: continue
    forbidden = ["project.hal", "hara.build.edn", "hara.recipe.edn", "hara.install.edn", "hara.package.json", "recipe-sha256"]
    if any(x in s for x in forbidden):
        if rel.startswith(("00-unsorted/", "99-archive/")): p.unlink()
        elif rel not in {"scripts/project-edn-migration.py", ".github/workflows/project-edn-migration.yml"}:
            raise SystemExit(f"removed authoring surface remains in {rel}")

# Reconcile the source inventory with the resulting tree.
mp = root / "spec-manifest.json"
m = json.loads(mp.read_text())
entries = {e["path"]: e for e in m.get("files", []) if (root / e["path"]).is_file()}
added = [
  "02-platform/000006-package/draft/conformance/projects.edn",
  "02-platform/000007-extension/draft/conformance/extensions.edn",
  "scripts/lib/edn.mjs", "examples/hara-spec-package/project.edn"
]
for path in added:
    if not (root / path).is_file(): continue
    ext = Path(path).suffix
    kind = {".edn":"edn", ".md":"markdown", ".json":"json", ".mjs":"javascript"}.get(ext, ext.lstrip(".") or "file")
    entries.setdefault(path, {"path":path, "kind":kind, "owner":"hara-lang", "classification":"hara"})
m["files"] = sorted(entries.values(), key=lambda e: e["path"])
mp.write_text(json.dumps(m, indent=2) + "\n")

# Remove now-empty historical directories and this one-shot migration.
for p in sorted(root.rglob("*"), reverse=True):
    if p.is_dir() and p != root:
        try: p.rmdir()
        except OSError: pass
rm("scripts/project-edn-migration.py")
rm(".github/workflows/project-edn-migration.yml")
print("single-manifest registry migration complete")
