from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected one match in {path}, found {count}: {old!r}")
    file.write_text(text.replace(old, new, 1))


readme = Path("02-platform/000006-package/draft/README.md")
readme.write_text("""# Hara project and package contract

The authoritative document is [`hara-package.edn`](hara-package.edn).
`project.edn` is the single contributor-authored manifest. Reconciliation
generates `project.lock.edn`; package building generates the root `package.edn`
inside a deterministic `.harp`.

## Runtime-aware projects

Projects may declare orthogonal `:project/runtime-profiles` for `:jvm` and
`:rust`. The executing host selects its own profile automatically; build
profiles under `:project/profiles` remain an independent concern.

An effective runtime project is formed from the shared project paths and Hara
package dependencies plus the selected runtime profile's additions. JVM
profiles additionally own Maven dependencies, Java source roots, and a class
target. Rust profiles may own Hara packages that carry WASM extensions.

The contract hard-cuts the former top-level `:jvm/source-paths`,
`:jvm/dependencies`, and `:jvm/target-path` keys. Validators report the
corresponding `:project/runtime-profiles :jvm` replacement.

[`conformance/projects.edn`](conformance/projects.edn) contains the shared
normalization and rejection corpus intended for HAL, Rust, and JVM project
loaders.
""")

package = "02-platform/000006-package/draft/hara-package.edn"
replace_once(
    package,
    ":project/main :project/default-profile\n                            :project/profiles :project/artifact-paths",
    ":project/main :project/default-profile\n                            :project/profiles :project/runtime-profiles\n                            :project/artifact-paths",
)
replace_once(
    package,
    ":entity/fields [:lock/format :registries :packages :remote-artifacts]}",
    ":entity/fields [:lock/format :runtime-sections :registries :packages\n                   :remote-artifacts]}",
)
replace_once(
    package,
    "  :project/dependencies {:type :dependency-map}\n  :project/package",
    "  :project/dependencies {:type :dependency-map}\n  :project/runtime-profiles {:type :runtime-profile-map}\n  :project/package",
)
replace_once(
    package,
    "   :operation/failures [:registry-unavailable :version-conflict\n                        :artifact-unavailable :integrity-mismatch]}",
    "   :operation/failures [:registry-unavailable :version-conflict\n                        :runtime-profile-conflict :stale-runtime-lock\n                        :artifact-unavailable :integrity-mismatch]}",
)
replace_once(
    package,
    "  {:requirement/id :hara.package/github-governance\n   :requirement/level :must\n   :requirement/text \"Contributor identity and repository authority are established through GitHub identity and exact repository identifiers; accepted management changes remain Git records.\"}]",
    """  {:requirement/id :hara.package/github-governance
   :requirement/level :must
   :requirement/text \"Contributor identity and repository authority are established through GitHub identity and exact repository identifiers; accepted management changes remain Git records.\"}
  {:requirement/id :hara.package/runtime-profile-shape
   :requirement/level :must
   :requirement/text \"Runtime-specific project intent is declared only below :project/runtime-profiles, keyed by :jvm or :rust, using :runtime/source-paths, :runtime/test-paths, :runtime/extension-paths, :runtime/native-source-paths, :runtime/target-path, and :runtime/dependencies.\"}
  {:requirement/id :hara.package/runtime-profile-auto-selection
   :requirement/level :must
   :requirement/text \"JVM commands select :jvm and native Rust commands select :rust automatically; ordinary commands do not expose a runtime-profile selection flag.\"}
  {:requirement/id :hara.package/runtime-profile-effective-paths
   :requirement/level :must
   :requirement/text \"Effective HAL source, test, and extension roots are the ordered shared roots followed by the selected runtime profile additions; native source roots and target paths belong only to the selected runtime profile.\"}
  {:requirement/id :hara.package/runtime-profile-namespace-isolation
   :requirement/level :must
   :requirement/text \"A namespace may have different implementations in disjoint runtime-only roots, but duplicate declarations within one effective runtime profile are rejected and package resource metadata records runtime ownership.\"}
  {:requirement/id :hara.package/runtime-profile-build-orthogonality
   :requirement/level :must
   :requirement/text \"Build profiles under :project/profiles remain orthogonal to runtime profiles and never select or rewrite :project/runtime-profiles.\"}
  {:requirement/id :hara.package/runtime-profile-legacy-hard-cut
   :requirement/level :must
   :requirement/text \"The top-level :jvm/source-paths, :jvm/dependencies, and :jvm/target-path keys are invalid; diagnostics identify their replacements under :project/runtime-profiles :jvm.\"}
  {:requirement/id :hara.package/runtime-profile-dependency-merge
   :requirement/level :must
   :requirement/text \"Shared :project/dependencies are merged with the selected profile's :hara declarations; conflicting requirements fail closed, Maven versions are exact, and Hara declarations use semantic-version requirements.\"}
  {:requirement/id :hara.package/runtime-profile-lock-sections
   :requirement/level :must
   :requirement/text \"project.lock.edn stores independent runtime-keyed sections with normalized declaration digests and complete exact dependency graphs; synchronizing the active runtime preserves every inactive section atomically.\"}
  {:requirement/id :hara.package/runtime-profile-locked-modes
   :requirement/level :must
   :requirement/text \"Locked and frozen execution reject an absent, stale, incomplete, or manifest-divergent active runtime section, while offline execution performs no network access.\"}
  {:requirement/id :hara.package/runtime-profile-package-mount
   :requirement/level :must
   :requirement/text \"Before evaluation, the active locked graph is mounted read-only; package builds retain shared and runtime-specific resources, profile-scoped indexes, and the exact multi-runtime lockfile.\"}]""",
)

