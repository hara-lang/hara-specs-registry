# Contributing specifications

Changes to the Hara specification registry are reviewed as source and provenance changes, not as website edits.

## Existing documents

Keep authoritative EDN documents and their adjacent human-readable `README.md` files together. When adding or moving a tracked document, update `spec-manifest.json` and regenerate `registry-index.json`.

## Package releases

A package release uses this path:

```text
packages/<scope>/<name>/<version>/hara.package.json
```

For package name `@acme/invoice` version `1.2.0`, the release root is:

```text
packages/acme/invoice/1.2.0/
```

A version directory is immutable after merge. Publish another semantic version rather than editing or deleting an existing release.

Every package should include positive and negative fixtures, a licence, and a capability declaration. Packages are pure and network-free unless a reviewed adapter explicitly declares otherwise.

## Required checks

Run:

```sh
npm test
npm run check
```

Pull requests must keep `registry-index.json` in sync and must not introduce absolute paths, traversal segments, duplicate manifest paths, missing source files, or malformed package coordinates.
