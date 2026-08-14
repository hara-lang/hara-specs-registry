# Hara source analysis

This draft defines the portable, non-evaluating analysis contract used by
`tool.lint`. The checked-in runtime profile is pinned to version
`alpha`; changing the rules or symbol catalog requires changing the
specification version and regenerating the profile.

The analyzer consumes recovering `std.block` trees, project structure from
`tool.project`, and portable schema relationships and inference from
`std.typed`. `source-analysis.edn` defines analyzer behaviour and finding
requirements; `std-typed.edn` defines the canonical `^{:schema ...}`
grammar, normalization, assignment, project index, precedence, modes, and
cross-runtime parity contract.

Schema metadata is data only. Analysis does not evaluate project code,
instrument runtime calls, expand macros, or load dependency artifacts.

`std.typed` itself consumes ordinary Hara values and forms. Recovering `std.block` trees, source spans, and diagnostics remain responsibilities of source-analysis consumers such as `tool.lint`; they are not portable type-system dependencies.
