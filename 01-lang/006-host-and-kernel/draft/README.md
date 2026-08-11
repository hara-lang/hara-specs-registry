# Hara host and kernel boundary

Status: **draft**

The authoritative document is
[`host-kernel-spec.edn`](host-kernel-spec.edn). It conforms to the
[`Hara meta-specification meta-spec`](../../000-metaspec/draft/metaspec-metaspec.edn).

This layer owns the runtime authority contract between a Hara evaluator and
its embedding host: kernel and session identity (`[:kernel/id :session/id]`),
capability grant resolution (available = provider-installed, granted = policy
∩ available, deny-by-default), the provider dispatch pipeline
(`resolve-session → require-grant → validate → invoke-provider`), promise
settlement with `:host/*` ex-info codes, session transfer rejection of live
values, and the browser/native embedding wire contracts.

The guest-visible surface is outside this layer. `std.native.Host` and
`std.native.Kernel` descriptors, capability ids, and `:native/*` errors belong
to [003-native](../../003-native/draft/native-spec.edn); the
`std.foundation.host` / `std.foundation.kernel` facades belong to
[005-foundation-annex](../../005-foundation-annex/draft/foundation-annex.edn).
This layer owns what those surfaces enforce — see the `:host-kernel/boundaries`
map in the spec for the full ownership table.

[`session-snapshot-spec.edn`](session-snapshot-spec.edn) defines HSS0 portable
startup images, incremental layers, sealed and overlay restore modes, secret
requirements, and the limits that keep live authority out of snapshots.

It promotes the unsorted
[`host-runtime.edn`](../../../00-unsorted/runtime/draft/host-runtime.edn)
document; once adopted, that file's normative entries live here and the
`HaraHostSessionConformanceTest` spec path should be repointed accordingly.
