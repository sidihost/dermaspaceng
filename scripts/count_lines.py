"""Count lines of code in the project, grouped by extension.

Walks the repo, skipping node_modules, .next, .git, build artefacts, and lock
files. Counts total lines, blank lines, and comment-ish lines per extension
and prints a single summary table plus a grand total.
"""
from __future__ import annotations

import os
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

SKIP_DIRS = {
    "node_modules",
    ".next",
    ".git",
    ".vercel",
    "dist",
    "build",
    "out",
    ".turbo",
    "coverage",
    "user_read_only_context",
}

EXTS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".css",
    ".scss",
    ".sql",
    ".json",
    ".md",
    ".py",
}

def is_blank(line: str) -> bool:
    return line.strip() == ""

def is_comment(line: str, ext: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if ext in {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".scss"}:
        return s.startswith("//") or s.startswith("/*") or s.startswith("*") or s.startswith("*/")
    if ext == ".sql":
        return s.startswith("--") or s.startswith("/*")
    if ext == ".py":
        return s.startswith("#")
    return False

per_ext_lines = defaultdict(int)
per_ext_blank = defaultdict(int)
per_ext_comment = defaultdict(int)
per_ext_files = defaultdict(int)

for dirpath, dirnames, filenames in os.walk(ROOT):
    # Skip unwanted directories in-place so os.walk doesn't descend
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
    for name in filenames:
        ext = os.path.splitext(name)[1].lower()
        if ext not in EXTS:
            continue
        # Skip lockfiles
        if name in {"package-lock.json", "pnpm-lock.yaml", "bun.lockb", "yarn.lock"}:
            continue
        path = os.path.join(dirpath, name)
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                lines = fh.readlines()
        except OSError:
            continue
        per_ext_files[ext] += 1
        per_ext_lines[ext] += len(lines)
        for line in lines:
            if is_blank(line):
                per_ext_blank[ext] += 1
            elif is_comment(line, ext):
                per_ext_comment[ext] += 1

def code(ext: str) -> int:
    return per_ext_lines[ext] - per_ext_blank[ext] - per_ext_comment[ext]

print(f"{'Ext':<7} {'Files':>7} {'Total':>10} {'Blank':>10} {'Comment':>10} {'Code':>10}")
print("-" * 58)
total_files = total_lines = total_blank = total_comment = total_code = 0
for ext in sorted(per_ext_lines.keys(), key=lambda e: -per_ext_lines[e]):
    files = per_ext_files[ext]
    lines = per_ext_lines[ext]
    blank = per_ext_blank[ext]
    comment = per_ext_comment[ext]
    c = code(ext)
    total_files += files
    total_lines += lines
    total_blank += blank
    total_comment += comment
    total_code += c
    print(f"{ext:<7} {files:>7} {lines:>10,} {blank:>10,} {comment:>10,} {c:>10,}")

print("-" * 58)
print(f"{'TOTAL':<7} {total_files:>7} {total_lines:>10,} {total_blank:>10,} {total_comment:>10,} {total_code:>10,}")
