from __future__ import annotations

from named_values_common import insert_before, read, replace_once

LANG = "00-unsorted/platform-language/draft/hal-langspec.edn"
L0 = "00-unsorted/platform-language/draft/conformance/l0.edn"
VM = "01-lang/010-bytecode/draft/hal-bytecode-vm.edn"

replace_once(
    LANG,
    ":form/shape (quote (defmutable name [field*] protocol-implementation*))",
    ":form/shape (quote (defmutable name [field*]))",
)
replace_once(
    LANG,
    ":cases [:protocol/struct-extension\n               :protocol/struct-inline-extension]}]}",
    ":cases [:protocol/struct-extension\n               :protocol/struct-inline-extension\n               :protocol/mutable-extension]}]}",
)
insert_before(
    L0,
    "  {:id :protocol/multimethod\n",
    '''  {:id :protocol/mutable-extension
   :class :protocol
   :source "(ICount/count (MutableBox 6))"
   :setup "(defmutable MutableBox [size]) (extend-type MutableBox ICount (count [self] (field self :size)))"
   :expect {:value 6 :type :integer}}
''',
)

replace_once(
    VM,
    "   :defstruct-protocol-clauses\n   :protocol-based-struct-metadata",
    "   :defstruct-protocol-clauses\n   :defmutable-protocol-clauses\n   :protocol-based-struct-metadata",
)
insert_before(
    VM,
    "  :namespace-owned-vars\n",
    '''  :defmutable
  {:rule
   "defmutable executes the registry helper that validates name and fields, creates the MutableType qualified to the current namespace, and interns Name, ->Name, and map->Name. Trailing protocol clauses are the compile error \"defmutable protocol clauses are not supported\"; portable dispatch is installed with extend-type."
   :field-access
   "field lowers to MutableFieldGet. set! with a field place evaluates receiver then replacement exactly once and lowers to MutableFieldSet, which returns the replacement."
   :identity
   "Mutable instances compare and hash by shared storage identity; aliases observe writes while separately constructed instances remain distinct."}
''',
)
replace_once(VM, ":validated-HBC4", ":validated-HBC0")
replace_once(VM, "complete authenticated HBC4 fallback", "complete authenticated HBC0 fallback")
replace_once(VM, "The HBC4 program is retained", "The HBC0 program is retained")

if "HBC4" in read(VM):
    raise SystemExit(f"{VM}: stale HBC4 reference remains")

print("Completed named-value protocol and HBC0 follow-up corrections.")
