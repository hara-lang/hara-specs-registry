import crypto from "node:crypto";

const HASH = /^sha256:[0-9a-f]{64}$/;
const REVISION = /^[0-9a-f]{40}$/;
const FORMAT = "std.typed.catalog/2";
const HASH_EPOCH = "std.typed.schema/catalog-v2";
const COMPONENT_EPOCH = "std.typed.catalog/component-v2";

const finding = (code, message, location = null) => ({
  code,
  severity: "error",
  message,
  ...(location ? { location } : {})
});

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

const sha256 = (value) => `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
const coordinateKey = (coordinate) => JSON.stringify(coordinate);

const compareCoordinate = (left, right) =>
  left[1].localeCompare(right[1])
  || left[2].localeCompare(right[2]);

const coordinateDisplay = (coordinate) =>
  `[:schema :${coordinate[1]} ${JSON.stringify(coordinate[2])}]`;

const coordinateValid = (coordinate) =>
  Array.isArray(coordinate)
  && coordinate.length === 3
  && coordinate[0] === "schema"
  && typeof coordinate[1] === "string"
  && /^[^/\s:]+\/[^/\s:]+$/.test(coordinate[1])
  && HASH.test(coordinate[2]);

const componentId = (members) => {
  const rendered = members
    .slice()
    .sort(compareCoordinate)
    .map(coordinateDisplay)
    .join(" ");
  return sha256(`[:${COMPONENT_EPOCH} [${rendered}]]`);
};

const canonicalCoordinates = (values) => values.slice().sort(compareCoordinate);
const coordinatesEqual = (left, right) =>
  left.length === right.length
  && left.every((value, index) => coordinateKey(value) === coordinateKey(right[index]));

const componentListCompare = (left, right) => {
  const common = Math.min(left.length, right.length);
  for (let index = 0; index < common; index += 1) {
    const compared = compareCoordinate(left[index], right[index]);
    if (compared !== 0) return compared;
  }
  return left.length - right.length;
};

const stronglyConnectedComponents = (graph, coordinates) => {
  const seen = new Set();
  const order = [];
  const visit = (key) => {
    if (seen.has(key)) return;
    seen.add(key);
    for (const dependency of [...(graph.get(key) || [])].sort()) visit(dependency);
    order.push(key);
  };
  for (const coordinate of coordinates) visit(coordinateKey(coordinate));

  const reverse = new Map(coordinates.map((coordinate) => [coordinateKey(coordinate), new Set()]));
  for (const [key, dependencies] of graph) {
    for (const dependency of dependencies) reverse.get(dependency)?.add(key);
  }

  seen.clear();
  const components = [];
  const collect = (key, members) => {
    if (seen.has(key)) return;
    seen.add(key);
    members.push(key);
    for (const dependent of [...(reverse.get(key) || [])].sort()) collect(dependent, members);
  };
  while (order.length) {
    const key = order.pop();
    if (seen.has(key)) continue;
    const members = [];
    collect(key, members);
    components.push(members.map(JSON.parse).sort(compareCoordinate));
  }
  return components.sort(componentListCompare);
};

const dependencyFirstOrder = (componentGraph) => {
  const graph = new Map([...componentGraph].map(([key, values]) => [key, new Set(values)]));
  const output = [];
  while (graph.size) {
    const ready = [...graph]
      .filter(([, dependencies]) => dependencies.size === 0)
      .map(([key]) => key)
      .sort();
    if (ready.length === 0) return null;
    const readySet = new Set(ready);
    for (const key of ready) graph.delete(key);
    for (const dependencies of graph.values()) {
      for (const key of readySet) dependencies.delete(key);
    }
    output.push(...ready);
  }
  return output;
};

const expectedDocumentDigest = (catalog) => {
  const payload = structuredClone(catalog);
  delete payload["catalog/document-digest"];
  return sha256(stableStringify(payload));
};

export function validateSchemaCatalog(catalog) {
  const findings = [];
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    return [finding("CATALOG_DOCUMENT_INVALID", "Catalog must be a JSON object.")];
  }

  if (catalog["catalog/format"] !== FORMAT) {
    findings.push(finding("CATALOG_FORMAT_INVALID", `Expected ${FORMAT}.`, "catalog/format"));
  }
  if (catalog["catalog/hash-epoch"] !== HASH_EPOCH) {
    findings.push(finding("CATALOG_HASH_EPOCH_INVALID", `Expected ${HASH_EPOCH}.`, "catalog/hash-epoch"));
  }
  if (catalog["catalog/component-epoch"] !== COMPONENT_EPOCH) {
    findings.push(finding("CATALOG_COMPONENT_EPOCH_INVALID", `Expected ${COMPONENT_EPOCH}.`, "catalog/component-epoch"));
  }

  const provenance = catalog["catalog/provenance"];
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) {
    findings.push(finding("CATALOG_PROVENANCE_REQUIRED", "Catalog provenance is required.", "catalog/provenance"));
  } else {
    if (typeof provenance.repository !== "string" || !provenance.repository.includes("/")) {
      findings.push(finding("CATALOG_PROVENANCE_REPOSITORY_INVALID", "Provenance repository must be owner/name.", "catalog/provenance/repository"));
    }
    if (typeof provenance.revision !== "string" || !REVISION.test(provenance.revision)) {
      findings.push(finding("CATALOG_PROVENANCE_REVISION_INVALID", "Provenance revision must be a lowercase 40-character Git commit.", "catalog/provenance/revision"));
    }
    if (!Array.isArray(provenance.sources) || provenance.sources.length === 0 || provenance.sources.some((source) => typeof source !== "string" || !source)) {
      findings.push(finding("CATALOG_PROVENANCE_SOURCES_INVALID", "Provenance sources must be a non-empty string vector.", "catalog/provenance/sources"));
    } else {
      const canonical = [...new Set(provenance.sources)].sort();
      if (JSON.stringify(canonical) !== JSON.stringify(provenance.sources)) {
        findings.push(finding("CATALOG_PROVENANCE_SOURCES_NONCANONICAL", "Provenance sources must be unique and sorted.", "catalog/provenance/sources"));
      }
    }
  }

  const entries = catalog["catalog/entries"];
  if (!Array.isArray(entries) || entries.length === 0) {
    findings.push(finding("CATALOG_ENTRIES_REQUIRED", "Catalog entries must be a non-empty vector.", "catalog/entries"));
    return findings;
  }

  const entryByCoordinate = new Map();
  const identityHashes = new Map();
  const coordinates = [];
  for (const [index, entry] of entries.entries()) {
    const location = `catalog/entries/${index}`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      findings.push(finding("CATALOG_ENTRY_INVALID", "Catalog entry must be an object.", location));
      continue;
    }
    const id = entry["schema/id"];
    const hash = entry["schema/hash"];
    const coordinate = entry["schema/coordinate"];
    if (typeof id !== "string" || !/^[^/\s:]+\/[^/\s:]+$/.test(id)) {
      findings.push(finding("SCHEMA_ID_INVALID", "Schema id must be a qualified keyword name without a leading colon.", `${location}/schema/id`));
    }
    if (Object.hasOwn(entry, "schema/version")) {
      findings.push(finding("SCHEMA_VERSION_FORBIDDEN", "Schema entries must not carry per-entry versions.", `${location}/schema/version`));
    }
    if (typeof hash !== "string" || !HASH.test(hash)) {
      findings.push(finding("SCHEMA_HASH_INVALID", "Schema hash must be canonical lowercase SHA-256.", `${location}/schema/hash`));
    }
    if (!coordinateValid(coordinate)) {
      findings.push(finding("SCHEMA_COORDINATE_INVALID", "Schema coordinate must be [schema, qualified-id, sha256].", `${location}/schema/coordinate`));
      continue;
    }
    if (coordinate[1] !== id || coordinate[2] !== hash) {
      findings.push(finding("SCHEMA_COORDINATE_MISMATCH", "Schema coordinate does not match entry identity.", `${location}/schema/coordinate`));
    }
    if (typeof entry["schema/form"] !== "string" || entry["schema/form"].length === 0) {
      findings.push(finding("SCHEMA_FORM_REQUIRED", "Schema form must be a non-empty HAL/EDN source string.", `${location}/schema/form`));
    }
    if (typeof entry["schema/normal"] !== "string" || entry["schema/normal"].length === 0) {
      findings.push(finding("SCHEMA_NORMAL_REQUIRED", "Normalized schema evidence must be a non-empty HAL/EDN source string.", `${location}/schema/normal`));
    }
    if (!Array.isArray(entry["schema/dependencies"])) {
      findings.push(finding("SCHEMA_DEPENDENCIES_INVALID", "Schema dependencies must be a vector.", `${location}/schema/dependencies`));
    } else {
      const invalid = entry["schema/dependencies"].find((dependency) => !coordinateValid(dependency));
      if (invalid) findings.push(finding("SCHEMA_DEPENDENCY_INVALID", "Schema dependency must be an exact coordinate.", `${location}/schema/dependencies`));
      const canonical = canonicalCoordinates(entry["schema/dependencies"]);
      if (!coordinatesEqual(canonical, entry["schema/dependencies"])) {
        findings.push(finding("SCHEMA_DEPENDENCIES_NONCANONICAL", "Schema dependencies must be unique and sorted.", `${location}/schema/dependencies`));
      }
      if (new Set(entry["schema/dependencies"].map(coordinateKey)).size !== entry["schema/dependencies"].length) {
        findings.push(finding("SCHEMA_DEPENDENCY_DUPLICATE", "Schema dependencies contain a duplicate exact coordinate.", `${location}/schema/dependencies`));
      }
    }

    const key = coordinateKey(coordinate);
    if (entryByCoordinate.has(key)) {
      findings.push(finding("SCHEMA_ENTRY_DUPLICATE", "Catalog contains a duplicate exact entry.", location));
    }
    entryByCoordinate.set(key, entry);
    coordinates.push(coordinate);
    const identity = coordinate[1];
    const previous = identityHashes.get(identity);
    if (previous && previous !== coordinate[2]) {
      findings.push(finding("SCHEMA_IDENTITY_CONFLICT", "One id has conflicting immutable hashes.", location));
    }
    identityHashes.set(identity, coordinate[2]);
  }

  const sortedEntries = entries
    .filter((entry) => coordinateValid(entry?.["schema/coordinate"]))
    .slice()
    .sort((left, right) => compareCoordinate(left["schema/coordinate"], right["schema/coordinate"]));
  if (JSON.stringify(sortedEntries.map((entry) => entry["schema/coordinate"])) !== JSON.stringify(entries.filter((entry) => coordinateValid(entry?.["schema/coordinate"])).map((entry) => entry["schema/coordinate"]))) {
    findings.push(finding("CATALOG_ENTRIES_NONCANONICAL", "Catalog entries must be sorted by exact coordinate.", "catalog/entries"));
  }

  for (const [index, entry] of entries.entries()) {
    if (!Array.isArray(entry?.["schema/dependencies"])) continue;
    for (const dependency of entry["schema/dependencies"]) {
      if (coordinateValid(dependency) && !entryByCoordinate.has(coordinateKey(dependency))) {
        findings.push(finding("SCHEMA_DEPENDENCY_MISSING", `Exact dependency is not published: ${coordinateDisplay(dependency)}.`, `catalog/entries/${index}/schema/dependencies`));
      }
    }
  }

  const graph = new Map();
  for (const coordinate of coordinates.filter(coordinateValid)) {
    const entry = entryByCoordinate.get(coordinateKey(coordinate));
    graph.set(coordinateKey(coordinate), new Set((entry?.["schema/dependencies"] || []).filter(coordinateValid).map(coordinateKey)));
  }
  const computedComponents = stronglyConnectedComponents(graph, coordinates.filter(coordinateValid));

  const components = catalog["catalog/components"];
  if (!Array.isArray(components) || components.length === 0) {
    findings.push(finding("CATALOG_COMPONENTS_REQUIRED", "Catalog components must be a non-empty vector.", "catalog/components"));
    return findings;
  }

  const componentById = new Map();
  const ownerByCoordinate = new Map();
  const declaredMemberVectors = [];
  for (const [index, component] of components.entries()) {
    const location = `catalog/components/${index}`;
    if (!component || typeof component !== "object" || Array.isArray(component)) {
      findings.push(finding("CATALOG_COMPONENT_INVALID", "Catalog component must be an object.", location));
      continue;
    }
    const id = component["component/id"];
    const members = component["component/members"];
    const dependencies = component["component/dependencies"];
    if (typeof id !== "string" || !HASH.test(id)) {
      findings.push(finding("COMPONENT_ID_INVALID", "Component id must be canonical lowercase SHA-256.", `${location}/component/id`));
    }
    if (!Array.isArray(members) || members.length === 0 || members.some((member) => !coordinateValid(member))) {
      findings.push(finding("COMPONENT_MEMBERS_INVALID", "Component members must be a non-empty exact-coordinate vector.", `${location}/component/members`));
      continue;
    }
    const canonicalMembers = canonicalCoordinates(members);
    if (!coordinatesEqual(canonicalMembers, members) || new Set(members.map(coordinateKey)).size !== members.length) {
      findings.push(finding("COMPONENT_MEMBERS_NONCANONICAL", "Component members must be unique and sorted.", `${location}/component/members`));
    }
    const expectedId = componentId(members);
    if (id !== expectedId) {
      findings.push(finding("COMPONENT_ID_MISMATCH", `Component id must be ${expectedId}.`, `${location}/component/id`));
    }
    if (componentById.has(id)) findings.push(finding("COMPONENT_DUPLICATE", "Catalog contains a duplicate component id.", location));
    componentById.set(id, component);
    declaredMemberVectors.push(canonicalMembers);
    for (const member of members) {
      const key = coordinateKey(member);
      if (!entryByCoordinate.has(key)) findings.push(finding("COMPONENT_MEMBER_MISSING", `Component member is not a published entry: ${coordinateDisplay(member)}.`, `${location}/component/members`));
      if (ownerByCoordinate.has(key)) findings.push(finding("COMPONENT_MEMBER_OVERLAP", `Entry belongs to more than one component: ${coordinateDisplay(member)}.`, `${location}/component/members`));
      ownerByCoordinate.set(key, id);
    }
    if (!Array.isArray(dependencies) || dependencies.some((dependency) => typeof dependency !== "string" || !HASH.test(dependency))) {
      findings.push(finding("COMPONENT_DEPENDENCIES_INVALID", "Component dependencies must be a SHA-256 vector.", `${location}/component/dependencies`));
    } else {
      const canonical = [...new Set(dependencies)].sort();
      if (JSON.stringify(canonical) !== JSON.stringify(dependencies)) findings.push(finding("COMPONENT_DEPENDENCIES_NONCANONICAL", "Component dependencies must be unique and sorted.", `${location}/component/dependencies`));
    }
  }

  for (const coordinate of coordinates.filter(coordinateValid)) {
    if (!ownerByCoordinate.has(coordinateKey(coordinate))) findings.push(finding("COMPONENT_EVIDENCE_MISSING", `Published entry has no component evidence: ${coordinateDisplay(coordinate)}.`, "catalog/components"));
  }

  const sortedDeclared = declaredMemberVectors.slice().sort(componentListCompare);
  if (JSON.stringify(sortedDeclared) !== JSON.stringify(computedComponents)) {
    findings.push(finding("COMPONENT_EVIDENCE_MISMATCH", "Declared components do not match the exact dependency graph.", "catalog/components"));
  }

  const expectedComponentDependencies = new Map();
  for (const [id, component] of componentById) {
    const dependencies = new Set();
    for (const member of component["component/members"] || []) {
      const entry = entryByCoordinate.get(coordinateKey(member));
      for (const dependency of entry?.["schema/dependencies"] || []) {
        const owner = ownerByCoordinate.get(coordinateKey(dependency));
        if (owner && owner !== id) dependencies.add(owner);
      }
    }
    expectedComponentDependencies.set(id, [...dependencies].sort());
  }
  for (const [id, component] of componentById) {
    const expected = expectedComponentDependencies.get(id);
    if (JSON.stringify(component["component/dependencies"]) !== JSON.stringify(expected)) {
      findings.push(finding("COMPONENT_DEPENDENCIES_MISMATCH", "Declared component dependencies do not match exact entry edges.", `catalog/components/${id}`));
    }
    for (const dependency of component["component/dependencies"] || []) {
      if (!componentById.has(dependency)) findings.push(finding("COMPONENT_DEPENDENCY_MISSING", `Component dependency is not published: ${dependency}.`, `catalog/components/${id}`));
    }
    const members = component["component/members"] || [];
    const recursive = members.length > 1 || (members.length === 1 && graph.get(coordinateKey(members[0]))?.has(coordinateKey(members[0])));
    if (component["component/recursive?"] !== recursive) {
      findings.push(finding("COMPONENT_RECURSION_MISMATCH", "component/recursive? does not match the exact graph.", `catalog/components/${id}`));
    }
  }

  const componentGraph = new Map([...componentById].map(([id, component]) => [id, new Set(component["component/dependencies"] || [])]));
  const expectedOrder = dependencyFirstOrder(componentGraph);
  const declaredOrder = catalog["catalog/component-order"];
  if (!expectedOrder) {
    findings.push(finding("COMPONENT_GRAPH_CYCLIC", "The condensed component graph contains a cycle.", "catalog/components"));
  } else if (!Array.isArray(declaredOrder) || JSON.stringify(declaredOrder) !== JSON.stringify(expectedOrder)) {
    findings.push(finding("COMPONENT_ORDER_MISMATCH", "catalog/component-order is not the deterministic dependency-first order.", "catalog/component-order"));
  }

  const documentDigest = catalog["catalog/document-digest"];
  const expectedDigest = expectedDocumentDigest(catalog);
  if (documentDigest !== expectedDigest) {
    findings.push(finding("CATALOG_DOCUMENT_DIGEST_MISMATCH", `Catalog document digest must be ${expectedDigest}.`, "catalog/document-digest"));
  }

  return findings;
}

export function assertSchemaCatalog(catalog) {
  const findings = validateSchemaCatalog(catalog);
  if (findings.length) {
    const error = new Error("std.typed catalog fixture is invalid");
    error.findings = findings;
    throw error;
  }
  return catalog;
}

export const schemaCatalogInternals = Object.freeze({
  componentId,
  expectedDocumentDigest,
  stableStringify
});
