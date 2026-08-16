# Hara Foundation annex

<!-- generated from the canonical Hara API manifest; do not edit by hand -->

This annex separates the current portable Foundation API from automatic aliases, native static objects, and historical namespace migrations.

## Pinned source

- Repository: `https://github.com/hara-lang/hara`
- Ref: `237298a67d74d4530dd73cb3b344d5d270ad2dde`
- Commit: `237298a67d74d4530dd73cb3b344d5d270ad2dde`
- Manifest schema: `2`
- Surface digest: `sha256:b773906f67eed9250920862fa1c66e2a948ad182083e0ce0b78fcd85411f9438`
- Migration digest: `sha256:b82361b350af7af09212597e6ac042767cadf52c6c2964fd67da2063ef868437`

## Current Foundation surface

The root `std.foundation` namespace contains **266** public bindings. It is represented separately from the **5** child namespaces.

| Current child namespace | Alias | Public bindings | Profiles |
| --- | --- | ---: | --- |
| `std.foundation.bytes` | `bytes` | 7 | jvm, rust, wasm |
| `std.foundation.coroutine` | `co` | 7 | jvm, rust, wasm |
| `std.foundation.pretty` | `pretty` | 13 | jvm, rust, wasm |
| `std.foundation.promise` | `promise` | 11 | jvm, rust, wasm |
| `std.foundation.string` | `str` | 42 | jvm, rust, wasm |

Current children contain **80** public bindings in total.

## Native static objects

These runtime objects are recorded separately and do not contribute to the namespace count:

`Algo`, `Arr`, `Base`, `Bits`, `Bytes`, `Coroutine`, `Crypto`, `Document`, `Duplex`, `Edn`, `Env`, `Error`, `File`, `Host`, `Iter`, `Json`, `Kernel`, `Maths`, `Numbers`, `OS`, `Obj`, `Package`, `Printer`, `Process`, `Promise`, `RegExp`, `Result`, `Runtime`, `Schema`, `Socket`, `Stream`, `String`, `Test`, `UUID`.

## Historical migrations

| Former name | Status | Replacement or disposition |
| --- | --- | --- |
| `std.foundation.component` | `moved` | `std.lib.component` (namespace) |
| `std.foundation.crypto` | `moved` | `Crypto` (native-static-object) |
| `std.foundation.edn` | `moved` | `Edn` (native-static-object) |
| `std.foundation.file` | `moved` | `File` (native-static-object) |
| `std.foundation.host` | `moved` | `Host` (native-static-object) |
| `std.foundation.json` | `moved` | `Json` (native-static-object) |
| `std.foundation.kernel` | `moved` | `Kernel` (native-static-object) |
| `std.foundation.os` | `moved` | `OS` (native-static-object) |
| `std.foundation.pretty.engine` | `retired` | `std.foundation.pretty` (namespace) |
| `std.foundation.set` | `moved` | `std.foundation` (namespace-root) |
| `std.foundation.socket` | `moved` | `Socket` (native-static-object) |

Moved and retired names remain available as migration records, but they are not current `std.foundation.*` namespaces.

## Regeneration

Generate both the normative EDN and this README from the same pinned schema-v2 manifest:

```sh
python scripts/generate-foundation-annex.py \
  --input generated/foundation-api-manifest.json \
  --annex-output 01-lang/005-foundation-annex/draft/foundation-annex.edn \
  --readme-output 01-lang/005-foundation-annex/draft/README.md
```

CI must verify the pinned source commit and semantic digests before accepting regenerated output.
