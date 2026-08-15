# Hara Foundation annex

<!-- generated from the canonical Hara API manifest; do not edit by hand -->

This annex separates the current portable Foundation API from automatic aliases, native static objects, and historical namespace migrations.

## Pinned source

- Repository: `https://github.com/hara-lang/hara`
- Ref: `209ffd3f8ac596b02290cd73663a75f1918ff436`
- Commit: `209ffd3f8ac596b02290cd73663a75f1918ff436`
- Manifest schema: `2`
- Surface digest: `sha256:8fdb5fafde7b0c29b1a01b2d7f7f9dfae037aa35ac622a9f277840bd4c8db95e`
- Migration digest: `sha256:b82361b350af7af09212597e6ac042767cadf52c6c2964fd67da2063ef868437`

## Current Foundation surface

The root `std.foundation` namespace contains **169** public bindings. It is represented separately from the **5** child namespaces.

| Current child namespace | Alias | Public bindings | Profiles |
| --- | --- | ---: | --- |
| `std.foundation.bytes` | `bytes` | 7 | jvm, rust, wasm |
| `std.foundation.coroutine` | `co` | 7 | jvm, rust, wasm |
| `std.foundation.pretty` | `pretty` | 11 | jvm, rust, wasm |
| `std.foundation.promise` | `promise` | 11 | jvm, rust, wasm |
| `std.foundation.string` | `str` | 42 | jvm, rust, wasm |

Current children contain **78** public bindings in total.

## Native static objects

These runtime objects are recorded separately and do not contribute to the namespace count:

`Arr`, `Bits`, `Bytes`, `Coroutine`, `Crypto`, `Document`, `Edn`, `Error`, `File`, `Host`, `Iter`, `Json`, `Kernel`, `Maths`, `Numbers`, `Obj`, `Printer`, `Promise`, `Regex`, `Runtime`, `Socket`, `String`, `Test`, `UUID`.

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
