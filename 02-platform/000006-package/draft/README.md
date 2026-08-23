# Hara project and package contract

The authoritative document is [`hara-package.edn`](hara-package.edn).
`project.edn` is the single contributor-authored manifest. Reconciliation
generates `project.lock.edn`; package building generates the root `package.edn`
inside a deterministic `.harp`.

## Wasm imports and host flavors

Package metadata separates portable Wasm modules from host-native artifacts.
`:wasm-imports` contains the digest-bound Wasm modules that every host may
load through `(:import ...)`. `:flavors` contains host implementations such as
`:jvm` and `:dotnet`; `:wasm` is not a flavor. Host class or type imports are
written inside the matching flavor clause, for example
`(:flavor :jvm [java.lang String])`.

## Runtime-aware projects

Projects may declare orthogonal `:project/runtime-profiles` for `:jvm` and
`:rust`. The executing host selects its own profile automatically; build
profiles under `:project/profiles` remain an independent concern.

An effective runtime project is formed from the shared project paths and Hara
package dependencies plus the selected runtime profile's additions. JVM
profiles additionally own Maven dependencies, Java source roots, and a class
target. Rust profiles may own Hara packages that carry WASM extensions.

The contract hard-cuts the former top-level `:jvm/source-paths`,
`:jvm/dependencies`, and `:jvm/target-path` keys. Validators report the
corresponding `:project/runtime-profiles :jvm` replacement.

[`conformance/projects.edn`](conformance/projects.edn) contains the shared
normalization and rejection corpus intended for HAL, Rust, and JVM project
loaders.

## Published typed-schema catalogs

An archive may declare one published typed-schema catalog in `package.edn`:

```edn
:schema/catalog {:format "std.typed.catalog/1"
                 :path "catalog/std-typed-catalog.json"
                 :sha256 "sha256:<digest>"}
```

The path and digest must also occur in `:files`. The package builder and every
package reader pass the complete catalog bytes to Hara's canonical
`std.typed.catalog.document` verifier before the archive can be built,
published, installed, activated, or used for provider registration. The
registry owns the descriptor and provenance contract; Hara owns catalog
normalization, hashes, dependency closure, components, and deterministic
verification reports. Omitting `:schema/catalog` is valid for packages that
do not publish a typed-schema catalog.
