from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(".")


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text)


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{path}: expected exactly one occurrence of {old!r}, found {count}"
        )
    write(path, text.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str, *, flags: int = 0) -> None:
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{path}: pattern did not match exactly once: {pattern!r}")
    write(path, updated)


def insert_before(path: str, marker: str, addition: str) -> None:
    replace_once(path, marker, addition + marker)
