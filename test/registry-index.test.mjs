import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRegistryIndex, parseSpecDocument, selectCanonicalSpecifications } from "../scripts/lib/registry-index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const readJson = async (name) => JSON.parse(await fs.readFile(path.join(root, name), "utf8"));
const source = (id, version = "1.0.0-draft", title = "Example specification") => `{:document/id :${id}\n :document/type :language-spec\n :document/version "${version}"\n :document/status :draft\n :document/title "${title}"\n :document/summary "Example specification."\n :scope/data-notation {:notation/extension ".edn"}\n :spec/sections [{:section/requirements [{:requirement/id :example/one}]}]}`;
const file = (filePath) => ({ path: filePath, kind: "edn", classification: "hara", owner: "hara-lang" });

test("EDN metadata is converted into a source-addressable registry entry", () => {
  const item = file("01-lang/100-example/draft/example.edn");
  const parsed = parseSpecDocument(source("hal/example"), item, new Set([item.path, "01-lang/100-example/draft/README.md"]));
  assert.equal(parsed.id, "hal/example");
  assert.equal(parsed.coordinate, "hal/example");
  assert.equal(parsed.documentationPath, "01-lang/100-example/draft/README.md");
  assert.equal(parsed.requirements, 1);
});

test("canonical selection prefers the latest numbered-layer source and retains alternates", () => {
  const candidates = [
    { id: "hal/example", version: "0.9.0", status: "draft", sourcePath: "01-lang/100-example/draft/example.edn", layer: "01-lang", title: "Example" },
    { id: "hal/example", version: "1.0.0", status: "draft", sourcePath: "00-unsorted/example/draft/example.edn", layer: "00-unsorted", title: "Example" },
    { id: "hal/example", version: "1.0.0", status: "ready", sourcePath: "01-lang/100-example/ready/example.edn", layer: "01-lang", title: "Example" }
  ];
  const [selected] = selectCanonicalSpecifications(candidates);
  assert.equal(selected.sourcePath, "01-lang/100-example/ready/example.edn");
  assert.equal(selected.alternateSources.length, 2);
});

test("registry generation excludes conformance and archive documents", () => {
  const primary = file("01-lang/100-example/draft/example.edn");
  const conformance = file("01-lang/100-example/draft/conformance/example.edn");
  const archive = file("99-archive/example/draft/example.edn");
  const manifest = { version: 1, files: [primary, conformance, archive, { path: "01-lang/100-example/draft/README.md", kind: "markdown" }] };
  const index = createRegistryIndex({ manifest, documents: new Map([[primary.path, source("hal/example")], [conformance.path, source("hal/conformance")], [archive.path, source("hal/archive")]]) });
  assert.equal(index.schemaVersion, 2);
  assert.equal(index.summary.specifications, 1);
  assert.equal(index.summary.materialized, 1);
  assert.equal(index.summary.pinnedSource, 0);
  assert.equal(index.specs[0].coordinate, "hal/example");
  assert.equal(index.specs[0].source.repository, "hara-lang/hara-specs-registry");
});

test("committed catalogue uses unique native coordinates", async () => {
  const index = await readJson("registry-index.json");
  assert.equal(index.schemaVersion, 2);
  assert.equal(index.source.repository, "hara-lang/hara-specs-registry");
  assert.equal(index.source.transitional, false);
  assert.equal(index.summary.specifications, index.specs.length);
  assert.equal(index.summary.materialized + index.summary.pinnedSource, index.specs.length);
  assert.equal(new Set(index.specs.map(({ id }) => id)).size, index.specs.length);
  assert.equal(new Set(index.specs.map(({ slug }) => slug)).size, index.specs.length);
  assert.equal(new Set(index.specs.map(({ coordinate }) => coordinate)).size, index.specs.length);
});

test("every pinned source uses immutable commit and blob identities", async () => {
  const index = await readJson("registry-index.json");
  for (const spec of index.specs.filter(({ materialization }) => materialization === "pinned-source")) {
    assert.match(spec.source.ref, /^[0-9a-f]{40}$/);
    assert.match(spec.source.blob, /^[0-9a-f]{40}$/);
  }
});
