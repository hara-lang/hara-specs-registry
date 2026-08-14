# Hara project and package contract

The authoritative document is [`hara-package.edn`](hara-package.edn).
`project.edn` is the single contributor-authored manifest. Reconciliation
generates `project.lock.edn`; package building generates the root `package.edn`
inside a deterministic `.harp`.

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
