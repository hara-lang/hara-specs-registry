from __future__ import annotations

import re

from named_values_common import insert_before, read, regex_once, replace_once

LANG = "00-unsorted/platform-language/draft/hal-langspec.edn"
L0 = "00-unsorted/platform-language/draft/conformance/l0.edn"
README = "00-unsorted/platform-language/draft/README.md"

insert_before(
    LANG,
    "  {:requirement/id :hal/iterator-first\n",
    '''  {:requirement/id :hal/named-value-separation
   :requirement/level :must
   :requirement/text
   "defstruct defines an immutable persistent named value with structural equality and persistent updates; defmutable defines a fixed-shape mutable named value with reference identity and field/set! mutation. The two categories are distinct language abstractions rather than aliases for one host representation."
   :requirement/evidence
   [{:suite :hal/l0
     :cases [:named-value/constructors-same-unit
             :named-value/defstruct-persistent-map
             :named-value/defmutable-reference
             :named-value/defmutable-evaluation-order]}]}

''',
)
replace_once(
    LANG,
    '"Value equality and hashing are defined by HAL value category rather than host object identity."',
    '"Immutable values use value or structural equality with compatible hashing. Mutable named values use reference identity: aliases compare equal, while distinct instances with equal field contents do not."',
)
regex_once(
    LANG,
    r"  \{:section/id :hal/protocols-structs\n.*?\n   :section/forms\n   \[:hal\.form/defstruct\n    :hal\.form/defprotocol\n    :hal\.form/extend-type\n    :hal\.form/defmulti\n    :hal\.form/defmethod\]\}",
    '''  {:section/id :hal/protocols-structs
   :section/title "Protocols, named values, and multimethods"
   :section/summary
   "Protocols are context-local language descriptors; defstruct and defmutable provide deliberately separate immutable and mutable named-value abstractions; multimethods dispatch using HAL equality."
   :section/requirements
   [{:requirement/id :protocol/context
     :requirement/level :must
     :requirement/text
     "Protocol declarations and extensions are installed in the current HAL context."}
    {:requirement/id :protocol/host-neutral
     :requirement/level :must-not
     :requirement/text
     "A host interface or class relationship alone must not define HAL protocol semantics."}
    {:requirement/id :definition/named-value-visibility
     :requirement/level :must
     :requirement/text
     "defstruct and defmutable install Name, ->Name, and map->Name constructor Vars in the current evaluation environment before following forms in the same enclosing do or source unit are analysed. Constructors consume declared fields in declaration order; map constructors bind missing fields to nil and ignore extra fields."
     :requirement/evidence
     [{:suite :hal/l0
       :cases [:named-value/constructors-same-unit]}]}
    {:requirement/id :struct/persistent-map
     :requirement/level :must
     :requirement/text
     "A defstruct instance is an immutable persistent named value backed by map semantics. Declared keyword fields are readable through keyword invocation and get. assoc and assoc-in may update declared fields only, return the same struct type, leave the receiver unchanged, and preserve structural sharing. Declared field order is retained for construction, iteration, display, and transport encoding."
     :requirement/evidence
     [{:suite :hal/l0
       :cases [:named-value/defstruct-persistent-map]}]}
    {:requirement/id :struct/equality-metadata-and-removal
     :requirement/level :must
     :requirement/text
     "defstruct equality and hashing are structural and include the named type and declared field values, while metadata remains separate from fields and equality. dissoc returns a plain persistent map rather than a struct. field is not an immutable struct accessor and rejects a defstruct instance."
     :requirement/evidence
     [{:suite :hal/l0
       :cases [:runtime/metadata
               :named-value/defstruct-persistent-map]}]}
    {:requirement/id :mutable/reference-identity
     :requirement/level :must
     :requirement/text
     "A defmutable instance has a fixed declared field set and reference identity. field reads a declared field directly; aliases observe the same subsequent writes; distinct instances remain unequal even when every field value is equal."
     :requirement/evidence
     [{:suite :hal/l0
       :cases [:named-value/defmutable-reference]}]}
    {:requirement/id :mutable/field-write
     :requirement/level :must
     :requirement/text
     "set! with a (field receiver field) place evaluates the receiver once, then the replacement once, from left to right; mutates exactly one declared field; and returns the replacement value. An unknown field is a deterministic HAL error."
     :requirement/evidence
     [{:suite :hal/l0
       :cases [:named-value/defmutable-reference
               :named-value/defmutable-evaluation-order]}]}
    {:requirement/id :mutable/no-associative-operations
     :requirement/level :must-not
     :requirement/text
     "assoc, assoc-in, and dissoc do not treat a defmutable instance as a persistent associative collection. Mutable named values and their type descriptors are live values and cannot cross HTA or session-transfer boundaries."}
    {:requirement/id :named-value/dispatch
     :requirement/level :must
     :requirement/text
     "instance? and protocol dispatch recognise both defstruct and defmutable descriptors consistently across the tree evaluator, Rust bytecode VM, and Java/Truffle runtime. Protocol methods read immutable receivers with keyword/get lookup and mutable receivers with field."
     :requirement/evidence
     [{:suite :hal/l0
       :cases [:protocol/struct-extension
               :protocol/struct-inline-extension]}]}]
   :section/forms
   [:hal.form/defstruct
    :hal.form/defmutable
    :hal.form/field
    :hal.form/defprotocol
    :hal.form/extend-type
    :hal.form/defmulti
    :hal.form/defmethod]}''',
    flags=re.S,
)
regex_once(
    LANG,
    r"  \{:form/id :hal\.form/defstruct\n.*?\n  \{:form/id :hal\.form/defprotocol",
    '''  {:form/id :hal.form/defstruct
   :form/symbol defstruct
   :form/class :special-form
   :form/shape (quote (defstruct name [field*] protocol-implementation*))
   :form/semantics "Defines an immutable persistent named-value descriptor and the Name, ->Name, and map->Name constructors. Trailing protocol clauses install its initial implementations, while extend-type may add or replace implementations later. defrecord and deftype are unsupported."
   :form/evaluation :special}
  {:form/id :hal.form/defmutable
   :form/symbol defmutable
   :form/class :special-form
   :form/shape (quote (defmutable name [field*] protocol-implementation*))
   :form/semantics "Defines a fixed-shape reference-identity mutable named-value descriptor and the Name, ->Name, and map->Name constructors. Declared fields are read with field and replaced with set! field places."
   :form/evaluation :special}
  {:form/id :hal.form/field
   :form/symbol field
   :form/class :special-form
   :form/shape (quote (field mutable-value field))
   :form/semantics "Evaluates the receiver once and returns one declared field of a defmutable instance. In a set! place the receiver precedes the replacement in left-to-right evaluation."
   :form/evaluation :special
   :form/arity 2}
  {:form/id :hal.form/defprotocol''',
    flags=re.S,
)
replace_once(
    LANG,
    "  #{:reader :values :evaluation :functions-and-bindings :collections-and-iteration}",
    "  #{:reader :values :evaluation :functions-and-bindings :collections-and-iteration\n    :protocols-and-structs}",
)

