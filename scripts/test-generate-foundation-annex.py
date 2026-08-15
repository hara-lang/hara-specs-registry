#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("generate-foundation-annex.py")
SPEC = importlib.util.spec_from_file_location("generate_foundation_annex", MODULE_PATH)
assert SPEC and SPEC.loader
module = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = module
SPEC.loader.exec_module(module)


def definition(name: str, kind: str = "defn", line: int = 1) -> dict:
    return {
        "name": name,
        "kind": kind,
        "doc": f"{name} documentation",
        "signature": "[value]",
        "line": line,
    }


def manifest() -> dict:
    namespaces = []
    for index, name in enumerate(module.CURRENT_FOUNDATION):
        namespaces.append({
            "name": name,
            "source": "std/foundation.hal" if name == "std.foundation"
                else "std/foundation/" + name.rsplit(".", 1)[-1] + ".hal",
            "definitions": [definition("root-op" if name == "std.foundation" else f"op-{index}", line=index + 1)],
            "examples": [],
            "group": "foundation",
            "status": "implemented",
            "profiles": ["jvm", "rust", "wasm"],
        })
    return {
        "schemaVersion": 2,
        "source": {
            "repository": "https://github.com/hara-lang/hara",
            "ref": "main",
            "commit": "a" * 40,
        },
        "generator": {"name": "test", "version": "1"},
        "inventory": {
            "path": "core/rust/standard-library.namespaces",
            "authority": "registered-standard-library-namespaces",
        },
        "profiles": ["jvm", "rust", "wasm"],
        "surfaceDigest": "sha256:" + "b" * 64,
        "migrationLedger": {
            "schemaVersion": 1,
            "path": "core/spec/std/foundation-migrations.json",
            "digest": "sha256:" + "c" * 64,
        },
        "namespaces": namespaces,
        "aliases": [{
            "alias": "str",
            "target": "std.foundation.string",
            "kind": "namespace-alias",
            "automatic": True,
        }],
        "nativeObjects": [{
            "name": "Edn",
            "namespace": "std.native.Edn",
            "automaticAlias": "Edn",
            "kind": "static-object",
        }],
        "migrations": [{
            "formerName": "std.foundation.edn",
            "status": "moved",
            "replacement": {
                "kind": "native-static-object",
                "name": "Edn",
                "internalNamespace": "std.native.Edn",
            },
            "requireRewrite": "Remove the old dependency.",
            "callRewrite": "Use Edn/read.",
            "evidence": ["core/rust/src/kernel/generated.rs"],
            "tracking": ["#649"],
        }],
    }


class FoundationAnnexGeneratorTest(unittest.TestCase):
    def test_current_surface_and_root_are_separate(self) -> None:
        annex, readme = module.generated_outputs(manifest())
        self.assertIn(":root/namespace std.foundation", annex)
        self.assertEqual(5, annex.count(":library/namespace std.foundation."))
        self.assertIn("**5** child namespaces", readme)
        self.assertIn("root `std.foundation` namespace contains **1** public bindings", readme)

    def test_alias_native_object_and_migration_are_separate(self) -> None:
        annex, _ = module.generated_outputs(manifest())
        self.assertIn(":alias/name str", annex)
        self.assertIn(":native/name Edn", annex)
        self.assertIn(":migration/former-name std.foundation.edn", annex)
        self.assertNotIn(":library/namespace std.foundation.edn", annex)

    def test_generation_is_deterministic(self) -> None:
        first = module.generated_outputs(manifest())
        second = module.generated_outputs(json.loads(json.dumps(manifest())))
        self.assertEqual(first, second)

    def test_current_migration_conflict_is_rejected(self) -> None:
        value = manifest()
        value["migrations"][0]["formerName"] = "std.foundation.string"
        with self.assertRaisesRegex(ValueError, "still current"):
            module.generated_outputs(value)

    def test_check_mode_detects_and_clears_drift(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            input_path = root / "manifest.json"
            annex_path = root / "foundation-annex.edn"
            readme_path = root / "README.md"
            input_path.write_text(json.dumps(manifest()))
            self.assertEqual(
                0,
                module.main([
                    "--input", str(input_path),
                    "--annex-output", str(annex_path),
                    "--readme-output", str(readme_path),
                ]),
            )
            self.assertEqual(
                0,
                module.main([
                    "--input", str(input_path),
                    "--annex-output", str(annex_path),
                    "--readme-output", str(readme_path),
                    "--check",
                ]),
            )
            annex_path.write_text(annex_path.read_text() + "\n")
            self.assertEqual(
                1,
                module.main([
                    "--input", str(input_path),
                    "--annex-output", str(annex_path),
                    "--readme-output", str(readme_path),
                    "--check",
                ]),
            )


if __name__ == "__main__":
    unittest.main()
