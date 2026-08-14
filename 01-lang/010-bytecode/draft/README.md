# HAL bytecode VM runtime specification

Status: **draft**

Target version: **0.3.0**

The authoritative document is
[`hal-bytecode-vm.edn`](hal-bytecode-vm.edn). This README is its human-readable
companion and must not introduce requirements absent from the EDN document.

## Scope

This specification defines the experimental, staged bytecode VM for the Rust
runtime (issues #195/#202), behind the non-default `bytecode-vm` Cargo
feature:

- the parse → compile → validate → execute pipeline for a synchronous
  operand-stack machine;
- the typed instruction set, program and function representation, and the
  validation rules every program must pass before execution;
- lexical slot allocation and `loop`/`recur` lowering;
- function values, by-value captures as prefixed slots, direct and static
  calls, and `defn` lowering to direct bindings;
- persistent `defstruct` and reference-identity `defmutable` definitions,
  same-unit constructor visibility, and dedicated mutable field read/write
  instructions;
- append-only HBC0 opcode compatibility, including the retired opcode 21
  rebuild-required diagnostic;
- namespace-owned callable Vars, protected referrals, and `declare` as
  forward visibility only;
- coexistence with the tree-walking evaluator: the VM never replaces it and
  never falls back to it.

It does not define suspension. Namespace syntax and module loading are owned
by the language specification; this VM spec defines their bytecode boundary
and points to the shared module corpus for cross-runtime behavior.

## Executable evidence

[`conformance/bytecode-vm.edn`](conformance/bytecode-vm.edn) is the
machine-checked corpus, consumed by `rust/src/vm/conformance_tests.rs`.
`:display` and `:error-category` cases must agree on both evaluators;
`:compile-error` cases pin VM-only lowering boundaries. The corpus also pins
`defstruct`/`defmutable` constructor visibility, mutable identity, alias-visible
writes, return values, and field-place evaluation order. Namespace, reload, and
callable-Var cases live in the shared platform-language modules corpus.
