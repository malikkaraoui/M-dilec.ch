from __future__ import annotations

import json
import os
import re
import tempfile
import unicodedata
from datetime import datetime
from pathlib import Path


def pad6(n: int) -> str:
    return str(int(n)).zfill(6)


def now_stamp() -> str:
    # ex: 20260110_154512
    return datetime.now().strftime("%Y%m%d_%H%M%S")


_slug_sep_re = re.compile(r"[^a-z0-9]+")


def slugify_ascii(value: str) -> str:
    raw = (value or "").strip().lower()
    if not raw:
        return ""

    norm = unicodedata.normalize("NFKD", raw)
    ascii_only = norm.encode("ascii", "ignore").decode("ascii")
    ascii_only = ascii_only.lower()

    out = _slug_sep_re.sub("-", ascii_only).strip("-")
    out = re.sub(r"-+", "-", out)
    return out


_strip_re = re.compile(r"<[^>]*>")


def strip_html(value: str) -> str:
    text = _strip_re.sub(" ", value or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def read_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def atomic_write_json(path: Path, obj) -> None:
    ensure_dir(path.parent)

    # Écrit dans le même dossier puis os.replace (atomique sur même FS)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=str(path.parent),
        prefix=path.name + ".",
        suffix=".tmp",
        delete=False,
    ) as tf:
        tmp_name = tf.name
        json.dump(obj, tf, ensure_ascii=False, indent=2)
        tf.write("\n")

    os.replace(tmp_name, path)


def file_ext_from_upload(filename: str | None) -> str:
    name = (filename or "").strip()
    if not name or "." not in name:
        return "bin"
    ext = name.rsplit(".", 1)[-1].lower()
    ext = re.sub(r"[^a-z0-9]", "", ext)
    return ext or "bin"
