# Clojure and Foundation migration

Status: **draft**

This specification is consumed directly by `tool.migrate`. It owns migration
policy and promotion evidence; implementations own only deterministic matching,
rewriting, staging, and verification.

The `std.lib.resource` target uses catalog-selected semantic recipes to generate
`std.context.resource` and its focused test without editing the Foundation
source or test. The promoted pair exposes `spec-*` and `variant-*` for catalog
management and `resource-*` for resource lifecycle/access, uses native `swap!`
for ordinary atom updates, and uses `std.foundation/swap-return!` only when an
atomic update must also return a value.

`std.lib.context.registry` and `std.lib.context.space` follow the same
source/test-pair workflow. Their catalog recipes generate
`std.context.registry` and `std.context.space`; the latter uses the native
`Space` struct.
