import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSchemaCatalog } from "./lib/schema-catalog-validation.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const fixture = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "01-lang/011-typed-catalog/draft/conformance/catalog-v2.json");
const jsonOutput = process.argv.includes("--json");

let catalog;
let findings = [];
try {
  catalog = JSON.parse(await fs.readFile(fixture, "utf8"));
  findings = validateSchemaCatalog(catalog);
} catch (error) {
  findings = [{
    code: "CATALOG_FIXTURE_READ_FAILED",
    severity: "error",
    message: error instanceof Error ? error.message : "Catalog fixture could not be read.",
    location: fixture
  }];
}

if (jsonOutput) {
  console.log(JSON.stringify({ valid: findings.length === 0, findings }, null, 2));
} else if (findings.length === 0) {
  console.log(`std.typed catalog fixture is valid: ${path.relative(root, fixture)}`);
} else {
  for (const item of findings) {
    console.error(`${item.severity.toUpperCase()} ${item.code}${item.location ? ` (${item.location})` : ""}: ${item.message}`);
  }
}

if (findings.length) process.exit(1);
