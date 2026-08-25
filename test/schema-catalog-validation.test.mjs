import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import {
  schemaCatalogInternals,
  validateSchemaCatalog
} from "../scripts/lib/schema-catalog-validation.mjs";

const fixturePath = new URL("../01-lang/011-typed-catalog/draft/conformance/catalog-v2.json", import.meta.url);
const fixture = JSON.parse(await fs.readFile(fixturePath, "utf8"));
const clone = (value) => structuredClone(value);
const codes = (value) => validateSchemaCatalog(value).map(({ code }) => code);

test("pinned std.typed catalog fixture is valid", () => {
  assert.deepEqual(validateSchemaCatalog(fixture), []);
  assert.equal(
    schemaCatalogInternals.componentId([fixture["catalog/entries"][1]["schema/coordinate"]]),
    "sha256:b464797a02de2b5db17893d6467ab0abccd4b7d95d1bdbe72ad69661b206d520"
  );
});

test("rejects a stale exact dependency atomically", () => {
  const value = clone(fixture);
  value["catalog/entries"][0]["schema/dependencies"][0][2] = `sha256:${"0".repeat(64)}`;
  value["catalog/document-digest"] = schemaCatalogInternals.expectedDocumentDigest(value);
  assert.ok(codes(value).includes("SCHEMA_DEPENDENCY_MISSING"));
});

test("rejects forged recursive component evidence", () => {
  const value = clone(fixture);
  value["catalog/components"][2]["component/members"].push(
    value["catalog/entries"][1]["schema/coordinate"]
  );
  value["catalog/document-digest"] = schemaCatalogInternals.expectedDocumentDigest(value);
  const result = codes(value);
  assert.ok(result.includes("COMPONENT_ID_MISMATCH"));
  assert.ok(result.includes("COMPONENT_MEMBER_OVERLAP"));
  assert.ok(result.includes("COMPONENT_EVIDENCE_MISMATCH"));
});

test("rejects per-entry schema versions", () => {
  const value = clone(fixture);
  value["catalog/entries"][0]["schema/version"] = 1;
  value["catalog/document-digest"] = schemaCatalogInternals.expectedDocumentDigest(value);
  assert.ok(codes(value).includes("SCHEMA_VERSION_FORBIDDEN"));
});

test("rejects noncanonical entry order and document bytes", () => {
  const value = clone(fixture);
  [value["catalog/entries"][0], value["catalog/entries"][1]] =
    [value["catalog/entries"][1], value["catalog/entries"][0]];
  const result = codes(value);
  assert.ok(result.includes("CATALOG_ENTRIES_NONCANONICAL"));
  assert.ok(result.includes("CATALOG_DOCUMENT_DIGEST_MISMATCH"));
});
