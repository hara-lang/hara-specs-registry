# Hara specifications registry

`hara-lang/hara-specs-registry` is the canonical, Git-authoritative home for Hara specification documents and specification packages.

The repository stores normative specification bytes, rendered documentation, conformance fixtures, provenance, and the generated `registry-index.json` consumed by `specs.hara-lang.io`.

## Repository boundary

| Repository | Responsibility |
| --- | --- |
| `hara-lang/hara-specs-registry` | Specification source, package versions, fixtures, provenance, validation, and the generated registry index. |
| `hara-lang/hara-specs` | Netlify UI and API, publishing management, document checking, reports, and Hara kernel adapters. |

The service never owns canonical specification bytes. Every rendered source link and conformity report identifies this repository and an exact resolved revision.

## Numbered corpus

- `01-lang/` — language, compiler, VM, data structure, and kernel contracts.
- `02-platform/` — tooling, identity, packages, extensions, transport, substrate, and service contracts.
- `00-unsorted/` — specifications awaiting a numbered architectural home.
- `99-archive/` — retained non-package historical evidence.

`spec-manifest.json` inventories the documents. `registry-index.json` is generated deterministically from that inventory and the authoritative EDN sources.

## Specification packages

A specification package uses the same project contract as every Hara package:

```text
packages/<owner>/<name>/<version>/
  project.edn
  project.lock.edn
  src/
  tests/
  fixtures/
  profiles/
```

`project.edn` is the only contributor-authored manifest. It declares identity, version, paths, dependencies, package metadata, builds, extensions, and remote artifacts. `project.lock.edn` is generated during reconciliation. A published `.harp` receives a generated root `package.edn` that indexes its exact bytes.

Published version directories are immutable. Corrections are released as new versions; old versions may be yanked through registry metadata, but their bytes are not replaced.

## Registry contracts

- `spec-manifest.json` inventories tracked specification files.
- `registry-index.json` is the public catalogue consumed by the service.
- `scripts/generate-index.mjs` deterministically derives the catalogue.
- `scripts/validate-registry.mjs` validates paths, files, package projects, and coordinates.
- `scripts/check-index.mjs` verifies catalogue identities, source locations, materialization states, and summary totals.

```sh
npm test
npm run build
npm run check
```

## Publishing model

Publishing is GitHub-governed and pull-request based. The management service authenticates a contributor with GitHub, reads `project.edn` at an exact repository commit, verifies repository authority, builds and attests the deterministic package, and proposes a path-scoped registry change. The registry remains the source of truth for accepted releases.
