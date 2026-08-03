import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const manifest = JSON.parse(await fs.readFile(path.join(root, "spec-manifest.json"), "utf8"));
const index = JSON.parse(await fs.readFile(path.join(root, "registry-index.json"), "utf8"));
const findings = [];
const add = (code, message) => findings.push({ code, message });

if (index.schemaVersion !== 2) add("INDEX_SCHEMA", "registry-index.json must use schemaVersion 2.");
if (index.source?.repository !== "hara-lang/hara-specs-registry") add("INDEX_REPOSITORY", "The canonical index repository is incorrect.");
if (index.source?.transitional !== false) add("INDEX_TRANSITIONAL", "The canonical index must not be marked transitional.");
if (index.source?.manifestPath !== "spec-manifest.json") add("INDEX_MANIFEST", "The index must identify spec-manifest.json.");

const manifestPaths = new Set((manifest.files || []).map(({ path: value }) => value));
const ids = new Set();
const slugs = new Set();
for (const spec of index.specs || []) {
  if (!spec.id || ids.has(spec.id)) add("SPEC_ID", `Specification id is missing or duplicated: ${spec.id || "<missing>"}.`);
  else ids.add(spec.id);
  if (!spec.slug || slugs.has(spec.slug)) add("SPEC_SLUG", `Specification slug is missing or duplicated: ${spec.slug || "<missing>"}.`);
  else slugs.add(spec.slug);

  if (!manifestPaths.has(spec.documentationPath)) add("SPEC_DOCUMENTATION", `${spec.id} documentation is not inventoried: ${spec.documentationPath}.`);

  if (spec.materialization === "registry") {
    if (spec.source?.repository !== "hara-lang/hara-specs-registry") add("SPEC_SOURCE_REPOSITORY", `${spec.id} must resolve to the registry repository.`);
    if (spec.source?.ref !== "main") add("SPEC_SOURCE_REF", `${spec.id} must resolve through the canonical main ref in the published index.`);
    if (!manifestPaths.has(spec.source?.path)) add("SPEC_SOURCE_PATH", `${spec.id} source is not inventoried: ${spec.source?.path}.`);
  } else if (spec.materialization === "pinned-source") {
    if (!/^[0-9a-f]{40}$/.test(spec.source?.ref || "")) add("PINNED_REF", `${spec.id} must use an exact 40-character source commit.`);
    if (!/^[0-9a-f]{40}$/.test(spec.source?.blob || "")) add("PINNED_BLOB", `${spec.id} must record an exact source blob.`);
    if (!spec.source?.repository || !spec.source?.path) add("PINNED_SOURCE", `${spec.id} has an incomplete pinned source.`);
    if (!manifestPaths.has(spec.migrationPath)) add("PINNED_MIGRATION", `${spec.id} migration record is not inventoried: ${spec.migrationPath}.`);
  } else {
    add("SPEC_MATERIALIZATION", `${spec.id} has an unsupported materialization state.`);
  }
}

const specs = index.specs || [];
const expectedSummary = {
  specifications: specs.length,
  draft: specs.filter(({ status }) => status === "draft").length,
  ready: specs.filter(({ status }) => status === "ready" || status === "stable").length,
  executable: specs.filter(({ executable }) => executable).length,
  requirements: specs.reduce((total, { requirements = 0 }) => total + requirements, 0),
  materialized: specs.filter(({ materialization }) => materialization === "registry").length,
  pinnedSource: specs.filter(({ materialization }) => materialization === "pinned-source").length,
  layers: [...new Set(specs.map(({ layer }) => layer))].sort()
};

for (const [key, expected] of Object.entries(expectedSummary)) {
  const actual = index.summary?.[key];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) add("INDEX_SUMMARY", `summary.${key} is ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)}.`);
}

if (findings.length) {
  for (const finding of findings) console.error(`ERROR ${finding.code}: ${finding.message}`);
  process.exit(1);
}

console.log(`Registry index is valid: ${specs.length} specifications, ${expectedSummary.materialized} materialized, ${expectedSummary.pinnedSource} pinned.`);
