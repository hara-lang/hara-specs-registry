import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRegistryIndex } from "./lib/registry-index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const checkOnly = process.argv.includes("--check");
const manifestPath = path.join(root, "spec-manifest.json");
const outputPath = path.join(root, "registry-index.json");
const migrationRepository = process.env.HARA_MIGRATION_SOURCE_REPOSITORY || "hara-lang/hara-specs";
const migrationCommit = process.env.HARA_MIGRATION_SOURCE_COMMIT || "dc269add5de05d06ddf215ca9f1d2d2b0c49f135";

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const documents = new Map();
for (const file of manifest.files || []) {
  if (file.kind !== "edn") continue;
  const absolute = path.join(root, file.path);
  try {
    documents.set(file.path, await fs.readFile(absolute, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`Manifest source is missing: ${file.path}`);
    throw error;
  }
}

const registry = createRegistryIndex({
  manifest,
  documents,
  repository: "hara-lang/hara-specs-registry",
  ref: "main",
  migration: {
    repository: migrationRepository,
    commit: migrationCommit
  }
});

if (registry.specs.length === 0) throw new Error("The registry generator found no canonical specifications.");
const contents = `${JSON.stringify(registry, null, 2)}\n`;

if (checkOnly) {
  const current = await fs.readFile(outputPath, "utf8").catch(() => "");
  if (current !== contents) {
    console.error("registry-index.json is out of date. Run npm run registry:generate.");
    process.exit(1);
  }
  console.log(`registry-index.json matches ${registry.summary.specifications} generated specifications.`);
} else {
  await fs.writeFile(outputPath, contents);
  console.log(`Generated ${registry.summary.specifications} specifications and ${registry.summary.requirements} requirements.`);
}
