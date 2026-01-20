#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"


@dataclass(frozen=True)
class Problem:
    path: Path
    message: str


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def has_status_summary(path: Path, max_bytes: int = 800) -> bool:
    head = read_text(path)[:max_bytes]
    return ("Status:" in head) and ("Summary:" in head)


LINK_RE = re.compile(r"\]\(([^)]+)\)")


def iter_markdown_links(text: str) -> list[str]:
    links: list[str] = []
    for m in LINK_RE.finditer(text):
        link = m.group(1).strip()
        if not link:
            continue
        links.append(link)
    return links


def is_external_link(link: str) -> bool:
    return "://" in link or link.startswith("mailto:")


def normalize_link_target(link: str) -> str:
    return link.split("#", 1)[0].strip()


def exists_target(from_path: Path, target: str) -> bool:
    if not target:
        return True
    if target.startswith("#"):
        return True
    if target.startswith("<") and target.endswith(">"):
        return True
    if is_external_link(target):
        return True

    target = normalize_link_target(target)
    if not target:
        return True

    if target.startswith("/"):
        # Treat as repo-root relative.
        resolved = (ROOT / target.lstrip("/")).resolve()
    elif target.startswith("docs/"):
        resolved = (ROOT / target).resolve()
    else:
        resolved = (from_path.parent / target).resolve()

    if target.endswith("/"):
        return resolved.is_dir()
    return resolved.exists()


def extract_frontmatter_fields(path: Path) -> dict[str, str]:
    head = read_text(path)[:1200]
    fields: dict[str, str] = {}
    for key in ("Status", "Summary", "Replaced-by"):
        m = re.search(rf"^{re.escape(key)}:\s*(.+)\s*$", head, flags=re.M)
        if m:
            fields[key] = m.group(1).strip()
    return fields


def git_check_ignore(path: Path) -> bool:
    try:
        subprocess.check_output(
            ["git", "check-ignore", "-q", str(path.relative_to(ROOT))],
            cwd=ROOT,
        )
        return True
    except subprocess.CalledProcessError:
        return False


def git_is_tracked(path: Path) -> bool:
    try:
        subprocess.check_output(
            ["git", "ls-files", "--error-unmatch", str(path.relative_to(ROOT))],
            cwd=ROOT,
            stderr=subprocess.DEVNULL,
            text=True,
        )
        return True
    except subprocess.CalledProcessError:
        return False


def main() -> int:
    problems: list[Problem] = []

    if not DOCS_DIR.exists():
        print("docs/ directory not found", file=sys.stderr)
        return 2

    md_paths = sorted(DOCS_DIR.rglob("*.md"))

    for path in md_paths:
        if path.name == "DOCS_INDEX.md":
            continue
        if not has_status_summary(path):
            problems.append(Problem(path, "Missing Status/Summary header near top"))

        text = read_text(path)
        for link in iter_markdown_links(text):
            if not exists_target(path, link):
                problems.append(Problem(path, f"Broken link target: {link}"))

        fields = extract_frontmatter_fields(path)
        status = fields.get("Status", "")
        replaced_by = fields.get("Replaced-by", "")
        if status == "Superseded" and not replaced_by:
            problems.append(Problem(path, "Status: Superseded requires Replaced-by:"))
        if replaced_by:
            target = normalize_link_target(replaced_by)
            target_path = (ROOT / target).resolve() if target.startswith(("docs/", "/")) else (path.parent / target).resolve()
            if not target_path.exists():
                problems.append(Problem(path, f"Replaced-by target does not exist: {replaced_by}"))

    # Policy: DOCS_INDEX is generated and ignored.
    docs_index = DOCS_DIR / "DOCS_INDEX.md"
    if docs_index.exists() and not git_check_ignore(docs_index):
        problems.append(Problem(docs_index, "docs/DOCS_INDEX.md should be ignored by git (.gitignore)"))

    # Noise: .DS_Store should not be tracked (at least under docs/ and .github/).
    for noise_root in (ROOT / "docs", ROOT / ".github"):
        if not noise_root.exists():
            continue
        for p in noise_root.rglob(".DS_Store"):
            if git_is_tracked(p) or not git_check_ignore(p):
                problems.append(Problem(p, "Remove .DS_Store from repo and ensure it is gitignored"))

    if problems:
        for pr in problems:
            rel = pr.path.relative_to(ROOT)
            print(f"[FAIL] {rel}: {pr.message}")
        print(f"\nTotal failures: {len(problems)}", file=sys.stderr)
        return 1

    print("OK: docs validation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
