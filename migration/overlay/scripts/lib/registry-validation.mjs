import fs from "node:fs/promises";
import path from "node:path";

const PACKAGE_KINDS = new Set(["hara/spec", "hara/profile", "hara/rules", "hara/adapter", "hara/dataset"]);
const PACKAGE_NAME = /^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/;
const SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const finding = (code, message, location = null, severity = "error") => ({ code, severity, message, ...(location ? { location } : {}) });

export function safeRegistryPath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.includes("\\") || value.includes("\0") || path.posix.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value);
  return normalized === value && normalized !== ".." && !normalized.startsWith("../");
}

export function validateManifest(manifest) {
  const findings = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return [finding("MANIFEST_OBJECT_REQUIRED", "spec-manifest.json must contain a JSON object.")];
  }
  if (manifest.version !== 1) findings.push(finding("MANIFEST_VERSION_UNSUPPORTED", "The registry currently requires manifest version 1.", "version"));
  if (!Array.isArray(manifest.files)) {
    findings.push(finding("MANIFEST_FILES_REQUIRED", "The manifest must contain a files array.", "files"));
    return findings;
  }

  const seen = new Set();
  manifest.files.forEach((file, index) => {
    const location = `files[${index}]`;
    if (!file || typeof file !== "object" || Array.isArray(file)) {
      findings.push(finding("MANIFEST_FILE_OBJECT_REQUIRED", "Every manifest file entry must be an object.", location));
      return;
    }
    if (!safeRegistryPath(file.path)) {
      findings.push(finding("MANIFEST_PATH_UNSAFE", "Manifest paths must be normalized, relative repository paths without traversal segments.", `${location}.path`));
    } else if (seen.has(file.path)) {
      findings.push(finding("MANIFEST_PATH_DUPLICATE", `The path ${file.path} appears more than once.`, `${location}.path`));
    } else {
      seen.add(file.path);
    }
    if (typeof file.kind !== "string" || file.kind.length === 0) findings.push(finding("MANIFEST_KIND_REQUIRED", "Every file entry requires a non-empty kind.", `${location}.kind`));
    if (file.owner !== undefined && (typeof file.owner !== "string" || file.owner.length === 0)) findings.push(finding("MANIFEST_OWNER_INVALID", "owner must be a non-empty string when supplied.", `${location}.owner`));
  });
  return findings;
}

export async function validateManifestFiles(manifest, root) {
  const findings = [];
  for (const [index, file] of (manifest.files || []).entries()) {
    if (!safeRegistryPath(file.path)) continue;
    const absolute = path.join(root, file.path);
    try {
      const stat = await fs.stat(absolute);
      if (!stat.isFile()) findings.push(finding("MANIFEST_PATH_NOT_FILE", `${file.path} is not a regular file.`, `files[${index}].path`));
    } catch (error) {
      if (error?.code === "ENOENT") findings.push(finding("MANIFEST_FILE_MISSING", `${file.path} does not exist.`, `files[${index}].path`));
      else throw error;
    }
  }
  return findings;
}

export function validatePackageManifest(manifest) {
  const findings = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return [finding("PACKAGE_OBJECT_REQUIRED", "hara.package.json must contain a JSON object.")];
  }
  if (!PACKAGE_NAME.test(manifest.name || "")) findings.push(finding("PACKAGE_NAME_INVALID", "name must use the @scope/name form.", "name"));
  if (!SEMVER.test(manifest.version || "")) findings.push(finding("PACKAGE_VERSION_INVALID", "version must be semantic versioning.", "version"));
  if (!PACKAGE_KINDS.has(manifest.kind)) findings.push(finding("PACKAGE_KIND_INVALID", `kind must be one of ${[...PACKAGE_KINDS].join(", ")}.`, "kind"));
  if (!safeRegistryPath(manifest.entry || "") || !String(manifest.entry || "").endsWith(".hal")) findings.push(finding("PACKAGE_ENTRY_INVALID", "entry must be a safe relative .hal path.", "entry"));
  if (!Array.isArray(manifest.accepts) || manifest.accepts.length === 0 || manifest.accepts.some((value) => typeof value !== "string" || value.length === 0)) findings.push(finding("PACKAGE_ACCEPTS_INVALID", "accepts must be a non-empty array of media types.", "accepts"));
  for (const key of ["profiles", "capabilities"]) {
    if (manifest[key] !== undefined && (!Array.isArray(manifest[key]) || manifest[key].some((value) => typeof value !== "string" || value.length === 0))) findings.push(finding(`PACKAGE_${key.toUpperCase()}_INVALID`, `${key} must be an array of non-empty strings.`, key));
  }
  if (manifest.dependencies !== undefined && (!manifest.dependencies || typeof manifest.dependencies !== "object" || Array.isArray(manifest.dependencies))) findings.push(finding("PACKAGE_DEPENDENCIES_INVALID", "dependencies must be an object.", "dependencies"));
  return findings;
}

export function expectedPackageRoot(manifest) {
  if (!PACKAGE_NAME.test(manifest?.name || "") || !SEMVER.test(manifest?.version || "")) return null;
  const [scope, name] = manifest.name.slice(1).split("/");
  return path.posix.join("packages", scope, name, manifest.version);
}

export async function findPackageManifests(root) {
  const packageRoot = path.join(root, "packages");
  const found = [];

  async function walk(directory) {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile() && entry.name === "hara.package.json") found.push(absolute);
    }
  }

  await walk(packageRoot);
  return found.sort();
}

export async function validatePackageAtPath(root, manifestPath) {
  const relative = path.relative(root, manifestPath).split(path.sep).join("/");
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (error) {
    return [finding("PACKAGE_JSON_INVALID", error instanceof Error ? error.message : "Package manifest is invalid JSON.", relative)];
  }

  const findings = validatePackageManifest(manifest).map((entry) => ({ ...entry, location: entry.location ? `${relative}:${entry.location}` : relative }));
  const expected = expectedPackageRoot(manifest);
  const actual = path.posix.dirname(relative);
  if (expected && expected !== actual) findings.push(finding("PACKAGE_PATH_MISMATCH", `${manifest.name}@${manifest.version} must be stored at ${expected}, not ${actual}.`, relative));

  if (safeRegistryPath(manifest.entry || "")) {
    try {
      const stat = await fs.stat(path.join(path.dirname(manifestPath), manifest.entry));
      if (!stat.isFile()) findings.push(finding("PACKAGE_ENTRY_NOT_FILE", `${manifest.entry} is not a regular file.`, relative));
    } catch (error) {
      if (error?.code === "ENOENT") findings.push(finding("PACKAGE_ENTRY_MISSING", `${manifest.entry} does not exist.`, relative));
      else throw error;
    }
  }
  return findings;
}
