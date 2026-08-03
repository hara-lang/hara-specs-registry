# HAL data language specification

Status: **draft**  
Target version: **1.0.0**

The authoritative document is
[`hal-langspec.edn`](hal-langspec.edn). This README is its human-readable
companion and must not introduce requirements absent from the EDN document.
The document conforms to the
[`HAL language metaspec`](../metaspec/README.md).

## Scope

This specification defines the small, host-neutral data language shared by HAL
source and the Hara EDN profile:

- nil and booleans;
- strings and characters;
- symbols and keywords;
- signed 64-bit integers and binary64 floating-point numbers;
- immutable lists, vectors, maps, and sets;
- structural equality, hashing, and metadata;
- UTF-8 reading and canonical readable representations.

It does not define evaluation, functions, bindings, iteration, protocols,
modules, standard libraries, host capabilities, or runtime implementation.
Those contracts belong to the platform layer.

## Executable evidence

[`conformance/reader.edn`](conformance/reader.edn) is the shared reader and
canonical-representation corpus.

The previous broad language and runtime contract is preserved under
[`../../../00-unsorted/platform-language/`](../../../00-unsorted/platform-language/)
until its platform concerns are classified.
