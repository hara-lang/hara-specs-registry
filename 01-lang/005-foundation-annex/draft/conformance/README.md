# Foundation library conformance

This directory is the only source of truth for cross-runtime conformance of
Foundation-origin libraries.

`libraries/index.edn` is the registry manifest. Each full-path family has two
documents beneath the family directory:

- `origin.edn` records the pinned Foundation source namespace and original test
  paths and external `clojure.*` dependency observations with complete
  extraction accounting. It is provenance, not a Hara expectation.
- `conformance.edn` is the reviewed Hara contract. It names the Hara target
  namespaces, reviewed external dependency dispositions, and the Hara test
  files that every runtime adapter must execute.
- `metadata.edn` records the exact source pins, source/test pairs, and generated
  artifact digests used to detect publication drift.

Family directories use the complete path identifier (`std_lib_zip`,
`std_block`, `std_lib_project`, and so on). Runtime adapters must consume the
manifest and contract paths; per-namespace probes and hand-maintained runtime
lists are not part of this protocol.
