from pathlib import Path


contract_path = Path("01-lang/008-source-analysis/draft/std-typed.edn")
contract = contract_path.read_text()

scope_anchor = """  :scope/primary-consumer :tool/lint
  :scope/portable-implementations"""
scope_replacement = """  :scope/primary-consumer :tool/lint
  :scope/input-model :ordinary-hara-values-and-forms
  :scope/source-tree-adapters :consumer-owned
  :scope/dependency-boundary
  {:std.typed.infer [:std.typed.schema]
   :std.typed.schema [:std.foundation]
   :std.block :forbidden}
  :scope/portable-implementations"""
if contract.count(scope_anchor) != 1:
    raise SystemExit("std.typed scope anchor changed unexpectedly")
contract = contract.replace(scope_anchor, scope_replacement, 1)

invariant_anchor = """  {:requirement/id :std.typed/strict-known-forms
   :requirement/level :must"""
invariant_replacement = """  {:requirement/id :std.typed/source-tree-independence
   :requirement/level :must
   :requirement/text "Portable std.typed modules consume ordinary Hara values and forms and do not depend on std.block, recovering source trees, or source-span APIs; consumers such as tool.lint own those adapters."}
  {:requirement/id :std.typed/minimal-dependency-graph
   :requirement/level :must
   :requirement/text "std.typed.infer directly depends only on std.typed.schema, while std.typed.schema depends only on the portable std.foundation value layer."}
  {:requirement/id :std.typed/strict-known-forms
   :requirement/level :must"""
if contract.count(invariant_anchor) != 1:
    raise SystemExit("std.typed invariant anchor changed unexpectedly")
contract_path.write_text(contract.replace(invariant_anchor, invariant_replacement, 1))

readme_path = Path("01-lang/008-source-analysis/draft/README.md")
readme = readme_path.read_text()
paragraph = (
    "\n`std.typed` itself consumes ordinary Hara values and forms. Recovering "
    "`std.block` trees, source spans, and diagnostics remain responsibilities "
    "of source-analysis consumers such as `tool.lint`; they are not portable "
    "type-system dependencies.\n"
)
if paragraph.strip() not in readme:
    readme_path.write_text(readme.rstrip() + "\n" + paragraph)
