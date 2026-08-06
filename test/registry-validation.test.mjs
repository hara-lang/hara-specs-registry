import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseEdn } from "../scripts/lib/edn.mjs";
import {
  expectedPackageRoot,
  safeRegistryPath,
  validateManifest,
  validateManifestFiles,
  validateProjectManifest
} from "../scripts/lib/registry-validation.mjs";

test("registry paths reject traversal and platform separators", () => {
  assert.equal(safeRegistryPath("01-lang/example.edn"), true);
  assert.equal(safeRegistryPath("../secret"), false);
  assert.equal(safeRegistryPath("01-lang\\secret"), false);
  assert.equal(safeRegistryPath("/absolute"), false);
});

test("manifest validation catches duplicate and unsafe paths", () => {
  const findings = validateManifest({ version: 1, files: [
    { path: "spec.edn", kind: "edn" },
    { path: "spec.edn", kind: "edn" },
    { path: "../escape.edn", kind: "edn" }
  ]});
  assert.deepEqual(findings.map(({ code }) => code), ["MANIFEST_PATH_DUPLICATE", "MANIFEST_PATH_UNSAFE"]);
});

test("manifest source validation reports missing files", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hara-registry-"));
  try {
    const findings = await validateManifestFiles({ files: [{ path: "missing.edn" }] }, root);
    assert.equal(findings[0].code, "MANIFEST_FILE_MISSING");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("project.edn is the package authoring surface", () => {
  const project = parseEdn(`{:hara/type :project
    :hara/version "1.0.0"
    :project/id acme/invoice
    :project/version "1.2.0"
    :project/source-paths ["src"]
    :project/test-paths ["test"]
    :project/extension-paths ["artifacts"]
    :project/capabilities #{}
    :project/dependencies {}
    :project/extensions {invoice.native {:provider :wasm :abi :core.v1 :module "artifacts/invoice.wasm"}}}`);
  assert.deepEqual(validateProjectManifest(project), []);
  assert.equal(expectedPackageRoot(project), "packages/acme/invoice/1.2.0");
});

test("parallel authoring surfaces are rejected", () => {
  const project = parseEdn(`{:hara/type :project
    :hara/version "1.0.0"
    :project/id acme/invoice
    :project/version "1.2.0"
    :project/source-paths [] :project/test-paths [] :project/extension-paths []
    :project/capabilities #{} :project/recipe "other.edn"}`);
  assert.ok(validateProjectManifest(project).some(({ code }) => code === "PROJECT_PARALLEL_MANIFEST_INVALID"));
});
