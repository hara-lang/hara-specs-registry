# Hara archive package format

A `.harp` file is a deterministic ZIP-compatible container with canonical
`package.edn` at its root. It is verified completely before entering a
content-addressed cache or becoming visible to a runtime.
