#!/usr/bin/env python3
"""
build-codebase-cache.py — One-shot codebase scanner for forge audit teams.

Usage:
    python3 build-codebase-cache.py [project-root]

Produces a .forge-cache/ directory with pre-scanned data that audit agents
can read instead of each re-scanning the codebase. This cuts token usage
by ~60-70% for audit teams (13 agents across forge-audit, forge-ux-audit,
and forge-workflow-audit).

Output files (all under .forge-cache/):
    index.json            — metadata: timestamp, counts, project info
    files.txt             — all source files, one per line
    pages.txt             — Next.js page files (App + Pages Router)
    api-routes.txt        — Next.js API routes + FastAPI endpoints
    error-boundaries.txt  — error.tsx, 404.tsx, etc.
    loading-files.txt     — loading.tsx, Suspense fallbacks
    todos.txt             — grep -n TODO/FIXME/HACK/XXX
    imports.txt           — grep -n all imports
    exports.txt           — grep -n all exports
    buttons.txt           — grep -n <Button> and <button> with onClick
    empty-handlers.txt    — onClick={}, onClick={undefined}
    forms.txt             — form onSubmit/handleSubmit
    api-calls.txt         — fetch/axios/useMutation/useQuery
    state-hooks.txt       — useState/useRef/useEffect
    auth-usage.txt        — role/permission/auth checks
    db-models.txt         — ORM model files
    migrations.txt        — migration files
    dialogs.txt           — Dialog/Modal/Sheet usage
    feedback.txt          — toast/notification/alert calls
    navigation.txt        — Link/router.push/href/navigate
    secrets-scan.txt      — potential hardcoded secrets
    summary.md            — human-readable summary with counts
"""

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

IGNORE_DIRS = {
    "node_modules", ".next", ".nuxt", "dist", "build", ".git",
    "__pycache__", ".venv", "venv", "env", ".forge-cache",
    ".turbo", ".cache", "coverage", ".parcel-cache", ".vercel",
}
SOURCE_EXTS = {".tsx", ".ts", ".jsx", ".js", ".py", ".sql", ".css", ".html", ".mjs", ".cjs"}


def is_ignored(path: Path) -> bool:
    return any(part in IGNORE_DIRS for part in path.parts)


def find_files(root: Path):
    files = []
    for p in root.rglob("*"):
        if p.is_file() and p.suffix in SOURCE_EXTS and not is_ignored(p.relative_to(root)):
            files.append(p.relative_to(root))
    return sorted(files, key=lambda p: str(p))


def grep_lines(root: Path, pattern: str, files: list[Path], flags: str = "") -> list[str]:
    """Run grep-style search using Python (portable, no shell issues)."""
    regex = re.compile(pattern, re.MULTILINE | (re.IGNORECASE if "i" in flags else 0))
    hits = []
    for rel_path in files:
        try:
            full = root / rel_path
            content = full.read_text(encoding="utf-8", errors="ignore")
            for i, line in enumerate(content.splitlines(), start=1):
                if regex.search(line):
                    hits.append(f"{rel_path}:{i}:{line.strip()[:200]}")
        except (OSError, UnicodeDecodeError):
            continue
    return hits


def write_section(cache: Path, filename: str, lines: list[str], header: str = ""):
    path = cache / filename
    content = ""
    if header:
        content += f"# {header}\n# count: {len(lines)}\n\n"
    content += "\n".join(lines)
    path.write_text(content, encoding="utf-8")
    return len(lines)


