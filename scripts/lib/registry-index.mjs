import crypto from "node:crypto";
import path from "node:path";

const COMPATIBILITY = new Map([
  ["hara/metaspec-metaspec", {
    aliases: ["hal/metaspec"],
    legacySlugs: ["hal-metaspec"]
  }]
]);

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

const versionParts = (value) => {
  const match = String(value || "").match(/^(\d+)\.(\d+)\.(\d+)(?:[-+](.*))?$/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] ? 0 : 1, match[4] || ""] : [0, 0, 0, 0, String(value || "")];
};

const compareVersion = (left, right) => {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < 4; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return String(a[4]).localeCompare(String(b[4]));
};

const statusRank = (value) => ({ stable: 6, ready: 5, candidate: 4, draft: 3, deprecated: 2, unclassified: 1 }[value] || 0);
const layerRank = (filePath) => filePath.startsWith("01-lang/") || filePath.startsWith("02-platform/") ? 3 : filePath.startsWith("00-unsorted/") ? 2 : 1;

const documentationPathFor = (sourcePath, manifestPaths) => {
  const directory = path.posix.dirname(sourcePath);
  const candidates = [
    `${directory}/README.md`,
    `${path.posix.dirname(directory)}/README.md`,
    `${sourcePath.split("/")[0]}/README.md`
  ];
  return candidates.find((candidate) => manifestPaths.has(candidate)) || sourcePath;
};

export function parseSpecDocument(source, file, manifestPaths = new Set()) {
  const id = captureKeyword(source, ":document/id") || captureKeyword(source, ":spec/id");
  if (!id) return null;

  const title = captureString(source, ":document/title") || captureString(source, ":spec/title") || titleFromPath(file.path);
  const summary = captureString(source, ":document/summary") || captureString(source, ":spec/summary") || "No summary has been published for this specification.";
  const version = captureString(source, ":document/version") || captureString(source, ":spec/version") || "0.0.0-draft";
  const status = captureKeyword(source, ":document/status") || captureKeyword(source, ":spec/status") || (file.path.includes("/ready/") ? "ready" : file.path.includes("/draft/") ? "draft" : "unclassified");
  const type = captureKeyword(source, ":document/type") || captureKeyword(source, ":spec/type") || "specification";
  const notationExtension = captureString(source, ":notation/extension");
  const requirements = (source.match(/:requirement\/id\b/g) || []).length;
  const compatibility = COMPATIBILITY.get(id) || {};

  return {
    id,
    slug: slugify(id),
    packageName: `@hara/${slugify(id)}`,
    title,
    summary,
    type,
    version,
    status,
    layer: file.path.split("/")[0] || "root",
    owner: file.owner || "hara-lang",
    classification: file.classification || "hara",
    sourcePath: file.path,
    documentationPath: documentationPathFor(file.path, manifestPaths),
    requirements,
    formats: [mediaTypeForExtension(notationExtension)],
    executable: requirements > 0,
    materialization: "registry",
    ...compatibility
  };
}

const candidateOrder = (left, right) =>
  compareVersion(right.version, left.version)
  || statusRank(right.status) - statusRank(left.status)
  || layerRank(right.sourcePath) - layerRank(left.sourcePath)
  || left.sourcePath.localeCompare(right.sourcePath);

export function selectCanonicalSpecifications(candidates) {
  const byId = new Map();
  for (const candidate of candidates) {
    const group = byId.get(candidate.id) || [];
    group.push(candidate);
    byId.set(candidate.id, group);
  }

  const selected = [];
  for (const group of byId.values()) {
    group.sort(candidateOrder);
    const [canonical, ...alternates] = group;
    selected.push({
      ...canonical,
      ...(alternates.length ? {
        alternateSources: alternates.map(({ version, status, sourcePath }) => ({ version, status, path: sourcePath }))
      } : {})
    });
  }
  return selected.sort((left, right) => left.layer.localeCompare(right.layer) || left.title.localeCompare(right.title) || left.id.localeCompare(right.id));
}

export function createRegistryIndex({
  manifest,
  documents,
  repository = "hara-lang/hara-specs-registry",
  ref = "main",
  manifestPath = "spec-manifest.json",
  migration = null
}) {
  const manifestPaths = new Set((manifest.files || []).map(({ path: filePath }) => filePath));
  const candidates = [];

  for (const file of manifest.files || []) {
    if (file.kind !== "edn") continue;
    if (file.path.startsWith("99-archive/") || file.path.includes("/conformance/")) continue;
    if (!/(?:^|\/)(?:draft|ready|metaspec)(?:\/|$)/.test(file.path)) continue;
    const source = documents.get(file.path);
    if (!source) continue;
    const spec = parseSpecDocument(source, file, manifestPaths);
    if (spec) candidates.push(spec);
  }

  const specs = selectCanonicalSpecifications(candidates).map((spec) => ({
    ...spec,
    source: { repository, ref, path: spec.sourcePath },
    documentation: { repository, ref, path: spec.documentationPath }
  }));

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
      transitional: false,
      ...(migration ? { migration } : {})
    },
    summary: {
      specifications: specs.length,
      draft: specs.filter(({ status }) => status === "draft").length,
      ready: specs.filter(({ status }) => status === "ready" || status === "stable").length,
      executable: specs.filter(({ executable }) => executable).length,
      requirements: specs.reduce((total, { requirements }) => total + requirements, 0),
      materialized: specs.length,
      pinnedSource: 0,
      layers
    },
    specs
  };
}
