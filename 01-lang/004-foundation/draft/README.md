# Hara Foundation bootstrap namespace

Status: **draft**

The authoritative document is
[`foundation-spec.edn`](foundation-spec.edn). It conforms to the
[`Hara Foundation meta-spec`](../metaspec/README.md).

This layer owns the root `std.foundation` namespace:

- automatic referral and blank namespaces;
- `:builtins` and `:intrinsics` configuration;
- protocol and native-type aliases;
- portable root functions and macros;
- narrow evaluator-backed primitives;
- public metadata and return-value boundaries.

It specifies wrappers, not the facilities they wrap. Protocol dispatch belongs
to `002-protocol`, native method behavior belongs to `003-native`, and
qualified libraries belong to `005-foundation-annex`.

The surface catalog is a draft baseline. Candidate promotion requires an exact
fresh-context `ns-publics` comparison for JVM, Rust, and Wasm.
