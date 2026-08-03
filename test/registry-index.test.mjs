import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const readJson = async (name) => JSON.parse(await fs.readFile(path.join(root, name), "utf8"));

test("canonical registry index is non-transitional and source-addressable", async () => {
  const index = await readJson("registry-index.json");
  assert.equal(index.schemaVersion, 2);
  assert.equal(index.source.repository, "hara-lang/hara-specs-registry");
  assert.equal(index.source.transitional, false);
  assert.equal(index.summary.specifications, index.specs.length);
  assert.equal(new Set(index.specs.map(({ id }) => id)).size, index.specs.length);
  assert.equal(new Set(index.specs.map(({ slug }) => slug)).size, index.specs.length);
});

test("materialized and pinned specifications declare different provenance", async () => {
  const index = await readJson("registry-index.json");
  const materialized = index.specs.filter(({ materialization }) => materialization === "registry");
  const pinned = index.specs.filter(({ materialization }) => materialization === "pinned-source");
  assert.equal(materialized.length, 3);
  assert.equal(pinned.length, 1);
  assert.ok(materialized.every(({ source }) => source.repository === "hara-lang/hara-specs-registry"));
  assert.match(pinned[0].source.ref, /^[0-9a-f]{40}$/);
  assert.match(pinned[0].source.blob, /^[0-9a-f]{40}$/);
});

test("every local registry path is inventoried", async () => {
  const [manifest, index] = await Promise.all([readJson("spec-manifest.json"), readJson("registry-index.json")]);
  const paths = new Set(manifest.files.map(({ path: value }) => value));
  for (const spec of index.specs) {
    assert.ok(paths.has(spec.documentationPath));
    if (spec.materialization === "registry") assert.ok(paths.has(spec.source.path));
    if (spec.materialization === "pinned-source") assert.ok(paths.has(spec.migrationPath));
  }
});
