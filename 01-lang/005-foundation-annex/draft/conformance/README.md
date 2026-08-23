# Foundation library conformance

This directory is the only source of truth for cross-runtime conformance of
Foundation-origin libraries.

`libraries/index.edn` is the registry manifest. Each full-path family has two
documents beneath the family directory:

- `origin.edn` records the pinned Foundation source namespace and original test
  paths. It is provenance, not a Hara expectation.
- `conformance.edn` is the reviewed Hara contract. It names the Hara target
  namespaces and the Hara test files that every runtime adapter must execute.

Family directories use the complete path identifier (`std_lib_zip`,
`std_block`, `std_lib_project`, and so on). Runtime adapters must consume the
manifest and contract paths; per-namespace probes and hand-maintained runtime
lists are not part of this protocol.
