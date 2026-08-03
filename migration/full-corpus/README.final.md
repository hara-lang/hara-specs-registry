# Hara specifications registry

`hara-lang/hara-specs-registry` is the canonical, Git-authoritative home for Hara specification documents and specification packages.

The repository stores normative specification bytes, rendered documentation, conformance fixtures, package manifests, provenance, and the generated `registry-index.json` consumed by `specs.hara-lang.io`.

## Repository boundary

| Repository | Responsibility |
| --- | --- |
| `hara-lang/hara-specs-registry` | Specification source, package versions, fixtures, provenance, validation, and the generated registry index. |
| `hara-lang/hara-specs` | Netlify UI and API, publishing management, document checking, reports, and Hara kernel adapters. |

The service never owns the canonical specification bytes. Every rendered source link and conformity report identifies this repository and an exact resolved revision.

## Migrated corpus

The numbered corpus was imported from `hara-lang/hara-specs@dc269add5de05d06ddf215ca9f1d2d2b0c49f135`:

- `00-unsorted/` — specifications awaiting an architectural home;
- `01-lang/` — language, compiler, VM, data structure, and kernel contracts;
- `02-platform/` — tooling, identity, package, transport, substrate, and service contracts;
- `99-archive/` — historical planning and compatibility evidence.

The full source commit is a second parent of the import commit, preserving its Git history rather than reducing the migration to copied files. [`MIGRATION.edn`](MIGRATION.edn) records the source and method.

`spec-manifest.json` inventories the imported documents. `registry-index.json` is generated deterministically from the manifest and authoritative EDN sources; duplicate historical identities are retained as alternate source locations while the highest-ranked active source becomes the catalogue entry.

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

The package schema is in [`schema/hara-spec-package.schema.json`](schema/hara-spec-package.schema.json).

## Registry contracts

- `spec-manifest.json` inventories tracked specification files.
- `registry-index.json` is the public catalogue consumed by the service.
- `scripts/generate-index.mjs` deterministically derives the catalogue.
- `scripts/validate-registry.mjs` validates paths, files, and package coordinates.
- `scripts/check-index.mjs` verifies catalogue identities, source locations, materialization states, and summary totals.

```sh
npm test
npm run build
npm run check
```

## Publishing model

The first publishing transport is pull-request based. The management service validates and assembles a package, then proposes a path-scoped change here. Publisher identity, namespace ownership, signatures, immutable versions, and conformance fixtures are checked before merge.
