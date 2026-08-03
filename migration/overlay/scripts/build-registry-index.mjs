import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRegistryIndex } from "./lib/registry-index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const checkOnly = process.argv.includes("--check");
const manifestPath = path.join(root, "spec-manifest.json");
const outputPath = path.join(root, "registry-index.json");

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const documents = new Map();
for (const file of manifest.files || []) {
  if (file.kind !== "edn") continue;
  documents.set(file.path, await fs.readFile(path.join(root, file.path), "utf8"));
}

const registry = createRegistryIndex({
  manifest,
  documents,
  repository: "hara-lang/hara-specs-registry",
  ref: "main"
});

if (registry.specs.length === 0) throw new Error("The registry index contains no specification documents.");
const contents = `${JSON.stringify(registry, null, 2)}\n`;

if (checkOnly) {
  const current = await fs.readFile(outputPath, "utf8").catch(() => "");
  if (current !== contents) {
    console.error("registry-index.json is out of date. Run npm run build.");
    process.exit(1);
  }
} else {
  await fs.writeFile(outputPath, contents);
  console.log(`Indexed ${registry.summary.specifications} specifications and ${registry.summary.requirements} requirements.`);
}
