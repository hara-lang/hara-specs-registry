#!/usr/bin/env python3
"""Generate the Foundation annex EDN and README from Hara's schema-v2 API manifest."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class Keyword:
    value: str


@dataclass(frozen=True)
class Symbol:
    value: str


@dataclass(frozen=True)
class EdnSet:
    values: tuple[Any, ...]


PROFILES = {"rust": Keyword("rust"), "jvm": Keyword("jvm"), "wasm": Keyword("wasm")}
CLASSIFICATION = {
    "std.foundation.bytes": Keyword("native-facade"),
    "std.foundation.coroutine": Keyword("native-and-protocol-facade"),
    "std.foundation.pretty": Keyword("portable-hal"),
    "std.foundation.promise": Keyword("native-and-protocol-facade"),
    "std.foundation.string": Keyword("native-facade"),
}
ALIASES = {
    "std.foundation.bytes": Symbol("bytes"),
    "std.foundation.coroutine": Symbol("co"),
    "std.foundation.pretty": Symbol("pretty"),
    "std.foundation.promise": Symbol("promise"),
    "std.foundation.string": Symbol("str"),
}
CURRENT_FOUNDATION = [
    "std.foundation",
    "std.foundation.bytes",
    "std.foundation.coroutine",
    "std.foundation.pretty",
    "std.foundation.promise",
    "std.foundation.string",
]
STATUS = {
    "implemented": Keyword("implemented"),
    "planned": Keyword("planned"),
    "planned-replacement": Keyword("planned"),
    "moved": Keyword("moved"),
    "retired": Keyword("retired"),
    "compatibility-only": Keyword("compatibility-only"),
}
REPLACEMENT_KIND = {
    "namespace": Keyword("namespace"),
    "namespace-root": Keyword("namespace-root"),
    "native-static-object": Keyword("native-static-object"),
    "native-capability": Keyword("native-capability"),
    "planned-namespace": Keyword("planned-namespace"),
}


def kw(value: str) -> Keyword:
    return Keyword(value)


def sym(value: str) -> Symbol:
    return Symbol(value)


def edn_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def edn(value: Any, indent: int = 0) -> str:
    space = " " * indent
    child = indent + 1
    if isinstance(value, Keyword):
        return f":{value.value}"
    if isinstance(value, Symbol):
        return value.value
    if isinstance(value, EdnSet):
        return "#{" + " ".join(edn(item, child) for item in value.values) + "}"
    if value is None:
        return "nil"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        return edn_string(value)
    if isinstance(value, list):
        if not value:
            return "[]"
        rendered = [edn(item, child) for item in value]
        if all("\n" not in item for item in rendered) and sum(map(len, rendered)) < 72:
            return "[" + " ".join(rendered) + "]"
        prefix = " " * (indent + 1)
        return "[\n" + "\n".join(prefix + item.replace("\n", "\n" + prefix) for item in rendered) + "\n" + space + "]"
    if isinstance(value, dict):
        if not value:
            return "{}"
        entries = []
        for key, item in value.items():
            rendered_key = edn(key, child)
            rendered_value = edn(item, child)
            entries.append((rendered_key, rendered_value))
        if all("\n" not in key and "\n" not in item for key, item in entries) and sum(len(key) + len(item) + 1 for key, item in entries) < 68:
            return "{" + " ".join(f"{key} {item}" for key, item in entries) + "}"
        lines = []
        prefix = " " * (indent + 1)
        for key, item in entries:
            item_lines = item.splitlines()
            lines.append(prefix + key + " " + item_lines[0])
            lines.extend(prefix + " " * (len(key) + 1) + line for line in item_lines[1:])
        return "{\n" + "\n".join(lines) + "\n" + space + "}"
    raise TypeError(f"Unsupported EDN value: {type(value)!r}")


def profiles(manifest: dict[str, Any]) -> list[Keyword]:
    result = []
    for profile in manifest.get("profiles", []):
        if profile not in PROFILES:
            raise ValueError(f"Unsupported runtime profile: {profile}")
        result.append(PROFILES[profile])
    if not result:
        raise ValueError("Manifest requires at least one runtime profile")
    return result


def binding(definition: dict[str, Any], source: str) -> dict[Keyword, Any]:
    result: dict[Keyword, Any] = {
        kw("binding/name"): sym(definition["name"]),
        kw("binding/kind"): kw(definition["kind"]),
    }
    if definition.get("signature"):
        result[kw("binding/signature")] = definition["signature"]
    if definition.get("doc"):
        result[kw("binding/doc")] = definition["doc"]
    if source:
        result[kw("binding/source-path")] = source
    if isinstance(definition.get("line"), int):
        result[kw("binding/source-line")] = definition["line"]
    return result


def migration_id(former: str) -> Keyword:
    suffix = former.removeprefix("std.foundation.").replace(".", "-")
    return kw(f"foundation-migration/{suffix}")


def migration_record(item: dict[str, Any], manifest_profiles: list[Keyword]) -> dict[Keyword, Any]:
    result: dict[Keyword, Any] = {
        kw("migration/id"): migration_id(item["formerName"]),
        kw("migration/former-name"): sym(item["formerName"]),
        kw("migration/status"): STATUS[item["status"]],
        kw("migration/require-rewrite"): item["requireRewrite"],
        kw("migration/call-rewrite"): item["callRewrite"],
        kw("migration/evidence"): list(item.get("evidence", [])),
        kw("migration/profiles"): manifest_profiles,
    }
    replacement = item.get("replacement")
    if replacement:
        kind = replacement.get("kind")
        if kind not in REPLACEMENT_KIND:
            raise ValueError(f"Unsupported replacement kind for {item['formerName']}: {kind}")
        result[kw("migration/replacement")] = {
            kw("replacement/kind"): REPLACEMENT_KIND[kind],
            kw("replacement/name"): sym(replacement["name"]),
            **(
                {kw("replacement/status"): STATUS[replacement["status"]]}
                if replacement.get("status") in STATUS
                else {}
            ),
        }
    if item.get("disposition"):
        result[kw("migration/disposition")] = item["disposition"]
    if item.get("compatibility"):
        result[kw("migration/compatibility")] = item["compatibility"]
    planned = item.get("plannedPortableReplacement")
    if planned:
        result[kw("migration/planned-replacement")] = {
            kw("replacement/kind"): REPLACEMENT_KIND.get(planned.get("kind"), kw("planned-namespace")),
            kw("replacement/name"): sym(planned["name"]),
            kw("replacement/status"): STATUS.get(planned.get("status"), kw("planned")),
        }
    if item.get("profileNotes"):
        result[kw("migration/profile-notes")] = {
            kw(f"profile/{name}"): note for name, note in sorted(item["profileNotes"].items())
        }
    if item.get("tracking"):
        result[kw("migration/tracking")] = list(item["tracking"])
    return result


def validate_manifest(manifest: dict[str, Any]) -> None:
    if manifest.get("schemaVersion") != 2:
        raise ValueError("Foundation annex generation requires manifest schemaVersion 2")
    source = manifest.get("source", {})
    commit = source.get("commit", "")
    if not isinstance(commit, str) or len(commit) != 40 or any(ch not in "0123456789abcdef" for ch in commit):
        raise ValueError("Manifest source.commit must be an immutable 40-character SHA")
    digest = manifest.get("surfaceDigest", "")
    if not isinstance(digest, str) or not digest.startswith("sha256:") or len(digest) != 71:
        raise ValueError("Manifest surfaceDigest must be a sha256 digest")
    migration_digest = manifest.get("migrationLedger", {}).get("digest", "")
    if not isinstance(migration_digest, str) or not migration_digest.startswith("sha256:") or len(migration_digest) != 71:
        raise ValueError("Manifest migration ledger requires a sha256 digest")
    names = [item.get("name") for item in manifest.get("namespaces", []) if item.get("group") == "foundation"]
    if names != CURRENT_FOUNDATION:
        raise ValueError(f"Unexpected current Foundation namespaces: {names}")
    current = set(names)
    former: set[str] = set()
    for item in manifest.get("migrations", []):
        name = item.get("formerName")
        status = item.get("status")
        if name in former:
            raise ValueError(f"Duplicate migration: {name}")
        if name in current:
            raise ValueError(f"Migration is still current: {name}")
        if status not in STATUS:
            raise ValueError(f"Unsupported migration status for {name}: {status}")
        former.add(name)


def build_annex(manifest: dict[str, Any]) -> dict[Keyword, Any]:
    validate_manifest(manifest)
    manifest_profiles = profiles(manifest)
    by_name = {item["name"]: item for item in manifest["namespaces"]}
    root = by_name["std.foundation"]

    libraries = []
    for name in CURRENT_FOUNDATION[1:]:
        item = by_name[name]
        source = item.get("source", "")
        definitions = item.get("definitions", [])
        libraries.append({
            kw("library/id"): kw("foundation/" + name.rsplit(".", 1)[-1]),
            kw("library/namespace"): sym(name),
            kw("library/alias"): ALIASES[name],
            kw("library/classification"): CLASSIFICATION[name],
            kw("library/status"): kw("implemented"),
            kw("library/source-path"): source,
            kw("library/profiles"): manifest_profiles,
            kw("library/public-vars"): [sym(definition["name"]) for definition in definitions],
            kw("library/public-bindings"): [binding(definition, source) for definition in definitions],
        })

    alias_records = []
    for item in manifest.get("aliases", []):
        alias_records.append({
            kw("alias/name"): sym(item["alias"]),
            kw("alias/target"): sym(item["target"]),
            kw("alias/kind"): kw(item.get("kind", "namespace-alias")),
            kw("alias/automatic"): bool(item.get("automatic", False)),
            kw("alias/profiles"): manifest_profiles,
        })

    native_records = []
    for item in manifest.get("nativeObjects", []):
        native_records.append({
            kw("native/name"): sym(item["name"]),
            kw("native/internal-namespace"): sym(item["namespace"]),
            kw("native/status"): kw("implemented"),
            kw("native/profiles"): manifest_profiles,
        })

    migrations = [migration_record(item, manifest_profiles) for item in manifest.get("migrations", [])]
    root_source = root.get("source", "")
    source = manifest["source"]
    migration_digest = manifest["migrationLedger"]["digest"]

    return {
        kw("document/id"): kw("hara/foundation-annex"),
        kw("document/type"): kw("foundation-annex-spec"),
        kw("document/version"): "alpha",
        kw("document/status"): kw("draft"),
        kw("document/title"): "Hara Foundation library annex",
        kw("document/summary"): (
            "Generated catalog of the current std.foundation root and child namespaces, "
            "native static objects, automatic aliases, and historical migrations."
        ),
        kw("spec/conforms-to"): {
            kw("spec/id"): kw("hara/foundation-annex-metaspec"),
            kw("spec/version"): "alpha",
        },
        kw("annex/source"): {
            kw("source/repository"): source["repository"],
            kw("source/ref"): source.get("ref", source["commit"]),
            kw("source/commit"): source["commit"],
            kw("source/manifest-schema"): manifest["schemaVersion"],
            kw("source/surface-digest"): manifest["surfaceDigest"],
            kw("source/migration-digest"): migration_digest,
        },
        kw("annex/scope"): {
            kw("scope/namespace-family"): "std.foundation",
            kw("scope/includes"): EdnSet((
                kw("root-surface"),
                kw("implemented-child-namespaces"),
                kw("aliases"),
                kw("native-static-objects"),
                kw("migration-records"),
            )),
            kw("scope/excludes"): EdnSet((
                kw("implementation-helper-namespaces"),
                kw("unregistered-source-files"),
                kw("test-fixtures"),
                kw("planned-unimplemented-libraries"),
            )),
        },
        kw("annex/invariants"): [
            {
                kw("requirement/id"): kw("annex/registered-inventory"),
                kw("requirement/level"): kw("must"),
                kw("requirement/text"): (
                    "Only namespaces present in Hara's registered standard-library inventory "
                    "are represented as current Foundation namespaces."
                ),
            },
            {
                kw("requirement/id"): kw("annex/root-separate"),
                kw("requirement/level"): kw("must"),
                kw("requirement/text"): (
                    "The root std.foundation binding surface is represented independently "
                    "from the child namespace count."
                ),
            },
            {
                kw("requirement/id"): kw("annex/native-separate"),
                kw("requirement/level"): kw("must-not"),
                kw("requirement/text"): (
                    "An alias or native static object is classified as a loadable namespace."
                ),
            },
            {
                kw("requirement/id"): kw("annex/migration-separate"),
                kw("requirement/level"): kw("must-not"),
                kw("requirement/text"): (
                    "A moved or retired name contributes to the current namespace count."
                ),
            },
        ],
        kw("annex/root"): {
            kw("root/namespace"): sym("std.foundation"),
            kw("root/status"): kw("implemented"),
            kw("root/source-path"): root_source,
            kw("root/public-bindings"): [
                binding(definition, root_source) for definition in root.get("definitions", [])
            ],
            kw("root/profiles"): manifest_profiles,
        },
        kw("annex/libraries"): libraries,
        kw("annex/aliases"): alias_records,
        kw("annex/native-objects"): native_records,
        kw("annex/migrations"): migrations,
        kw("annex/capabilities"): {
            kw("capability/file"): {
                kw("capability/native-object"): sym("File"),
                kw("capability/authority"): kw("filesystem"),
            },
            kw("capability/network"): {
                kw("capability/native-object"): sym("Socket"),
                kw("capability/authority"): kw("network"),
            },
            kw("capability/process"): {
                kw("capability/native-objects"): [sym("OS"), sym("Process")],
                kw("capability/authority"): kw("process"),
            },
            kw("capability/host-call"): {
                kw("capability/native-object"): sym("Host"),
                kw("capability/authority"): kw("host-call"),
            },
            kw("capability/kernel"): {
                kw("capability/native-object"): sym("Kernel"),
                kw("capability/authority"): kw("kernel"),
            },
        },
        kw("annex/errors"): [
            {kw("error/id"): kw("annex/invalid-arity")},
            {kw("error/id"): kw("annex/invalid-argument")},
            {kw("error/id"): kw("annex/capability-denied")},
            {kw("error/id"): kw("annex/unavailable-profile")},
            {kw("error/id"): kw("annex/closed-handle")},
            {kw("error/id"): kw("annex/type-not-transportable")},
        ],
        kw("annex/references"): [
            {
                kw("reference/id"): kw("annex/api-manifest"),
                kw("reference/path"): "generated/foundation-api-manifest.json",
                kw("reference/authority"): kw("generated-source"),
            },
            {
                kw("reference/id"): kw("annex/registered-inventory"),
                kw("reference/path"): "core/rust/standard-library.namespaces",
                kw("reference/authority"): kw("implementation"),
            },
            {
                kw("reference/id"): kw("annex/migration-ledger"),
                kw("reference/path"): "core/spec/std/foundation-migrations.json",
                kw("reference/authority"): kw("implementation"),
            },
            {
                kw("reference/id"): kw("annex/metaspec"),
                kw("reference/path"): "../metaspec/foundation-annex-metaspec.edn",
                kw("reference/authority"): kw("normative-schema"),
            },
        ],
        kw("annex/conformance"): [
            {
                kw("conformance/id"): kw("annex/manifest-generation"),
                kw("conformance/path"): "scripts/generate-foundation-annex.py",
                kw("conformance/authority"): kw("generator"),
            },
            {
                kw("conformance/id"): kw("annex/registry-validation"),
                kw("conformance/path"): "scripts/validate-registry.mjs",
                kw("conformance/authority"): kw("registry"),
            },
        ],
        kw("annex/generation"): {
            kw("generation/tool"): "generate-foundation-annex",
            kw("generation/tool-version"): "1",
            kw("generation/manifest-schema"): manifest["schemaVersion"],
            kw("generation/surface-digest"): manifest["surfaceDigest"],
            kw("generation/migration-digest"): migration_digest,
        },
    }


def render_readme(manifest: dict[str, Any]) -> str:
    validate_manifest(manifest)
    by_name = {item["name"]: item for item in manifest["namespaces"]}
    root_count = len(by_name["std.foundation"].get("definitions", []))
    children = [by_name[name] for name in CURRENT_FOUNDATION[1:]]
    current_bindings = sum(len(item.get("definitions", [])) for item in children)
    lines = [
        "# Hara Foundation annex",
        "",
        "<!-- generated from the canonical Hara API manifest; do not edit by hand -->",
        "",
        "This annex separates the current portable Foundation API from automatic aliases, "
        "native static objects, and historical namespace migrations.",
        "",
        "## Pinned source",
        "",
        f"- Repository: `{manifest['source']['repository']}`",
        f"- Ref: `{manifest['source'].get('ref', manifest['source']['commit'])}`",
        f"- Commit: `{manifest['source']['commit']}`",
        f"- Manifest schema: `{manifest['schemaVersion']}`",
        f"- Surface digest: `{manifest['surfaceDigest']}`",
        f"- Migration digest: `{manifest['migrationLedger']['digest']}`",
        "",
        "## Current Foundation surface",
        "",
        f"The root `std.foundation` namespace contains **{root_count}** public bindings. "
        f"It is represented separately from the **{len(children)}** child namespaces.",
        "",
        "| Current child namespace | Alias | Public bindings | Profiles |",
        "| --- | --- | ---: | --- |",
    ]
    manifest_profiles = ", ".join(manifest.get("profiles", []))
    for item in children:
        name = item["name"]
        alias = ALIASES[name].value
        lines.append(
            f"| `{name}` | `{alias}` | {len(item.get('definitions', []))} | {manifest_profiles} |"
        )
    lines += [
        "",
        f"Current children contain **{current_bindings}** public bindings in total.",
        "",
        "## Native static objects",
        "",
        "These runtime objects are recorded separately and do not contribute to the namespace count:",
        "",
        ", ".join(f"`{item['name']}`" for item in manifest.get("nativeObjects", [])) + ".",
        "",
        "## Historical migrations",
        "",
        "| Former name | Status | Replacement or disposition |",
        "| --- | --- | --- |",
    ]
    for item in manifest.get("migrations", []):
        replacement = item.get("replacement")
        direction = (
            f"`{replacement['name']}` ({replacement['kind']})"
            if replacement
            else item.get("disposition", "No direct replacement")
        )
        lines.append(f"| `{item['formerName']}` | `{item['status']}` | {direction} |")
    lines += [
        "",
        "Moved and retired names remain available as migration records, but they are not current "
        "`std.foundation.*` namespaces.",
        "",
        "## Regeneration",
        "",
        "Generate both the normative EDN and this README from the same pinned schema-v2 manifest:",
        "",
        "```sh",
        "python scripts/generate-foundation-annex.py \\",
        "  --input generated/foundation-api-manifest.json \\",
        "  --annex-output 01-lang/005-foundation-annex/draft/foundation-annex.edn \\",
        "  --readme-output 01-lang/005-foundation-annex/draft/README.md",
        "```",
        "",
        "CI must verify the pinned source commit and semantic digests before accepting regenerated output.",
        "",
    ]
    return "\n".join(lines)


def generated_outputs(manifest: dict[str, Any]) -> tuple[str, str]:
    return edn(build_annex(manifest)) + "\n", render_readme(manifest)


def write_or_check(path: Path, content: str, check: bool) -> bool:
    current = path.read_text() if path.exists() else None
    changed = current != content
    if check:
        return changed
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
    return changed


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser()
    result.add_argument("--input", type=Path, required=True)
    result.add_argument("--annex-output", type=Path, required=True)
    result.add_argument("--readme-output", type=Path, required=True)
    result.add_argument("--check", action="store_true")
    return result


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    manifest = json.loads(args.input.read_text())
    annex, readme = generated_outputs(manifest)
    changed = [
        str(path)
        for path, content in (
            (args.annex_output, annex),
            (args.readme_output, readme),
        )
        if write_or_check(path, content, args.check)
    ]
    if args.check and changed:
        print("Generated Foundation annex is stale: " + ", ".join(changed), file=sys.stderr)
        return 1
    print(
        f"{'checked' if args.check else 'generated'} Foundation annex "
        f"for {len(CURRENT_FOUNDATION) - 1} child namespaces"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
