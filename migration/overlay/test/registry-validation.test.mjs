import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  expectedPackageRoot,
  safeRegistryPath,
  validateManifest,
  validateManifestFiles,
  validatePackageManifest
} from "../scripts/lib/registry-validation.mjs";

test("registry paths reject traversal and platform separators", () => {
  assert.equal(safeRegistryPath("01-lang/example.edn"), true);
  assert.equal(safeRegistryPath("../secret"), false);
  assert.equal(safeRegistryPath("01-lang\\secret"), false);
  assert.equal(safeRegistryPath("/absolute"), false);
});

test("manifest validation catches duplicate and unsafe paths", () => {
  const findings = validateManifest({
    version: 1,
    files: [
      { path: "spec.edn", kind: "edn" },
      { path: "spec.edn", kind: "edn" },
      { path: "../escape.edn", kind: "edn" }
    ]
  });
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

test("package coordinates map to an immutable version directory", () => {
  const manifest = {
    name: "@acme/invoice",
    version: "1.2.0",
    kind: "hara/spec",
    entry: "spec/main.hal",
    accepts: ["application/json"]
  };
  assert.deepEqual(validatePackageManifest(manifest), []);
  assert.equal(expectedPackageRoot(manifest), "packages/acme/invoice/1.2.0");
});
