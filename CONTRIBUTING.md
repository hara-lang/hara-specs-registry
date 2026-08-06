# Contributing specifications

Changes to the Hara specification registry are reviewed as source and provenance changes, not as website edits.

## Existing documents

Keep authoritative EDN documents and their adjacent human-readable `README.md` files together. When adding or moving a tracked document, update `spec-manifest.json` and regenerate `registry-index.json`.

## Package releases

A package release uses this path:

```text
packages/<owner>/<name>/<version>/project.edn
```

For package coordinate `acme/invoice` version `1.2.0`, the release root is:

```text
packages/acme/invoice/1.2.0/
```

`project.edn` is the only contributor-authored manifest. It declares project identity, package metadata, paths, dependencies, builds, extensions, capabilities, and remote artifacts. Reconciliation generates `project.lock.edn`; publication generates a deterministic `.harp` whose root `package.edn` indexes the exact immutable bytes.

A version directory is immutable after merge. Publish another semantic version rather than editing or deleting an existing release.

Every package should include positive and negative fixtures, a licence, and an explicit capability declaration. Digest-pinned remote artifacts are resolved before runtime, and official releases mirror required runtime bytes into the archive by default.

## Required checks

Run:

```sh
npm test
npm run build
npm run check
```

Pull requests must keep `registry-index.json` in sync and must not introduce absolute paths, traversal segments, duplicate manifest paths, missing source files, malformed package coordinates, or additional authored manifests.
