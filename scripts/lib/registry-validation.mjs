import fs from "node:fs/promises";
import path from "node:path";
import { parseEdn } from "./edn.mjs";

const SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const COORDINATE = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/;
const FORBIDDEN_PROJECT_KEYS = new Set(["project/recipe", "project/descriptor", "project/extension-manifest"]);

const finding = (code, message, location = null, severity = "error") => ({ code, severity, message, ...(location ? { location } : {}) });
const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);

export function safeRegistryPath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.includes("\\") || value.includes("\0") || path.posix.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value);
  return normalized === value && normalized !== ".." && !normalized.startsWith("../");
}

export function validateManifest(manifest) {
  const findings = [];
  if (!isObject(manifest)) return [finding("MANIFEST_OBJECT_REQUIRED", "spec-manifest.json must contain a JSON object.")];
  if (manifest.version !== 1) findings.push(finding("MANIFEST_VERSION_UNSUPPORTED", "The registry currently requires manifest version 1.", "version"));
  if (!Array.isArray(manifest.files)) {
    findings.push(finding("MANIFEST_FILES_REQUIRED", "The manifest must contain a files array.", "files"));
    return findings;
  }
  const seen = new Set();
  manifest.files.forEach((file, index) => {
    const location = `files[${index}]`;
    if (!isObject(file)) {
      findings.push(finding("MANIFEST_FILE_OBJECT_REQUIRED", "Every manifest file entry must be an object.", location));
      return;
    }
    if (!safeRegistryPath(file.path)) findings.push(finding("MANIFEST_PATH_UNSAFE", "Manifest paths must be normalized relative paths.", `${location}.path`));
    else if (seen.has(file.path)) findings.push(finding("MANIFEST_PATH_DUPLICATE", `The path ${file.path} appears more than once.`, `${location}.path`));
    else seen.add(file.path);
    if (typeof file.kind !== "string" || file.kind.length === 0) findings.push(finding("MANIFEST_KIND_REQUIRED", "Every file entry requires a non-empty kind.", `${location}.kind`));
  });
  return findings;
}

export async function validateManifestFiles(manifest, root) {
  const findings = [];
  for (const [index, file] of (manifest.files || []).entries()) {
    if (!safeRegistryPath(file.path)) continue;
    try {
      const stat = await fs.stat(path.join(root, file.path));
      if (!stat.isFile()) findings.push(finding("MANIFEST_PATH_NOT_FILE", `${file.path} is not a regular file.`, `files[${index}].path`));
    } catch (error) {
      if (error?.code === "ENOENT") findings.push(finding("MANIFEST_FILE_MISSING", `${file.path} does not exist.`, `files[${index}].path`));
      else throw error;
    }
  }
  return findings;
}

const checkPaths = (findings, project, key, required = false) => {
  const value = project[key];
  if (value === undefined && !required) return;
  if (!Array.isArray(value) || value.some((entry) => !safeRegistryPath(entry))) {
    findings.push(finding("PROJECT_PATHS_INVALID", `:${key} must be a vector of safe relative path strings.`, key));
  }
};