def detect_framework(root: Path) -> dict:
    info = {"frontend": "none", "backend": "none", "routing": "none", "ui_lib": "none", "monorepo": False}

    # Find all package.json files up to depth 4 (handles monorepos)
    pkg_files = []
    for depth in range(5):
        for p in root.glob("*/" * depth + "package.json"):
            if not is_ignored(p.relative_to(root)):
                pkg_files.append(p)
        if pkg_files and depth > 0:
            info["monorepo"] = depth > 0 and any(pkg_files[0] != root / "package.json" for _ in [1])

    all_deps = {}
    for pkg in pkg_files:
        try:
            data = json.loads(pkg.read_text(encoding="utf-8"))
            all_deps.update(data.get("dependencies", {}))
            all_deps.update(data.get("devDependencies", {}))
        except (json.JSONDecodeError, OSError):
            continue

    if "next" in all_deps:
        info["frontend"] = "nextjs"
    elif "react" in all_deps:
        info["frontend"] = "react"
    elif "vue" in all_deps:
        info["frontend"] = "vue"
    elif "svelte" in all_deps:
        info["frontend"] = "svelte"

    # Detect routing by looking for page files anywhere
    if info["frontend"] == "nextjs":
        has_app = any(p.name in {"page.tsx", "page.jsx", "page.ts"} for p in root.rglob("page.*") if not is_ignored(p.relative_to(root)))
        has_pages = any("pages" in p.parts and p.suffix in {".tsx", ".jsx"} for p in root.rglob("*") if not is_ignored(p.relative_to(root)))
        if has_app:
            info["routing"] = "app-router"
        elif has_pages:
            info["routing"] = "pages-router"

    if any("shadcn" in k for k in all_deps) or (root / "components.json").exists() or any((p.parent / "components.json").exists() for p in pkg_files):
        info["ui_lib"] = "shadcn"
    elif "@mui/material" in all_deps:
        info["ui_lib"] = "mui"
    elif "@chakra-ui/react" in all_deps:
        info["ui_lib"] = "chakra"

    # Backend detection: check all pyproject.toml files
    for pyproject in root.rglob("pyproject.toml"):
        if is_ignored(pyproject.relative_to(root)):
            continue
        try:
            content = pyproject.read_text(encoding="utf-8", errors="ignore").lower()
            if "fastapi" in content:
                info["backend"] = "fastapi"
                break
            elif "django" in content:
                info["backend"] = "django"
                break
            elif "flask" in content:
                info["backend"] = "flask"
                break
        except OSError:
            continue

    return info


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    print(f"Scanning: {root}")

    cache = root / ".forge-cache"
    cache.mkdir(exist_ok=True)

    # Add .forge-cache to .gitignore so users don't commit it
    gitignore = root / ".gitignore"
    if gitignore.exists():
        try:
            existing = gitignore.read_text(encoding="utf-8")
            if ".forge-cache" not in existing:
                with gitignore.open("a", encoding="utf-8") as f:
                    f.write("\n# Forge audit cache (regenerated by scripts/build-codebase-cache.py)\n.forge-cache/\n")
        except OSError:
            pass

    # ── 1. File inventory ──────────────────────────────────────────
    print("  [1/15] Finding source files...")
    all_files = find_files(root)
    write_section(cache, "files.txt", [str(f).replace("\\", "/") for f in all_files], "All source files")

    ts_files = [f for f in all_files if f.suffix in {".tsx", ".ts", ".jsx", ".js"}]
    py_files = [f for f in all_files if f.suffix == ".py"]

    # ── 2. Pages (Next.js routing) ─────────────────────────────────
    print("  [2/15] Finding pages...")
    pages = [f for f in all_files if f.name in {"page.tsx", "page.jsx", "page.ts", "page.js"}]
    pages += [f for f in all_files if "pages/" in str(f).replace("\\", "/") and f.suffix in {".tsx", ".jsx"} and f.stem not in {"_app", "_document", "_error"}]
    write_section(cache, "pages.txt", [str(f).replace("\\", "/") for f in pages], "Page files")

    # ── 3. API routes ──────────────────────────────────────────────
    print("  [3/15] Finding API routes...")
    api_routes = [f for f in all_files if f.name in {"route.ts", "route.js"} and "api" in str(f).replace("\\", "/")]
    api_routes += [f for f in all_files if "pages/api" in str(f).replace("\\", "/")]
    fastapi_routes = grep_lines(root, r"@(app|router)\.(get|post|put|patch|delete|head|options)\s*\(", py_files)
    api_lines = [str(f).replace("\\", "/") for f in api_routes] + fastapi_routes
    write_section(cache, "api-routes.txt", api_lines, "API routes")

    # ── 4. Error boundaries & loading states ───────────────────────
    print("  [4/15] Finding error/loading files...")
    error_files = [f for f in all_files if f.name in {"error.tsx", "error.jsx", "not-found.tsx", "404.tsx", "500.tsx"}]
    loading_files = [f for f in all_files if f.name in {"loading.tsx", "loading.jsx"}]
    write_section(cache, "error-boundaries.txt", [str(f).replace("\\", "/") for f in error_files], "Error boundary files")
    write_section(cache, "loading-files.txt", [str(f).replace("\\", "/") for f in loading_files], "Loading state files")

    # ── 5. TODOs / FIXMEs ──────────────────────────────────────────
    print("  [5/15] Scanning TODOs...")
    todos = grep_lines(root, r"\b(TODO|FIXME|HACK|XXX|KLUDGE|BUG)\b", all_files)
    write_section(cache, "todos.txt", todos, "TODO/FIXME/HACK comments")

    # ── 6. Imports & exports ───────────────────────────────────────
    print("  [6/15] Scanning imports/exports...")
    imports = grep_lines(root, r"^\s*import\s+", ts_files)
    exports = grep_lines(root, r"^\s*export\s+(function|const|class|interface|type|default)", ts_files)
    write_section(cache, "imports.txt", imports, "Imports")
    write_section(cache, "exports.txt", exports, "Exports")

    # ── 7. Buttons (interactive elements) ──────────────────────────
    print("  [7/15] Scanning buttons...")
    buttons = grep_lines(root, r"<(Button|button|IconButton)\b", ts_files)
    write_section(cache, "buttons.txt", buttons, "Button elements")

    empty_handlers = grep_lines(root, r"onClick\s*=\s*\{\s*(\(\s*\)\s*=>\s*\{\s*\}|undefined|null)\s*\}", ts_files)
    empty_handlers += grep_lines(root, r"onClick\s*=\s*\{.*TODO.*\}", ts_files)
    write_section(cache, "empty-handlers.txt", empty_handlers, "Empty/undefined onClick handlers")

    # ── 8. Forms ───────────────────────────────────────────────────
    print("  [8/15] Scanning forms...")
    forms = grep_lines(root, r"(onSubmit|handleSubmit|<form|<Form)\b", ts_files)
    write_section(cache, "forms.txt", forms, "Forms and submit handlers")

    # ── 9. API calls ───────────────────────────────────────────────
    print("  [9/15] Scanning API calls...")
    api_calls = grep_lines(root, r"\b(fetch|axios|useMutation|useQuery|useSWR|useSuspenseQuery)\s*[\(\.]", ts_files)
    write_section(cache, "api-calls.txt", api_calls, "API call sites")

    # ── 10. Hooks / state ──────────────────────────────────────────
    print("  [10/15] Scanning state hooks...")
    hooks = grep_lines(root, r"\b(useState|useEffect|useRef|useMemo|useCallback|useContext|useReducer)\s*\(", ts_files)
    write_section(cache, "state-hooks.txt", hooks, "React state hooks")

    # ── 11. Auth / permissions ─────────────────────────────────────
    print("  [11/15] Scanning auth...")
    auth = grep_lines(root, r"\b(getServerSession|getSession|withAuth|requireAuth|currentUser|useSession|isAdmin|hasRole|checkPermission|authorize|middleware)\b", all_files)
    write_section(cache, "auth-usage.txt", auth, "Auth/permission usage")

    # ── 12. DB models & migrations ─────────────────────────────────
    print("  [12/15] Scanning DB...")
    models = [f for f in all_files if any(p in str(f).replace("\\", "/") for p in ("models/", "schema/", "entity/", "entities/"))]
    migrations = [f for f in all_files if "migrations" in str(f).replace("\\", "/") or "alembic" in str(f).replace("\\", "/")]
    write_section(cache, "db-models.txt", [str(f).replace("\\", "/") for f in models], "ORM model files")
    write_section(cache, "migrations.txt", [str(f).replace("\\", "/") for f in migrations], "Migration files")

    # ── 13. Dialogs / feedback ─────────────────────────────────────
    print("  [13/15] Scanning dialogs and feedback...")
    dialogs = grep_lines(root, r"<(Dialog|Modal|Sheet|Drawer|AlertDialog|Popover)\b", ts_files)
    write_section(cache, "dialogs.txt", dialogs, "Dialogs/modals/sheets")

    feedback = grep_lines(root, r"\b(toast|sonner|notification)\s*[\(\.]", ts_files)
    write_section(cache, "feedback.txt", feedback, "Toast/notification calls")

    # ── 14. Navigation ─────────────────────────────────────────────
    print("  [14/15] Scanning navigation...")
    navigation = grep_lines(root, r'(href=["\{]|router\.push|router\.replace|redirect\(|navigate\()', ts_files)
    write_section(cache, "navigation.txt", navigation, "Navigation targets")

    # ── 15. Secrets scan ───────────────────────────────────────────
    print("  [15/15] Scanning for potential secrets...")
    secrets = grep_lines(
        root,
        r'(api[_-]?key|secret|password|token|bearer)\s*[=:]\s*["\'][A-Za-z0-9_\-/+=]{16,}',
        all_files,
        flags="i",
    )
    write_section(cache, "secrets-scan.txt", secrets, "Potential hardcoded secrets")

    # ── Metadata ───────────────────────────────────────────────────
    framework = detect_framework(root)
    counts = {
        "files": len(all_files),
        "ts_files": len(ts_files),
        "py_files": len(py_files),
        "pages": len(pages),
        "api_routes": len(api_routes) + len(fastapi_routes),
        "error_boundaries": len(error_files),
        "loading_files": len(loading_files),
        "todos": len(todos),
        "buttons": len(buttons),
        "empty_handlers": len(empty_handlers),
        "forms": len(forms),
        "api_calls": len(api_calls),
        "state_hooks": len(hooks),
        "auth_usage": len(auth),
        "db_models": len(models),
        "migrations": len(migrations),
        "dialogs": len(dialogs),
        "feedback_calls": len(feedback),
        "navigation_targets": len(navigation),
        "potential_secrets": len(secrets),
    }

    index = {
        "version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "project_root": str(root),
        "framework": framework,
        "counts": counts,
        "files_scanned": len(all_files),
    }
    (cache / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")

    # ── Human summary ──────────────────────────────────────────────
    summary_lines = [
        "# Codebase Cache Summary",
        "",
        f"- **Generated**: {index['generated_at']}",
        f"- **Project**: {root}",
        f"- **Framework**: {framework['frontend']} ({framework['routing']}) + {framework['backend']}",
        f"- **UI library**: {framework['ui_lib']}",
        "",
        "## Counts",
        "",
        "| Metric | Count |",
        "|---|---|",
    ]
    for k, v in counts.items():
        summary_lines.append(f"| {k.replace('_', ' ').title()} | {v} |")
    summary_lines += [
        "",
        "## How to use",
        "",
        "Read specific files under `.forge-cache/` instead of rescanning the codebase:",
        "",
        "- `files.txt` — all source files",
        "- `pages.txt` — Next.js pages",
        "- `api-routes.txt` — API routes (both frontend and backend)",
        "- `todos.txt` — all TODO/FIXME/HACK comments",
        "- `buttons.txt` — all button elements with likely onClick",
        "- `empty-handlers.txt` — onClick={}, onClick={undefined}",
        "- `forms.txt` — all form elements and handlers",
        "- `api-calls.txt` — fetch/axios/useMutation/useQuery sites",
        "- `state-hooks.txt` — useState/useEffect/etc usage",
        "- `auth-usage.txt` — role/permission/auth checks",
        "- `db-models.txt` — ORM model file paths",
        "- `migrations.txt` — migration file paths",
        "- `dialogs.txt` — Dialog/Modal/Sheet usage",
        "- `feedback.txt` — toast/notification calls",
        "- `navigation.txt` — Link/router.push/href usage",
        "- `error-boundaries.txt` — error.tsx, 404.tsx files",
        "- `loading-files.txt` — loading.tsx files",
        "- `secrets-scan.txt` — potential hardcoded secrets",
        "",
        "Format of grep-style files: `path:line:content`",
    ]
    (cache / "summary.md").write_text("\n".join(summary_lines), encoding="utf-8")

    # ── Print result ───────────────────────────────────────────────
    print("")
    print(f"Cache built at: {cache}")
    print(f"Files scanned: {len(all_files)}")
    print(f"TODOs: {len(todos)}  Buttons: {len(buttons)}  Forms: {len(forms)}")
    print(f"API calls: {len(api_calls)}  Pages: {len(pages)}  Routes: {counts['api_routes']}")
    print("")
    print("Audit agents should read .forge-cache/*.txt instead of rescanning.")


if __name__ == "__main__":
    main()
