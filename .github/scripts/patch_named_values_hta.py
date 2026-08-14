from __future__ import annotations

from named_values_common import insert_before, replace_once

HTA = "02-platform/000050-transport-hta/draft/transport-hta.edn"
README = "02-platform/000050-transport-hta/draft/README.md"
CASES = "02-platform/000050-transport-hta/draft/conformance/transport-hta.edn"

insert_before(
    HTA,
    "  {:requirement/id :hara.hta/no-spin\n",
    '''  {:requirement/id :hara.hta/named-value-boundary
   :requirement/level :must
   :requirement/text "An immutable defstruct value encodes its qualified type name, declared field order, and ordered field values. A defmutable value or mutable named type descriptor is a live reference and is rejected rather than snapshotted or converted to an opaque handle."}
''',
)
replace_once(
    HTA,
    "   :value/map\n   :value/opaque-handle]",
    "   :value/map\n   :value/struct\n   :value/opaque-handle]",
)
replace_once(
    HTA,
    "   {:tag/number 12 :tag/value :value/opaque-handle}]",
    "   {:tag/number 12 :tag/value :value/opaque-handle}\n   {:tag/number 33 :tag/value :value/struct}]",
)
replace_once(
    HTA,
    "  :codec/map-order :encoded-byte-order\n  :codec/set-order :encoded-byte-order}",
    "  :codec/map-order :encoded-byte-order\n  :codec/set-order :encoded-byte-order\n  :codec/struct-shape [:struct/type-name :struct/declared-fields :struct/ordered-values]\n  :codec/mutable-named-values :unsupported}",
)
insert_before(
    HTA,
    "  {:requirement/id :hara.hta.provider/actor-ownership\n",
    '''  {:requirement/id :hara.hta.values/named-values
   :requirement/level :must
   :requirement/text "Cross-runtime HTA codecs preserve immutable defstruct type and declared field order exactly, and fail with an unsupported-value error for defmutable instances and mutable named type descriptors."}
''',
)

replace_once(
    README,
    "64-bit integers, UTF-8 strings, bytes, keywords, symbols, lists, vectors, sets, maps, and opaque `{owner, type, id}` handles.",
    "64-bit integers, UTF-8 strings, bytes, keywords, symbols, lists, vectors, sets, maps, immutable named structs, and opaque `{owner, type, id}` handles.",
)
insert_before(
    README,
    "Each Truffle extension instance has one Java virtual-thread actor",
    "Immutable `defstruct` values use append-only tag 33 and carry the qualified\ntype name, declared field order, and ordered field values. `defmutable` values\nand mutable named type descriptors are live references: HTA rejects them rather\nthan snapshotting them or silently converting them to handles.\n\n",
)
replace_once(
    README,
    "The portable codec profile\nis tags 0–12 and includes an exact shared golden vector, cross-runtime",
    "The portable codec profile\nuses the original tags 0–12 plus append-only struct tag 33 and includes an exact\nshared golden vector, cross-runtime",
)

replace_once(
    CASES,
    "    :hta.case/portable-round-trip\n    :hta.case/canonical-collections",
    "    :hta.case/portable-round-trip\n    :hta.case/named-value-boundary\n    :hta.case/canonical-collections",
)
replace_once(
    CASES,
    '"Tags above 12 require an advertised extension profile; portable consumers reject unknown tags deterministically."',
    '"Tags above 12 require an advertised extension profile except for the standardized portable struct tag 33; portable consumers reject every other unknown tag deterministically."',
)
replace_once(
    CASES,
    "    :value/map\n    :value/opaque-handle]",
    "    :value/map\n    :value/struct\n    :value/opaque-handle]",
)
insert_before(
    CASES,
    "  {:case/id :hta.case/canonical-collections\n",
    '''  {:case/id :hta.case/named-value-boundary
   :case/level :must
   :case/method :cross-runtime-matrix
   :case/input
   [:named-value/struct-round-trip
    :named-value/mutable-instance
    :named-value/mutable-type]
   :case/expect
   [:struct/type-name-preserved
    :struct/declared-field-order-preserved
    :struct/ordered-values-preserved
    :mutable/unsupported-value-error]}
''',
)

print("Updated the HTA named-value transfer boundary and conformance profile.")
