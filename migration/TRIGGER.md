# Registry bootstrap trigger

This temporary pull request triggers the guarded history import from `hara-lang/hara-specs` at `dc269add5de05d06ddf215ca9f1d2d2b0c49f135`.

The bootstrap validates the imported corpus, generates `registry-index.json`, runs the registry tests, and replaces this temporary seed only when `main` still matches the lease captured at the start of the workflow.
