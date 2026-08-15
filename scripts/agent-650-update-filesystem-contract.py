#!/usr/bin/env python3
"""Update the Studio runtime's mounted filesystem contract for hara#650."""

from pathlib import Path


SPEC = Path("00-unsorted/runtime/draft/studio-runtime.edn")


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise SystemExit(f"{label} marker not found")
    return source.replace(old, new, 1)


def main() -> None:
    source = SPEC.read_text(encoding="utf-8")

    old_provider = '''  :operations [:resolve :read :write :exists :list :mkdir :delete]
  :browser
  {:ephemeral :session-lifetime-memory
   :persistent :explicit-keyed-indexeddb}
  :native :host-confined-provider
  :reattach
  {:precondition
   :no-active-evaluations-tasks-document-generations-or-pending-host-calls
   :busy-error "SESSION_BUSY"
   :validation :before-attachment-change
   :failure :atomic
   :success
   [:preserve-session-id :preserve-language-state :preserve-project-cache
    :detach-previous-mount :attach-new-mount]}
  :lifetime
  {:close-precondition :attachment-count-zero
   :attached-error "FILESYSTEM_ATTACHED"
   :session-close :detach-and-decrement
   :kernel-close :close-all-registrations
   :persistent-data-delete false}
  :hal-api :std.foundation.file
  :removed-compatibility [:studio.fs :studio.space]
  :generic-store-role :non-filesystem-key-value-data}'''

    new_provider = '''  :logical-paths
  {:root "/"
   :root-means :mounted-provider-root
   :relative-input :accepted-and-resolved-from-root
   :observable-form :canonical-absolute-logical-path
   :separator "/"
   :normalization [:collapse-duplicate-separators :remove-dot-segments :resolve-dot-dot]
   :reject [:escape-above-root :tilde-expansion :host-working-directory
            :windows-drive :host-specific-separator]
   :host-path-conversion :provider-boundary-only}
  :effect-contract
  {:valid-call :returns-promise
   :argument-and-type-errors :synchronous
   :capability-and-filesystem-failures :promise-rejection
   :exists-not-found false
   :exists-other-failure :promise-rejection}
  :operations
  [:read :write :exists? :stat :entries :list :walk :mkdir :delete
   :copy :move :temp-file :temp-directory]
  :entry-metadata
  {:required [:path :name :type :size :modified-at :extensions]
   :path :canonical-absolute-logical-path
   :type [:file :directory :symlink :other]
   :size :regular-file-byte-count-or-nil
   :modified-at :unix-epoch-milliseconds
   :extensions :provider-extension-map
   :follow-symbolic-links false}
  :options
  {:write {:mode [:create :replace :append] :parents? false}
   :mkdir {:parents? true :exists-ok? true}
   :delete {:missing-ok? false}
   :copy {:replace? false :parents? false :preserve-modified? false}
   :move {:replace? false :parents? false :atomic? false}
   :temp-file {:prefix "tmp" :suffix ""}
   :temp-directory {:prefix "tmp"}}
  :stable-errors
  [:file/not-found :file/already-exists :file/invalid-path :file/outside-root
   :file/not-directory :file/is-directory :file/directory-not-empty
   :file/permission-denied :file/unsupported :file/io]
  :results
  {:simple-mutation :canonical-logical-path
   :recursive-copy :source-to-target-map
   :recursive-delete :post-order-deleted-path-vector
   :recursive-failure :reject-immediately-without-rollback-or-partial-success}
  :no-follow
  {:metadata true
   :entries true
   :walk true
   :recursive-copy true
   :recursive-delete true
   :symlink-escape :rejected}
  :browser
  {:ephemeral :session-lifetime-memory
   :persistent :explicit-keyed-indexeddb}
  :native :host-confined-provider
  :reattach
  {:precondition
   :no-active-evaluations-tasks-document-generations-or-pending-host-calls
   :busy-error "SESSION_BUSY"
   :validation :before-attachment-change
   :failure :atomic
   :success
   [:preserve-session-id :preserve-language-state :preserve-project-cache
    :detach-previous-mount :attach-new-mount]}
  :lifetime
  {:close-precondition :attachment-count-zero
   :attached-error "FILESYSTEM_ATTACHED"
   :session-close :detach-and-decrement
   :kernel-close :close-all-registrations
   :persistent-data-delete false}
  :hal-api
  {:native-object std.native.File
   :portable-path std.fs.path
   :portable-walk std.fs.walk
   :portable-facade std.fs}
  :compatibility
  {:deprecated-native [:parent :join :resolve :list :walk]
   :removed [:studio.fs :studio.space]}
  :generic-store-role :non-filesystem-key-value-data}'''

    source = replace_once(
        source,
        old_provider,
        new_provider,
        "Studio runtime filesystem provider contract",
    )

    old_conformance = '''  {:id :filesystem/canonical-file-api
   :given [:attached-mount]
   :call
   [:std.foundation.file/resolve :std.foundation.file/read
    :std.foundation.file/write :std.foundation.file/exists?
    :std.foundation.file/list :std.foundation.file/mkdir
    :std.foundation.file/delete]
   :assert :same-observable-results-on-native-and-browser}]'''

    new_conformance = '''  {:id :filesystem/canonical-file-api
   :given [:attached-mount]
   :call
   [File/read File/write File/exists? File/stat File/entries File/list
    File/mkdir File/delete File/copy File/move File/temp-file File/temp-directory
    std.fs/stat std.fs/entries std.fs/exists? std.fs/file? std.fs/directory?
    std.fs/symlink? std.fs/read-bytes std.fs/write-bytes std.fs/create-directory
    std.fs/temp-file std.fs/temp-directory std.fs/copy-single std.fs/copy
    std.fs/copy-into std.fs/move std.fs/delete std.fs.walk/walk]
   :assert
   [:same-observable-results-on-native-and-browser
    :effect-calls-return-promises
    :canonical-logical-result-paths]}
  {:id :filesystem/logical-path-confinement
   :given [:attached-mount]
   :assert
   [:root-is-mounted-root :dot-and-duplicate-separators-collapse
    :dot-dot-cannot-escape-root :host-path-syntax-is-rejected]}
  {:id :filesystem/no-follow
   :given [:directory-tree :symbolic-link-entry :escaping-symbolic-link]
   :assert
   [:metadata-reports-link :entries-do-not-follow :walk-does-not-follow
    :recursive-copy-does-not-follow :recursive-delete-does-not-follow
    :escaping-link-is-denied]}
  {:id :filesystem/deterministic-recursion
   :given [:directory-tree]
   :assert
   [:entries-are-sorted :walk-is-lexical
    :copy-creates-parent-before-children
    :delete-removes-children-before-parent]}
  {:id :filesystem/safe-defaults
   :given [:existing-target :non-empty-directory :missing-entry]
   :assert
   [:write-create-does-not-replace :copy-does-not-replace
    :move-does-not-replace :delete-is-not-recursive
    :missing-delete-rejects-unless-missing-ok]}]'''

    source = replace_once(
        source,
        old_conformance,
        new_conformance,
        "Studio runtime filesystem conformance contract",
    )

    SPEC.write_text(source, encoding="utf-8")


if __name__ == "__main__":
    main()
