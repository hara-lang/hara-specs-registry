# Full corpus import trigger

Import the complete specification corpus from `hara-lang/hara-specs@dc269add5de05d06ddf215ca9f1d2d2b0c49f135`.

The base-branch workflow validates the source manifest, generates the canonical registry index, runs all registry tests and checks, removes its one-time machinery, and constructs the resulting commit with the source commit as a second Git parent.
