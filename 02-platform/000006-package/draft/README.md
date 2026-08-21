# Hara project and package contract

The authoritative document is [`hara-package.edn`](hara-package.edn).
`project.edn` is the single contributor-authored manifest. Reconciliation
generates `project.lock.edn`; package building generates the root `package.edn`
inside a deterministic `.harp`.

## Runtime-aware projects

Projects may declare orthogonal `:project/runtime-profiles` for `:jvm` and
`:rust`. The executing host selects its own project profile automatically;
build profiles under `:project/profiles` remain an independent concern.

An effective runtime project is formed from the shared project paths and Hara
package dependencies plus the selected runtime profile's additions. JVM
profiles additionally own Maven dependencies, Java source roots, and a class
target. Rust profiles may own Hara packages that carry Wasm extensions.

The contract hard-cuts the former top-level `:jvm/source-paths`,
`:jvm/dependencies`, and `:jvm/target-path` keys. Validators report the
corresponding `:project/runtime-profiles :jvm` replacement.

## Prebuilt package variants

The generated `package.edn` may add a top-level `:variants` map to the existing
portable HAL/HIR resources. The only runtime keys are `:jvm` and `:wasm`.
Project profiles and package variants are deliberately different concepts: a
native Rust host uses the `:rust` project profile while producing or consuming
the `:wasm` package variant.

A variant has this shape:

```clojure
{:variant/artifact
 {:artifact/type :jar              ;; :jar for :jvm; :wasm or :hta for :wasm
  :artifact/path "artifacts/provider.jar"
  :artifact/sha256 "sha256:..."
  :artifact/target "java-21"
  :artifact/abi "hara.provider.jvm.v1"
  :artifact/entry-point "example.provider.HaraProvider"}
 :variant/required-capabilities #{:db/connect}
 :variant/host-calls #{}
 :variant/exports #{:provider/open :provider/close}
 :variant/dependencies
 {:maven {org.example/provider-runtime {:version "1.0.0"}}}
 :variant/lifecycle
 {:lifecycle/load :idempotent
  :lifecycle/close :idempotent
  :lifecycle/session-isolation true
  :lifecycle/async false
  :lifecycle/cancellation false}}
```

Every artifact path must name an entry in `:files`, and
`:artifact/sha256` must equal the file entry digest. Packages with any native
variant also record immutable `:repository` and `:commit` values under
`:package :provenance`.

Selection is exact. A JVM host selects only `:jvm`; a Wasm host selects only
`:wasm`. A missing variant is `:package/missing-variant`, never a cross-runtime
fallback. Pure portable packages may omit `:variants` and continue to resolve
without a native artifact.

Installation verifies and extracts bytes only. Target, ABI, capabilities,
host-call allowlists, and artifact digests are checked before any JAR
classloader, Wasm/HTA instance, provider registration, or package code exists.
Consumer installation never invokes Cargo, Maven, `javac`, `rustc`, or another
build tool.

The lifecycle contract requires session isolation, idempotent load and close,
explicit async completion and cancellation for Wasm/HTA, and atomic rollback
after initialization failure. Portable descriptors are ordinary data and may
not contain credentials, classloaders, raw sockets, native pointers, or live
handles.

[`conformance/projects.edn`](conformance/projects.edn) contains the shared
normalization, selection, digest, ABI, target, capability, host-call,
lifecycle, isolation, descriptor, and rejection corpus intended for HAL, Rust,
and JVM package loaders.
