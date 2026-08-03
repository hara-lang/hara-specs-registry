# Hara platform specifications

Platform specifications define host-facing contracts above the core HAL data
and reader layer. They cover executable tools, runtime services, packaging, and
other interfaces that must remain portable across supported Hara runtimes.

## Specifications

- [`000001-cli`](000001-cli/) — deterministic command-line applications,
  routing, options, handlers, outcomes, and the public Hara CLI contract.
- [`000002-tap`](000002-tap/) — federated Git-authoritative tap trust,
  discovery, roles, and the shared tap protocol metaspec.
- [`000003-identity`](000003-identity/) — root policy, GitHub enrollment,
  publisher keys, namespace grants, delegation, and revocation.
- [`000004-artifact`](000004-artifact/) — immutable digest-addressed objects,
  manifests, provenance, and registry attestations.
- [`000005-harp`](000005-harp/) — deterministic safe package archives and
  read-only mounting.
- [`000006-package`](000006-package/) — coordinates, projects, lockfiles,
  resolution, releases, installation, and yanking.
- [`000007-extension`](000007-extension/) — extension descriptors, providers,
  ABI, capabilities, and package specialization.
- [`000008-asset`](000008-asset/) — versioned file, image, video, and 3D
  collections with deterministic derivatives.
- [`000009-publishing`](000009-publishing/) — signed intake, isolated builds,
  protected finalization, and accepted Git records.
- [`000010-distribution`](000010-distribution/) — exact release resolution,
  immutable downloads, verification, caches, and offline operation.
- [`000011-mirroring`](000011-mirroring/) — exact registry and object
  replication, divergence rejection, failover, and repair.
- [`000050-transport-hta`](000050-transport-hta/) — the Hara transport ABI
  extension boundary.
- [`000051-transport-resp`](000051-transport-resp/) — the RESP
  evaluation-broker transport.
- [`000060-substrate-base`](000060-substrate-base/) — source authority,
  namespace topology, and fidelity rules for the existing `xt.substrate`.
- [`000061-substrate-frame`](000061-substrate-frame/) — XTalk NodeFrame
  constructors, five frame kinds, validation, normalization, and JSON.
- [`000062-substrate-node`](000062-substrate-node/) — mutable EventNode and
  NodeSpace records, construction, configuration, and state operations.
- [`000063-substrate-service`](000063-substrate-service/) — the arbitrary-value
  EventNode service registry and built-in utility handlers.
- [`000064-substrate-request`](000064-substrate-request/) — handlers,
  promise normalization, pending entries, routing, and settlement.
- [`000065-substrate-stream-router`](000065-substrate-stream-router/) —
  XTalk triggers, router maps, subscriptions, control frames, and fan-out.
- [`000066-substrate-transport`](000066-substrate-transport/) — NodeTransport
  plus memory, browser, worker, MessagePort, and WebSocket adapters.
- [`000067-substrate-page-model`](000067-substrate-page-model/) — the XTalk
  per-space page runtime, model pipelines, dependencies, and throttling.
- [`000068-substrate-view-proxy`](000068-substrate-view-proxy/) — the exact
  XTalk view IR, catalog, subscriptions, demos, and page proxy.
- [`000069-substrate-runtime-profiles`](000069-substrate-runtime-profiles/) —
  generated-runtime coverage reported by the pinned XTalk tests.
- [`000100-lsp-base`](000100-lsp-base/) — the portable Language Server
  Protocol profile, shared analysis facts, IDE capabilities, and safety rules.

Material that has not yet been assigned a numbered platform specification
remains under [`../00-unsorted/`](../00-unsorted/).
