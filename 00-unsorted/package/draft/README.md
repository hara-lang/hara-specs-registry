# Hara package specification

Status: **draft**
Target version: **0.1.0**

The authoritative document is
[`package-spec.edn`](package-spec.edn). This README is its informative
companion and adds no requirements.

## Purpose

Hara packages are reproducible `.harp` archives. A project declares SemVer
intent in its existing flat `project.edn`; `project.lock.edn` records the exact
Git registry, identity-policy, source, release-asset, and digest choices.

```text
project.edn -> hara package sync -> project.lock.edn
                                   -> verified .harp cache -> read-only roots
```

`require` only reads those mounted roots. It never downloads packages.

## Commands

Package features are part of the bundled `hara` CLI:

```shell
hara package tap add hara --registry github:hara-lang/hara-packages --identity github:hara-lang/hara-identity --identity-key sha256:...
hara package add hara:hara/graph@^1.2.0
hara package sync --frozen
hara package build
hara package inspect graph-1.2.3.harp
```

`hara-compiler` and project IR-to-machine-code compilation are deliberately
outside version one.

## Trust and publication

The official Hara registry is `github:hara-lang/hara-packages`, paired with
`github:hara-lang/hara-identity`, but it is only the default **tap**. Anyone
can operate their own registry/identity pair and users trust it explicitly by
pinning its identity-root public-key fingerprint in their local tap store.
Project dependencies are tap-qualified (`team:owner/name`) so independently
operated registries cannot collide.

A package is verified only when both detached Ed25519 signatures validate
against the lockfile's verified identity-policy revision:

1. the publisher release intent for the coordinate, version, repository ID,
   tag, and commit;
2. the registry-CI attestation for those fields and the final archive digest.

`hara-identity` contains public keys, delegation, validity, revocation, and
CODEOWNERS-governed policy only. Private signing keys never enter Git.

`hara package publish --tap team` requires a signed `v<version>` source tag,
creates canonical intent bytes, invokes the configured external signer, and
submits the signed request as a GitHub pull request. Registry CI rebuilds and
attests the archive independently. Tap registry and identity mirrors can be
used for availability, but only when they yield the same pinned verified data.

## Operating a tap

`tap init` creates a local registry/identity repository pair and installs that
pair as the creator's trusted tap. The root public key is supplied explicitly;
the configured external signer signs the initial policy. The command cannot
generate or store a private key.

```shell
export HARA_SIGNER=/path/to/identity-signer
hara package tap init acme \
  --registry ./acme-packages \
  --identity ./acme-identity \
  --identity-root-key <32-byte-ed25519-public-key-as-hex>
```

It prints the identity-root fingerprint. Share that fingerprint independently
with users; they use it with `tap add`. Commit the scaffolds to separately
protected Git repositories, configure the generated request workflow with a
pinned Hara registry verifier, and keep CI publishing/signing credentials in
a distinct protected job.

See [Operating federated taps](taps.md) for the lifecycle and trust model.

The bundled CLI also has one deliberately narrow bootstrap profile:

```shell
hara package tap bootstrap hara
hara package tap mirror add hara --registry https://mirror.example.org/hara-packages.git
```

This installs the canonical Hara GitHub repositories in GitHub-governed
bootstrap mode. It does not make arbitrary Git URLs trusted: other taps retain
the pinned root-key path. The API at `api.hara-lang.org` is advisory read-only
discovery/cache infrastructure; lockfiles and Git commits remain authoritative.

## Archives and browser hosts

Archives have deterministic ZIP-compatible layout, generated `package.edn`,
and a tree digest. HAL, HIR, resources, extension descriptors, WASM, and HTA
assets are verified before mounting. Browser hosts perform resolution and
digest-addressed caching before starting the WASM runtime; the evaluator itself
has no package-network authority.

See the non-normative [GitHub architecture](architecture.md) for the registry
CI and service layout.
