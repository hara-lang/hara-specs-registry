# Hara self-publishing

Publishers sign immutable recipe intent with external Ed25519 keys. An
unprivileged job builds exact source, while a protected finalizer verifies,
attests, uploads immutable objects, and proposes the accepted Git record.

Publication is automatic after enrollment, but it is not authoritative until
the protected registry change merges.
