"""disk-cleanup skill: list cleanup candidates with sizes. Read-only; deletes nothing.

Usage (from a repository root):
  python -I <skill dir>/scripts/survey.py [--root ..] [--pc] [--hours 36]

Labels:
  CANDIDATE  rebuildable or re-downloadable, not updated within --hours
  CHECK      probably rebuildable, but confirm before proposing (dist/build/out, unknown target, Git-less folders)
  RECENT     updated within --hours (possibly in use) -> do not propose
  TRACKED    not ignored by Git -> never delete
  INFO       shown for reference only (user files etc.) -> never propose
"""
import argparse
import os
import shutil
import subprocess
import sys
import time

REBUILDABLE = {
    "node_modules", ".next", ".nuxt", ".svelte-kit", ".turbo", ".parcel-cache", ".expo",
    ".venv", "venv", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache",
    ".gradle", "test-results", "playwright-report", "coverage",
}
REVIEW = {"dist", "build", "out"}
MAX_DEPTH = 6
ROOT_SETTINGS = {".git", ".claude", ".agents", ".cursor", ".vscode"}
OFFICE_WORDS = ("Office", "Word", "Excel", "PowerPoint", "POWERPNT", "WINWORD", "OneNote", "Outlook")


def tree_size(path):
    """Return (bytes, newest mtime) without following symlinks or junctions."""
    total, newest = 0, 0.0
    stack = [path]
    while stack:
        current = stack.pop()
        try:
            st = os.lstat(current)
            newest = max(newest, st.st_mtime)
            if os.path.isfile(current) and not os.path.islink(current):
                total += st.st_size
                continue
            with os.scandir(current) as entries:
                for e in entries:
                    try:
                        if e.is_symlink() or (hasattr(e, "is_junction") and e.is_junction()):
                            continue
                        if e.is_dir(follow_symlinks=False):
                            stack.append(e.path)
                        else:
                            s = e.stat(follow_symlinks=False)
                            total += s.st_size
                            newest = max(newest, s.st_mtime)
                    except OSError:
                        continue
        except OSError:
            continue
    return total, newest


