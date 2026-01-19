#!/usr/bin/env python3
from pathlib import Path
import subprocess
import datetime

ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"
OUTPUT = DOCS_DIR / "DOCS_INDEX.md"


def git_date(path: Path):
    rel = path.relative_to(ROOT)
    try:
        created = subprocess.check_output(
            ["git", "log", "--diff-filter=A", "--format=%aI", "--", str(rel)],
            cwd=ROOT,
            text=True,
        ).strip().splitlines()
        updated = subprocess.check_output(
            ["git", "log", "-1", "--format=%aI", "--", str(rel)],
            cwd=ROOT,
            text=True,
        ).strip()
        created_at = created[-1] if created else ""
        return created_at, updated
    except Exception:
        return "", ""


def extract_status_and_description(path: Path):
    try:
        lines = path.read_text().splitlines()
    except Exception:
        return "", ""
    status = ""
    summary = ""
    for line in lines[:5]:
        if line.startswith("Status:"):
            status = line.replace("Status:", "").strip()
            break
    for line in lines[:8]:
        if line.startswith("Summary:"):
            summary = line.replace("Summary:", "").strip()
            break
    if summary:
        cleaned = summary.replace("`", "").replace("*", "").replace("_", "")
        return status, cleaned
    # Description: first non-empty non-heading line after optional status
    description = ""
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("#"):
            continue
        if stripped.startswith("Status:"):
            continue
        if stripped.startswith("Summary:"):
            continue
        description = stripped
        break
    description = description.replace("`", "").replace("*", "").replace("_", "")
    return status, description


def main():
    rows = []
    for path in sorted(DOCS_DIR.rglob("*.md")):
        if path.name == "DOCS_INDEX.md":
            continue
        status, description = extract_status_and_description(path)
        created_at, updated_at = git_date(path)
        rows.append((str(path.relative_to(ROOT)), status, description, created_at, updated_at))

    header = [
        "# DOCS_INDEX",
        "",
        "ドキュメント一覧（Status/作成日/更新日）。日付は git log に基づきます。",
        "",
        "| No | Path | Status | Description | Created (ISO) | Updated (ISO) |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    body = []
    for idx, (path, status, desc, created, updated) in enumerate(rows, start=1):
        body.append(
            f"| {idx} | `{path}` | {status or '-'} | {desc or '-'} | {created or '-'} | {updated or '-'} |"
        )
    OUTPUT.write_text("\n".join(header + body) + "\n")
    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    main()
