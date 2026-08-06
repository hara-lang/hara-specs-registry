# Specification packages

Versioned specification packages use the normal Hara project contract:

```text
packages/<owner>/<name>/<version>/
  project.edn
  project.lock.edn
  src/
  tests/
  fixtures/
  profiles/
```

`project.edn` is the only authored manifest. The registry validates its coordinate and version against the directory path. Reconciliation generates `project.lock.edn`; publication generates a `.harp` whose root `package.edn` indexes the exact immutable bytes.