def git_ignored(repo, path):
    rel = os.path.relpath(path, repo)
    r = subprocess.run(["git", "-C", repo, "check-ignore", "-q", "--", rel],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return r.returncode == 0


def is_repo(path):
    return os.path.exists(os.path.join(path, ".git"))


def scan_repo(repo, rows, cutoff):
    def visit(d, depth):
        if depth > MAX_DEPTH:
            return
        try:
            entries = [e for e in os.scandir(d) if e.is_dir(follow_symlinks=False)]
        except OSError:
            return
        for e in entries:
            name = e.name
            if name == ".git":
                continue
            if name in REBUILDABLE or name in REVIEW:
                add(e.path, "CANDIDATE" if name in REBUILDABLE else "CHECK", "")
            elif name == "target":
                if os.path.exists(os.path.join(d, "Cargo.toml")):
                    for sub in ("debug", "release"):
                        p = os.path.join(e.path, sub)
                        if os.path.isdir(p):
                            add(p, "CANDIDATE", "Rust build output (keep other folders in target)")
                else:
                    add(e.path, "CHECK", "target without Cargo.toml")
            else:
                visit(e.path, depth + 1)

    def add(path, label, note):
        size, newest = tree_size(path)
        if not git_ignored(repo, path):
            label, note = "TRACKED", "not ignored by Git"
        elif newest >= cutoff:
            label = "RECENT"
        rows.append((size, newest, label, path, note))

    visit(repo, 1)


def add_path(rows, path, label, note, cutoff):
    if not os.path.exists(path):
        return
    size, newest = tree_size(path)
    if label == "CANDIDATE" and newest >= cutoff:
        label = "RECENT"
    rows.append((size, newest, label, path, note))


def scan_pc(rows, cutoff):
    home = os.path.expanduser("~")
    local = os.environ.get("LOCALAPPDATA", os.path.join(home, "AppData", "Local"))
    roaming = os.environ.get("APPDATA", os.path.join(home, "AppData", "Roaming"))
    # Download caches: removed with their own commands, so age does not matter.
    for path, note in (
        (os.path.join(local, "npm-cache", "_cacache"), "npm cache clean --force"),
        (os.path.join(local, "uv", "cache"), "uv cache clean"),
        (os.path.join(local, "pip", "cache"), "pip cache purge"),
    ):
        if os.path.exists(path):
            size, newest = tree_size(path)
            rows.append((size, newest, "CANDIDATE", path, note))
    add_path(rows, os.path.join(local, "CrashDumps"), "CANDIDATE", "crash dumps", 0)

    temp = os.path.join(local, "Temp")
    old_size, old_count, recent_size, recent_count = 0, 0, 0, 0
    if os.path.isdir(temp):
        for e in os.scandir(temp):
            if e.name == "claude" or e.name.startswith("~") or any(w in e.name for w in OFFICE_WORDS):
                continue
            size, newest = tree_size(e.path)
            if newest < cutoff:
                old_size, old_count = old_size + size, old_count + 1
            else:
                recent_size, recent_count = recent_size + size, recent_count + 1
        rows.append((old_size, 0, "CANDIDATE", temp, f"{old_count} items older than cutoff (excluding claude, Office names)"))
        rows.append((recent_size, time.time(), "RECENT", temp, f"{recent_count} items updated recently"))

    runtimes = os.path.join(home, ".cache", "codex-runtimes")
    if os.path.isdir(runtimes):
        prev = sorted((e for e in os.scandir(runtimes) if e.is_dir() and ".previous-" in e.name),
                      key=lambda e: e.stat().st_mtime, reverse=True)
        for e in prev[1:]:
            add_path(rows, e.path, "CANDIDATE", "old Codex runtime (newest backup kept)", cutoff)

    cached = os.path.join(roaming, "Cursor", "CachedData")
    if os.path.isdir(cached):
        dirs = sorted((e for e in os.scandir(cached) if e.is_dir()), key=lambda e: e.stat().st_mtime, reverse=True)
        for e in dirs[2:]:
            add_path(rows, e.path, "CANDIDATE", "old Cursor version data (newest 2 kept)", cutoff)

    add_path(rows, "C:\\$Recycle.Bin", "CHECK", "empty only with approval: Clear-RecycleBin -DriveLetter C -Force", 0)
    vm = os.path.join(local, "Packages", "Claude_pzs8sxrjxfjjc", "LocalCache", "Roaming", "Claude", "vm_bundles")
    add_path(rows, vm, "CHECK", "Claude desktop Cowork VM (re-downloaded when used; contains session data)", 0)
    add_path(rows, os.path.join(home, "Downloads"), "INFO", "user files: never propose", 0)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default="..", help="folder that contains the repositories (default: ..)")
    ap.add_argument("--pc", action="store_true", help="also list PC-wide caches")
    ap.add_argument("--hours", type=float, default=36, help="treat items updated within this many hours as RECENT")
    ap.add_argument("--min-mb", type=float, default=1, help="hide items smaller than this (default: 1)")
    args = ap.parse_args()
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

    cutoff = time.time() - args.hours * 3600
    root = os.path.abspath(args.root)
    rows = []
    for e in sorted(os.scandir(root), key=lambda e: e.name.lower()):
        if not e.is_dir(follow_symlinks=False) or e.name in ROOT_SETTINGS:
            continue
        if is_repo(e.path):
            scan_repo(e.path, rows, cutoff)
        elif not e.name.startswith("."):
            add_path(rows, e.path, "CHECK", "Git-less folder: compare with the original's history before proposing", 0)
        else:
            add_path(rows, e.path, "CHECK", "hidden Git-less folder: compare before proposing", 0)
    if args.pc:
        scan_pc(rows, cutoff)
    rows = [r for r in rows if r[0] >= args.min_mb * 2**20]

    usage = shutil.disk_usage(root)
    print(f"free: {usage.free / 2**30:.1f} GB / total {usage.total / 2**30:.1f} GB  (root: {root})")
    order = {"CANDIDATE": 0, "CHECK": 1, "RECENT": 2, "TRACKED": 3, "INFO": 4}
    for label in sorted(order, key=order.get):
        part = sorted((r for r in rows if r[2] == label), key=lambda r: r[0], reverse=True)
        if not part:
            continue
        total = sum(r[0] for r in part)
        print(f"\n== {label}: {len(part)} items, {total / 2**20:,.0f} MB")
        for size, newest, _, path, note in part:
            last = time.strftime("%Y-%m-%d", time.localtime(newest)) if newest else "-"
            print(f"{size / 2**20:>9,.0f} MB  {last}  {path}" + (f"  [{note}]" if note else ""))


if __name__ == "__main__":
    main()
