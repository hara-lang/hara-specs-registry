# Versioned specification packages

Package releases are stored as `packages/<scope>/<name>/<version>/`.

The directory for `@acme/invoice@1.2.0` is `packages/acme/invoice/1.2.0/`. It contains `hara.package.json` and every source, profile, fixture, test, licence, and normative document required to reproduce the release.

Merged version directories are immutable. Mutable channels such as `stable` or `next` belong in signed registry metadata and point to immutable versions; they do not replace version bytes.
