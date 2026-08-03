import crypto from "node:crypto";
import path from "node:path";

const unescapeEdnString = (value) => value
  .replace(/\\n/g, "\n")
  .replace(/\\r/g, "\r")
  .replace(/\\t/g, "\t")
  .replace(/\\\"/g, '"')
  .replace(/\\\\/g, "\\");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const captureString = (source, key) => {
  const match = source.match(new RegExp(`${escapeRegExp(key)}\\s+\"((?:[^\"\\\\]|\\\\.)*)\"`));
  return match ? unescapeEdnString(match[1]) : null;
};

const captureKeyword = (source, key) => {
  const match = source.match(new RegExp(`${escapeRegExp(key)}\\s+:([^\\s,}\\]\\)]+)`));
  return match?.[1] ?? null;
};

const slugify = (value) => value
  .replace(/^@/, "")
  .replace(/[/:._]+/g, "-")
  .replace(/[^a-zA-Z0-9-]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .toLowerCase();

const titleFromPath = (filePath) => path.basename(filePath, path.extname(filePath))
  .replace(/[-_]+/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const digest = (value) => `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;

const mediaTypeForExtension = (extension) => {
  switch (extension) {
    case ".json": return "application/json";
    case ".xml": return "application/xml";
    case ".yaml":
    case ".yml": return "application/yaml";
    case ".md": return "text/markdown";
    case ".txt": return "text/plain";
    default: return "application/edn";
  }
};

export function parseSpecDocument(source, file) {
  const id = captureKeyword(source, ":document/id") || captureKeyword(source, ":spec/id");
  if (!id) return null;

  const title = captureString(source, ":document/title") || captureString(source, ":spec/title") || titleFromPath(file.path);
  const summary = captureString(source, ":document/summary") || captureString(source, ":spec/summary") || "No summary has been published for this specification.";
  const version = captureString(source, ":document/version") || captureString(source, ":spec/version") || "0.0.0-draft";
  const status = captureKeyword(source, ":document/status") || captureKeyword(source, ":spec/status") || (file.path.includes("/ready/") ? "ready" : file.path.includes("/draft/") ? "draft" : "unclassified");
  const type = captureKeyword(source, ":document/type") || captureKeyword(source, ":spec/type") || "specification";
  const notationExtension = captureString(source, ":notation/extension");
  const requirements = (source.match(/:requirement\/id\b/g) || []).length;
  const stableId = id;
  const slug = slugify(stableId);
  const sourceDirectory = path.posix.dirname(file.path);
  const documentationDirectory = sourceDirectory.endsWith("/conformance")
    ? path.posix.dirname(sourceDirectory)
    : sourceDirectory;

  return {
    id: stableId,
    slug,
    packageName: `@hara/${slug}`,
    title,
    summary,
    type,
    version,
    status,
    layer: file.path.split("/")[0] || "root",
    owner: file.owner || "hara-lang",
    classification: file.classification || "hara",
    sourcePath: file.path,
    documentationPath: `${documentationDirectory}/README.md`,
    requirements,
    formats: [mediaTypeForExtension(notationExtension)],
    executable: requirements > 0
  };
}

export function createRegistryIndex({
  manifest,
  documents,
  repository = "hara-lang/hara-specs-registry",
  ref = "main",
  manifestPath = "spec-manifest.json"
}) {
  const seen = new Map();
  const specs = [];

  for (const file of manifest.files || []) {
    if (file.kind !== "edn") continue;
    if (file.path.includes("/conformance/")) continue;
    if (!/(?:^|\/)(?:draft|ready|metaspec)(?:\/|$)/.test(file.path)) continue;
    const source = documents.get(file.path);
    if (!source) continue;
    const spec = parseSpecDocument(source, file);
    if (!spec) continue;
    const count = seen.get(spec.slug) || 0;
    seen.set(spec.slug, count + 1);
    if (count) spec.slug = `${spec.slug}-${count + 1}`;
    specs.push(spec);
  }

  specs.sort((left, right) => left.layer.localeCompare(right.layer) || left.title.localeCompare(right.title) || left.sourcePath.localeCompare(right.sourcePath));

  const layers = [...new Set(specs.map(({ layer }) => layer))].sort();
  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
  const catalogueJson = JSON.stringify(specs);

  return {
    schemaVersion: 2,
    source: {
      repository,
      ref,
      manifestPath,
      manifestDigest: digest(manifestJson),
      catalogueDigest: digest(catalogueJson),
      transitional: false
    },
    summary: {
      specifications: specs.length,
      draft: specs.filter(({ status }) => status === "draft").length,
      ready: specs.filter(({ status }) => status === "ready").length,
      executable: specs.filter(({ executable }) => executable).length,
      requirements: specs.reduce((total, { requirements }) => total + requirements, 0),
      layers
    },
    specs
  };
}
