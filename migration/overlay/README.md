# Hara specifications registry

`hara-lang/hara-specs-registry` is the canonical, Git-authoritative home for Hara specification documents and specification packages.

The repository stores the normative EDN corpus, rendered documentation, conformance fixtures, package manifests, and the generated registry index consumed by `specs.hara-lang.io`.

## Repository boundary

| Repository | Responsibility |
| --- | --- |
| `hara-lang/hara-specs-registry` | Specification source, package versions, fixtures, provenance, validation, and `registry-index.json`. |
| `hara-lang/hara-specs` | Netlify UI and API, registry management, browser/server checking, reports, and Hara kernel adapters. |

The service never owns the canonical specification bytes. Every rendered source link and conformity report identifies this repository and an exact resolved revision.

## Legacy specification corpus

The numbered source tree is retained as the first registry collection:

- `00-unsorted/` — material awaiting an architectural home
- `01-lang/` — language and kernel contracts
- `02-platform/` — platform, package, transport, tooling, and service contracts
- `99-archive/` — historical material

`spec-manifest.json` enumerates the tracked source documents. `registry-index.json` is the deterministic machine-readable catalogue generated from that manifest and the authoritative EDN documents.

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

## Validation

The registry tooling has no runtime dependencies beyond Node.js 20 or newer.

```sh
npm test
npm run build
npm run check
```

`npm run build` regenerates `registry-index.json`. `npm run check` verifies the manifest, referenced files, package paths, package manifests, and generated index drift.

## Publishing model

The first publishing transport is pull-request based. The management service validates and assembles a package, then proposes a path-scoped change here. Publisher identity, namespace ownership, signatures, immutable versions, and conformance fixtures are checked before merge.