export function validateProjectManifest(project) {
  const findings = [];
  if (!isObject(project)) return [finding("PROJECT_OBJECT_REQUIRED", "project.edn must contain an EDN map.")];
  if (project["hara/type"] !== ":project") findings.push(finding("PROJECT_TYPE_INVALID", ":hara/type must be :project.", "hara/type"));
  if (typeof project["hara/version"] !== "string" || project["hara/version"].length === 0) findings.push(finding("PROJECT_SCHEMA_VERSION_INVALID", ":hara/version must be a non-empty string.", "hara/version"));
  if (!COORDINATE.test(String(project["project/id"] || ""))) findings.push(finding("PROJECT_ID_INVALID", ":project/id must use owner/name coordinates.", "project/id"));
  if (!SEMVER.test(String(project["project/version"] || ""))) findings.push(finding("PROJECT_VERSION_INVALID", ":project/version must be SemVer.", "project/version"));
  checkPaths(findings, project, "project/source-paths", true);
  checkPaths(findings, project, "project/test-paths", true);
  checkPaths(findings, project, "project/extension-paths", true);
  checkPaths(findings, project, "project/artifact-paths");
  if (project["project/archive-root"] !== undefined && !safeRegistryPath(project["project/archive-root"])) findings.push(finding("PROJECT_ARCHIVE_ROOT_INVALID", ":project/archive-root must be a safe relative path.", "project/archive-root"));
  if (!Array.isArray(project["project/capabilities"])) findings.push(finding("PROJECT_CAPABILITIES_INVALID", ":project/capabilities must be a set or vector.", "project/capabilities"));
  if (project["project/dependencies"] !== undefined && !isObject(project["project/dependencies"])) findings.push(finding("PROJECT_DEPENDENCIES_INVALID", ":project/dependencies must be a map.", "project/dependencies"));
  if (project["project/extensions"] !== undefined && !isObject(project["project/extensions"])) findings.push(finding("PROJECT_EXTENSIONS_INVALID", ":project/extensions must be a map keyed by namespace.", "project/extensions"));
  if (project["project/remote-artifacts"] !== undefined && !isObject(project["project/remote-artifacts"])) findings.push(finding("PROJECT_REMOTE_ARTIFACTS_INVALID", ":project/remote-artifacts must be a map keyed by install path.", "project/remote-artifacts"));
  for (const key of FORBIDDEN_PROJECT_KEYS) if (Object.hasOwn(project, key)) findings.push(finding("PROJECT_PARALLEL_MANIFEST_INVALID", `:${key} is not part of the single-manifest project contract.`, key));

  for (const [namespace, extension] of Object.entries(project["project/extensions"] || {})) {
    const location = `project/extensions.${namespace}`;
    if (!isObject(extension)) {
      findings.push(finding("EXTENSION_DECLARATION_INVALID", "Each extension declaration must be a map.", location));
      continue;
    }
    if (![":wasm", ":hta"].includes(extension.provider)) findings.push(finding("EXTENSION_PROVIDER_INVALID", ":provider must be :wasm or :hta.", `${location}.provider`));
    if (typeof extension.abi !== "string" || !extension.abi.startsWith(":")) findings.push(finding("EXTENSION_ABI_INVALID", ":abi must be a keyword.", `${location}.abi`));
    if (extension.root !== undefined && !safeRegistryPath(extension.root)) findings.push(finding("EXTENSION_ROOT_INVALID", ":root must be a safe relative path.", `${location}.root`));
    if (extension.module !== undefined && !safeRegistryPath(extension.module)) findings.push(finding("EXTENSION_MODULE_INVALID", ":module must be a safe relative path.", `${location}.module`));
    if (extension.assets !== undefined && (!Array.isArray(extension.assets) || extension.assets.some((entry) => !safeRegistryPath(entry)))) findings.push(finding("EXTENSION_ASSETS_INVALID", ":assets must contain safe relative paths.", `${location}.assets`));
  }

  for (const [installPath, artifact] of Object.entries(project["project/remote-artifacts"] || {})) {
    const location = `project/remote-artifacts.${installPath}`;
    if (!safeRegistryPath(installPath) || !isObject(artifact)) {
      findings.push(finding("REMOTE_ARTIFACT_INVALID", "Remote artifacts require a safe install path and declaration map.", location));
      continue;
    }
    if (typeof artifact.url !== "string" || !artifact.url.startsWith("https://")) findings.push(finding("REMOTE_ARTIFACT_URL_INVALID", ":url must use HTTPS.", `${location}.url`));
    if (!/^sha256:[0-9a-f]{64}$/.test(String(artifact.sha256 || ""))) findings.push(finding("REMOTE_ARTIFACT_HASH_INVALID", ":sha256 must be an exact sha256: digest.", `${location}.sha256`));
    if (!Number.isSafeInteger(artifact.size) || artifact.size < 0) findings.push(finding("REMOTE_ARTIFACT_SIZE_INVALID", ":size must be a non-negative integer.", `${location}.size`));
    if (artifact.policy !== undefined && ![":mirror", ":external"].includes(artifact.policy)) findings.push(finding("REMOTE_ARTIFACT_POLICY_INVALID", ":policy must be :mirror or :external.", `${location}.policy`));
  }
  return findings;
}

export function expectedPackageRoot(project) {
  if (!COORDINATE.test(String(project?.["project/id"] || "")) || !SEMVER.test(String(project?.["project/version"] || ""))) return null;
  const [owner, name] = project["project/id"].split("/");
  return path.posix.join("packages", owner, name, project["project/version"]);
}

export async function findPackageManifests(root) {
  const found = [];
  async function walk(directory) {
    let entries;
    try { entries = await fs.readdir(directory, { withFileTypes: true }); }
    catch (error) { if (error?.code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile() && entry.name === "project.edn") found.push(absolute);
    }
  }
  await walk(path.join(root, "packages"));
  return found.sort();
}

export async function validatePackageAtPath(root, manifestPath) {
  const relative = path.relative(root, manifestPath).split(path.sep).join("/");
  let project;
  try { project = parseEdn(await fs.readFile(manifestPath, "utf8")); }
  catch (error) { return [finding("PROJECT_EDN_INVALID", error instanceof Error ? error.message : "project.edn is invalid.", relative)]; }
  const findings = validateProjectManifest(project).map((entry) => ({ ...entry, location: entry.location ? `${relative}:${entry.location}` : relative }));
  const expected = expectedPackageRoot(project);
  const actual = path.posix.dirname(relative);
  if (expected && expected !== actual) findings.push(finding("PACKAGE_PATH_MISMATCH", `${project["project/id"]}@${project["project/version"]} must be stored at ${expected}, not ${actual}.`, relative));
  return findings;
}
