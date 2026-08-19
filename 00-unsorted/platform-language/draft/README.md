# HAL language specification

Status: **draft**  
Target version: **1.0.0**

The authoritative document is
[`hal-langspec.edn`](hal-langspec.edn). This README is its human-readable
companion and must not introduce requirements absent from the EDN document.
The document conforms to the draft
[`HAL language metaspec`](../../../01-lang/001-language/metaspec/README.md).

## Scope

This specification defines the behaviour of HAL (Hara Lisp), a host-neutral
language whose shared reader uses a restricted EDN profile. Hara data continues
to use `.edn`: signed 64-bit integers and binary64 values are the defaults,
explicit arbitrary-precision `N` integers and exact-decimal `M` values are
accepted, and ratios plus unsuffixed integer overflow are rejected. HAL and its EDN profile are defined independently of
evaluator, compiler, storage representation, host language, and target runtime.

The shared reader also accepts HAL program syntax beyond core EDN data:
metadata, regular expressions, symbolic floating-point values, extended-radix
integers, and the quote, syntax-quote, unquote, unquote-splicing, deref, and var
prefixes. Executable HAL source uses `.hal`; data uses `.edn`.

The specification covers the reader, values, evaluation, functions and
bindings, collections and iteration, numbers, errors, protocols and named values,
namespaces and modules, portable standard libraries, and the explicit host
boundary.

Backend storage, compiler implementation, host reflection, target emission,
editor UX, and extension packaging are outside this language document.

## Portable invariants

- **`:hal/portable-semantics`** — observable meaning is established before a
  target runtime or host language is selected.
- **`:hal/persistent-values`** — literal collections remain persistent unless
  an explicit mutable constructor is used.
- **`:hal/named-value-separation`** — `defstruct` is immutable and persistent;
  `defmutable` is fixed-shape, reference-identical, and mutated only through
  `field`/`set!`.
- **`:hal/iterator-first`** — sequence operations use HAL's iterator boundary,
  not a host sequence abstraction.
- **`:sequence/optional-non-empty`** — a `Seq` is a guaranteed non-empty lazy
  cell; `seq` and `rest` return `nil` when no such cell exists.
- **`:iterator/exact-observation`** — `iter-has?` observes and buffers the next
  item without logically consuming it or confusing exhaustion with failure.
- **`:hal/context-local`** — namespace, Var, macro, protocol, module, and
  capability state belongs to a HAL runtime context.
- **`:hal/no-ambient-authority`** — loading code or an extension grants no
  implicit filesystem, network, process, reflection, or compilation authority.

## Specification sections

1. **Source and reader** — immutable forms, reader literals, prefixes,
   diagnostics, delimiters, and readable round-tripping.
2. **Values and truth** — host-neutral value categories, equality, hashing,
   metadata, and the `nil`/`false` truth rule.
3. **Evaluation** — left-to-right invocation, special evaluation, `do`, and
   tail-position `recur`.
4. **Functions and bindings** — lexical closure, arity, destructuring, and
   left-to-right sequential `let` bindings.
5. **Collections and iteration** — persistent updates, collection-family
   preservation, nil-terminated non-empty sequences that are also iterators,
   lazy `cons`, exact iterator observation, non-empty cycles, terminal
   draining, and iterator cleanup.
6. **Numbers** — numeric categories, promotion, ratio-free division, and
   arithmetic errors.
7. **Errors and cleanup** — guest values, catches, `finally`, and source
   diagnostics.
8. **Protocols, named values, and multimethods** — context-local dispatch;
   persistent map-backed `defstruct` values with structural equality; and
   fixed-shape `defmutable` values with reference identity and `field`/`set!`.
   Both definitions install `Name`, `->Name`, and `map->Name` constructors
   before later forms in the same evaluation unit are analysed.
9. **Vars, namespaces, macros, and modules** — live Var identity, compile-time
   expansion, transactional loading, and the reserved `-` alias for the current
   namespace.
10. **Standard libraries** — `std.foundation.edn` provides restricted EDN
    read/write formatting; automatically loaded `std.foundation.json` provides
    JSON read/write formatting; `std.pretty` provides canonical readable
    formatting through `pprint-str`.
11. **Host boundary** — explicit adapters and portable runtime parity.

The authoritative EDN also contains indexed declarations for the core special
forms. Form and requirement identifiers are stable references for conformance
cases and future tooling.

## Migrated executable evidence

- [`../../../01-lang/001-language/draft/conformance/core.edn`](../../../01-lang/001-language/draft/conformance/core.edn) — portable evaluation and runtime
  behaviour.
- [`../../../01-lang/001-language/draft/conformance/reader.edn`](../../../01-lang/001-language/draft/conformance/reader.edn) — reader and canonical
  representation.
- [`../../../01-lang/001-language/draft/conformance/modules.edn`](../../../01-lang/001-language/draft/conformance/modules.edn) — namespace, module,
  lazy-loading, session, and retained-REPL scenarios.
- [`../../../01-lang/001-language/draft/conformance/parity/jvm-truffle.edn`](../../../01-lang/001-language/draft/conformance/parity/jvm-truffle.edn) —
  JVM interpreter/Truffle parity.
- [`../../../01-lang/001-language/draft/conformance/parity/wasm-truffle.edn`](../../../01-lang/001-language/draft/conformance/parity/wasm-truffle.edn) —
  Rust WebAssembly/Truffle parity.

The core-language corpus pins immutable and mutable named-value constructors,
persistent struct updates, mutable alias visibility, and field-place evaluation
order. Coverage is still partial. Host authority, numeric promotion, iterator
closure, error-source behaviour, and standard-library behaviour still need
explicitly linked cases before candidate promotion.