projects = Path("02-platform/000006-package/draft/conformance/projects.edn")
text = projects.read_text()
if not text.endswith("]\n"):
    raise SystemExit("projects.edn did not end with the expected vector terminator")
extra = """ {:case/id :hara.package.case/runtime-profile-jvm
  :case/type :project-runtime-profile
  :case/input
  {:runtime :jvm
   :project
   {:project/source-paths [\"src\"]
    :project/test-paths [\"test\"]
    :project/extension-paths [\"extensions\"]
    :project/dependencies {\"hara:hara/base\" {:version \"^1.0.0\"}}
    :project/runtime-profiles
    {:jvm
     {:runtime/source-paths [\"src-jvm\"]
      :runtime/test-paths [\"test-jvm\"]
      :runtime/extension-paths [\"extensions-jvm\"]
      :runtime/native-source-paths [\"src-java\"]
      :runtime/target-path \"target/jvm/classes\"
      :runtime/dependencies
      {:maven {org.postgresql/postgresql {:version \"42.7.7\"}}}}}}}
  :case/expected
  {:runtime :jvm
   :source-paths [\"src\" \"src-jvm\"]
   :test-paths [\"test\" \"test-jvm\"]
   :extension-paths [\"extensions\" \"extensions-jvm\"]
   :native-source-paths [\"src-java\"]
   :target-path \"target/jvm/classes\"
   :hara-dependencies {\"hara:hara/base\" {:version \"^1.0.0\"}}
   :maven-dependencies {org.postgresql/postgresql {:version \"42.7.7\"}}}}
 {:case/id :hara.package.case/runtime-profile-rust
  :case/type :project-runtime-profile
  :case/input
  {:runtime :rust
   :project
   {:project/source-paths [\"src\"]
    :project/test-paths [\"test\"]
    :project/extension-paths []
    :project/dependencies {\"hara:hara/base\" {:version \"^1.0.0\"}}
    :project/runtime-profiles
    {:rust
     {:runtime/source-paths [\"src-rust\"]
      :runtime/test-paths [\"test-rust\"]
      :runtime/extension-paths [\"extensions-rust\"]
      :runtime/dependencies
      {:hara {\"hara:hara/crypto\" {:version \"^1.0.0\"}}}}}}}
  :case/expected
  {:runtime :rust
   :source-paths [\"src\" \"src-rust\"]
   :test-paths [\"test\" \"test-rust\"]
   :extension-paths [\"extensions-rust\"]
   :native-source-paths []
   :hara-dependencies
   {\"hara:hara/base\" {:version \"^1.0.0\"}
    \"hara:hara/crypto\" {:version \"^1.0.0\"}}
   :maven-dependencies {}}}
 {:case/id :hara.package.case/runtime-profile-none
  :case/type :project-runtime-profile
  :case/input
  {:runtime :rust
   :project {:project/source-paths [\"src\"]
             :project/test-paths [\"test\"]
             :project/extension-paths []
             :project/dependencies {}}}
  :case/expected
  {:runtime :rust
   :source-paths [\"src\"]
   :test-paths [\"test\"]
   :extension-paths []
   :native-source-paths []
   :hara-dependencies {}
   :maven-dependencies {}}}
 {:case/id :hara.package.case/runtime-profile-disjoint-namespace
  :case/type :project-runtime-profile
  :case/input
  {:namespaces {:jvm {\"src-jvm/demo/adapter.hal\" demo.adapter}
                :rust {\"src-rust/demo/adapter.hal\" demo.adapter}}}
  :case/expected :valid}
 {:case/id :hara.package.case/runtime-profile-effective-duplicate
  :case/type :project-runtime-profile
  :case/input
  {:runtime :jvm
   :namespaces {\"src/demo/adapter.hal\" demo.adapter
                \"src-jvm/demo/adapter.hal\" demo.adapter}}
  :case/expected {:reject :duplicate-namespace}}
 {:case/id :hara.package.case/runtime-profile-build-orthogonality
  :case/type :project-runtime-profile
  :case/input
  {:runtime :rust
   :build-profile :production
   :project/profiles {:production {:profile/language :hara
                                   :profile/build {:build/tree-shake true}}}
   :project/runtime-profiles
   {:rust {:runtime/source-paths [\"src-rust\"]}}}
  :case/expected {:runtime :rust :build-profile :production}}
 {:case/id :hara.package.case/runtime-profile-legacy-jvm-keys
  :case/type :project-runtime-profile
  :case/input {:jvm/source-paths [\"src-java\"]
               :jvm/dependencies [[org.example/library \"1.0.0\"]]
               :jvm/target-path \"target/classes\"}
  :case/expected
  {:reject :legacy-runtime-key
   :replacements
   {:jvm/source-paths [:project/runtime-profiles :jvm :runtime/native-source-paths]
    :jvm/dependencies [:project/runtime-profiles :jvm :runtime/dependencies :maven]
    :jvm/target-path [:project/runtime-profiles :jvm :runtime/target-path]}}}
 {:case/id :hara.package.case/runtime-profile-hara-conflict
  :case/type :project-runtime-profile
  :case/input
  {:runtime :rust
   :project/dependencies {\"hara:hara/crypto\" {:version \"^1.0.0\"}}
   :project/runtime-profiles
   {:rust {:runtime/dependencies
           {:hara {\"hara:hara/crypto\" {:version \"^2.0.0\"}}}}}}
  :case/expected {:reject :runtime-profile-conflict}}
 {:case/id :hara.package.case/runtime-profile-preserve-inactive-lock
  :case/type :project-runtime-lock
  :case/input {:active-runtime :jvm
               :existing-sections {:jvm {:digest \"old-jvm\"}
                                   :rust {:digest \"keep-rust\"}}}
  :case/expected {:jvm {:digest :reconciled}
                  :rust {:digest \"keep-rust\"}}}
"""
projects.write_text(text[:-2] + extra + "]\n")
