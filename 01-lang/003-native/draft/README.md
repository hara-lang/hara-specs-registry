# Hara native runtime boundary

Status: **draft**

The authoritative document is
[`native-spec.edn`](native-spec.edn). It conforms to the
[`Hara native-boundary meta-spec`](../metaspec/README.md).

This layer owns 21 guest-visible native descriptors and their canonical
`std.native.Type/method` Vars. It defines capability checks and runtime-profile
parity without exposing general Java, Rust, JavaScript, or host reflection.

HAL wrappers are outside this layer. `std.native.String/trim` belongs here;
`std.foundation.string/trim` belongs to the Foundation annex.
