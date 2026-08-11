# Hara source analysis

This draft defines the portable, non-evaluating analysis contract used by
`tool.lint`. The checked-in runtime profile is pinned to version
`0.1.0-draft`; changing the rules or symbol catalog requires changing the
specification version and regenerating the profile.

The analyzer consumes recovering `std.block` trees, project structure from
`tool.project`, and portable type relationships from `std.typed.schema`.
