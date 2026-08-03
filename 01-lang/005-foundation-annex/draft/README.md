# Hara Foundation library annex

Status: **draft**

The authoritative document is
[`foundation-annex.edn`](foundation-annex.edn). It conforms to the
[`Hara Foundation annex meta-spec`](../metaspec/README.md).

The annex currently declares 13 public libraries:

```text
string  bytes  promise  coroutine  edn  json  set  pretty
file    socket host     kernel     os
```

The first group is portable HAL or a portable native facade. File, socket,
host, kernel, and process operations require explicit authority at invocation.
Requiring their namespaces grants none.

`std.foundation.pretty.engine` is classified as private implementation. A
loadable source namespace is not automatically public API.
