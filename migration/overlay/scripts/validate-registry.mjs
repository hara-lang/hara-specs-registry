import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  findPackageManifests,
  validateManifest,
  validateManifestFiles,
  validatePackageAtPath
} from "./lib/registry-validation.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const manifestPath = path.join(root, "spec-manifest.json");
const jsonOutput = process.argv.includes("--json");
let findings = [];

let manifest;
try {
  manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
} catch (error) {
  findings.push({ code: "MANIFEST_JSON_INVALID", severity: "error", message: error instanceof Error ? error.message : "spec-manifest.json is invalid JSON.", location: "spec-manifest.json" });
}

if (manifest) {
  findings = findings.concat(validateManifest(manifest));
  findings = findings.concat(await validateManifestFiles(manifest, root));
}

for (const packageManifest of await findPackageManifests(root)) {
  findings = findings.concat(await validatePackageAtPath(root, packageManifest));
}

if (jsonOutput) {
  console.log(JSON.stringify({ valid: findings.every(({ severity }) => severity !== "error"), findings }, null, 2));
} else if (findings.length === 0) {
  console.log("Registry manifest, source files, and packages are valid.");
} else {
  for (const item of findings) console.error(`${item.severity.toUpperCase()} ${item.code}${item.location ? ` (${item.location})` : ""}: ${item.message}`);
}

if (findings.some(({ severity }) => severity === "error")) process.exit(1);
