# HAL bytecode VM runtime specification

Status: **draft**

Target version: **alpha**

The authoritative contract is the document set:

- [`hal-bytecode-vm.edn`](hal-bytecode-vm.edn) — staged Rust VM core,
  instructions, frames, globals, artifacts, validation, and synchronous
  execution semantics;
- [`hal-bytecode-vm-suspension.edn`](hal-bytecode-vm-suspension.edn) — the
  process-local suspension extension for `await`, `yield`, async result
  Promises, cancellation, exception resumption, and host interop.

The suspension extension supersedes the base document's stale future note
where the implemented `Await` and `Yield` behavior is concerned. It does not
turn a parked machine into a portable or durable artifact.

## Scope

This specification defines the experimental, staged bytecode VM for the Rust
runtime (issues #195/#202/#223/#204), behind the `bytecode-vm` Cargo feature:

- the parse → compile → validate → execute pipeline for an operand-stack
  machine with explicit call frames;
- the typed instruction set, program and function representation, and the
  validation rules every program must pass before execution;
- lexical slot allocation and `loop`/`recur` lowering;
- function values, by-value captures as prefixed slots, direct and static
  calls, variadic functions, and named multi-arity `defn` dispatch;
- registry-direct global Vars, namespace-owned mutation, and loader-owned
  namespace/module forms;
- persistent `defstruct` and reference-identity `defmutable` definitions,
  same-unit constructor visibility, and dedicated mutable field read/write
  instructions;
- append-only HBC0 opcode compatibility, including retired-opcode
  rebuild-required diagnostics;
- process-local parking and resumption of the complete machine at `Await` and
  `Yield` boundaries;
- async bytecode functions that return stable result Promises and propagate
  cancellation to a pending host Promise;
- coexistence with the tree-walking evaluator: the VM never silently falls
  back to it.

Namespace syntax and module loading are owned by the language and runtime
loader specifications. The VM documents their bytecode boundary and uses the
shared module corpus for cross-runtime behavior.

Suspended machines are intentionally process-local. HALC and HBC0 remain
portable compiled-form and bytecode artifacts; neither format contains live
Promises, provider callbacks, scheduler references, or JavaScript Promise
identity.

## Executable evidence

[`conformance/bytecode-vm.edn`](conformance/bytecode-vm.edn) is the core
machine-checked corpus, consumed by `rust/src/vm/conformance_tests.rs`.
`:display` and `:error-category` cases must agree on both evaluators;
`:compile-error` cases pin VM-only lowering boundaries. The corpus also pins
named-value constructor visibility, mutable identity, alias-visible writes,
return values, and field-place evaluation order. Namespace, reload, and
callable-Var cases live in the shared platform-language modules corpus.

[`conformance/bytecode-vm-suspension.edn`](conformance/bytecode-vm-suspension.edn)
defines the host-driven suspension matrix. It covers settled and pending
`await`, fulfilled and rejected resumption, nested frames, `finally`,
`yield`/resume values, async result Promises, cancellation propagation, and
native/browser host-Promise lanes. Rust integration and VM unit tests are the
current consumers.