replace_once(
    L0,
    "(catch Problem error (field error :value))",
    "(catch Problem error (:value error))",
)
replace_once(
    L0,
    "(extend-type Box ICount (count [self] (field self :size)))",
    "(extend-type Box ICount (count [self] (:size self)))",
)
replace_once(
    L0,
    "(defstruct InlineBox [size] ICount (count [self] (field self :size)))",
    "(defstruct InlineBox [size] ICount (count [self] (:size self)))",
)
insert_before(
    L0,
    "  {:id :unsupported/ratio\n",
    '''  {:id :named-value/constructors-same-unit
   :class :named-value
   :source "(do (defstruct Point [x y]) (defmutable Cursor [x y]) (+ (get (Point 1 2) :x) (get (->Point 3 4) :x) (get (map->Point {:x 5}) :x) (field (Cursor 1 2) :x) (field (->Cursor 3 4) :x) (field (map->Cursor {:x 5}) :x)))"
   :expect {:value 18 :type :integer}}
  {:id :named-value/defstruct-persistent-map
   :class :named-value
   :source "(do (defstruct Point [x y]) (let [point (map->Point {:x 1 :extra 9}) changed (assoc point :x 10) nested (assoc-in changed [:y :nested] 12) plain (dissoc nested :x)] (and (= 1 (:x point)) (nil? (:y point)) (nil? (:extra point)) (= 10 (:x changed)) (= 12 (get (:y nested) :nested)) (instance? Point changed) (= {:y {:nested 12}} plain) (not (instance? Point plain)))))"
   :expect {:value true :type :boolean}}
  {:id :named-value/defmutable-reference
   :class :named-value
   :source "(do (defmutable Cursor [x y]) (let [cursor (Cursor 1 2) alias cursor result (set! (field cursor :x) 42)] (and (= 42 result) (= 42 (field alias :x)) (= cursor alias) (not (= cursor (Cursor 42 2))))))"
   :expect {:value true :type :boolean}}
  {:id :named-value/defmutable-evaluation-order
   :class :named-value
   :source "(do (defmutable Cursor [x]) (def named-value-order 0) (let [cursor (Cursor 1) result (set! (field (do (set! named-value-order (+ (* named-value-order 10) 1)) cursor) :x) (do (set! named-value-order (+ (* named-value-order 10) 2)) 42))] (and (= 12 named-value-order) (= 42 result) (= 42 (field cursor :x)))))"
   :expect {:value true :type :boolean}}
''',
)

replace_once(README, "protocols and structs,", "protocols and named values,")
insert_before(
    README,
    "- **`:hal/iterator-first`**",
    "- **`:hal/named-value-separation`** — `defstruct` is immutable and persistent;\n  `defmutable` is fixed-shape, reference-identical, and mutated only through\n  `field`/`set!`.\n",
)
replace_once(
    README,
    "8. **Protocols, structs, and multimethods** — context-local dispatch and\n   immutable domain values.",
    "8. **Protocols, named values, and multimethods** — context-local dispatch;\n   persistent map-backed `defstruct` values with structural equality; and\n   fixed-shape `defmutable` values with reference identity and `field`/`set!`.\n   Both definitions install `Name`, `->Name`, and `map->Name` constructors\n   before later forms in the same evaluation unit are analysed.",
)
replace_once(
    README,
    "Coverage is currently partial. Host authority, numeric promotion, iterator\nclosure, error-source behaviour, and standard-library behaviour still need",
    "The L0 corpus now pins immutable and mutable named-value constructors,\npersistent struct updates, mutable alias visibility, and field-place evaluation\norder. Coverage is still partial. Host authority, numeric promotion, iterator\nclosure, error-source behaviour, and standard-library behaviour still need",
)

l0 = read(L0)
for stale in [
    "(catch Problem error (field error :value))",
    "(count [self] (field self :size))",
]:
    if stale in l0:
        raise SystemExit(f"{L0}: stale immutable field access remains: {stale}")

print("Updated the portable HAL named-value contract and L0 corpus.")
