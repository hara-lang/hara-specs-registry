# Hara specifications registry

`hara-lang/hara-specs-registry` is the canonical, Git-authoritative home for Hara specification documents and specification packages.

The repository stores normative specification bytes, rendered documentation, package manifests, provenance, and the committed `registry-index.json` consumed by `specs.hara-lang.io`.

## Repository boundary

| Repository | Responsibility |
| --- | --- |
| `hara-lang/hara-specs-registry` | Specification source, package versions, fixtures, provenance, validation, and the registry index. |
| `hara-lang/hara-specs` | Netlify UI and API, publishing management, document checking, reports, and Hara kernel adapters. |

The management service does not silently become the authority for specification content. Source links and conformity reports identify a repository, revision, and path.

## Initial cutover

The first cutover is recorded against `hara-lang/hara-specs@dc269add5de05d06ddf215ca9f1d2d2b0c49f135`.

Three specifications are fully materialized here:

- the Hara metaspecification metaspecification;
- the HAL data language specification;
- the built-in protocol specification.

The larger Hara CLI document remains an immutable pinned-source entry during this migration step. Its exact source repository, commit, path, and blob identity are recorded in `registry-index.json`, `spec-manifest.json`, and `02-platform/000001-cli/draft/MIGRATION.edn`. It must be materialized byte-for-byte before the provisional record is removed.

## Specification packages

New package-shaped specifications live under:

```text
packages/<scope>/<name>/<version>/
  hara.package.json
  spec/
  profiles/
  fixtures/
  tests/
```

Published version directories are immutable. Corrections are released as new versions; old versions may be deprecated or yanked through metadata, but their bytes are not replaced.

The bootstrap package schema is in [`schema/hara-spec-package.schema.json`](schema/hara-spec-package.schema.json).

## Registry contracts

- `spec-manifest.json` inventories tracked files and migration provenance.
- `registry-index.json` is the public catalogue consumed by the service.
- `scripts/validate-registry.mjs` validates paths, files, and package coordinates.
- `scripts/check-index.mjs` verifies catalogue identities, source locations, materialization states, and summary totals.

```sh
npm test
npm run build
npm run check
```

## Publishing model

The first publishing transport is pull-request based. The management service validates and assembles a package, then proposes a path-scoped change here. Publisher identity, namespace ownership, signatures, immutable versions, and conformance fixtures are checked before merge.
