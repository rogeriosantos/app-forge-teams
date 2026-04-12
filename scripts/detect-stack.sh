#!/usr/bin/env bash
# Detect the project's tech stack, framework, and routing strategy.
# Usage: bash detect-stack.sh [project-root]
# Output: key=value pairs on stdout

set -euo pipefail
ROOT="${1:-.}"

echo "project_root=$ROOT"

# --- Project name ---
if [ -f "$ROOT/package.json" ]; then
    NAME=$(grep -m1 '"name"' "$ROOT/package.json" 2>/dev/null | sed 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    echo "project_name=$NAME"
elif [ -f "$ROOT/pyproject.toml" ]; then
    NAME=$(grep -m1 '^name' "$ROOT/pyproject.toml" 2>/dev/null | sed 's/.*=\s*"\(.*\)"/\1/')
    echo "project_name=$NAME"
else
    echo "project_name=$(basename "$ROOT")"
fi

# --- Frontend framework ---
if [ -f "$ROOT/next.config.ts" ] || [ -f "$ROOT/next.config.js" ] || [ -f "$ROOT/next.config.mjs" ]; then
    echo "frontend=nextjs"
    # Detect App Router vs Pages Router
    if [ -d "$ROOT/app" ] || [ -d "$ROOT/src/app" ]; then
        echo "routing=app-router"
    elif [ -d "$ROOT/pages" ] || [ -d "$ROOT/src/pages" ]; then
        echo "routing=pages-router"
    fi
elif grep -q '"react"' "$ROOT/package.json" 2>/dev/null; then
    echo "frontend=react"
elif grep -q '"vue"' "$ROOT/package.json" 2>/dev/null; then
    echo "frontend=vue"
elif grep -q '"svelte"' "$ROOT/package.json" 2>/dev/null; then
    echo "frontend=svelte"
else
    echo "frontend=none"
fi

# --- UI library ---
if grep -q '"@shadcn' "$ROOT/package.json" 2>/dev/null || [ -f "$ROOT/components.json" ]; then
    echo "ui_library=shadcn"
elif grep -q '"@mui' "$ROOT/package.json" 2>/dev/null; then
    echo "ui_library=mui"
elif grep -q '"@chakra' "$ROOT/package.json" 2>/dev/null; then
    echo "ui_library=chakra"
else
    echo "ui_library=unknown"
fi

# --- Backend ---
if [ -f "$ROOT/pyproject.toml" ] || [ -f "$ROOT/backend/pyproject.toml" ]; then
    if grep -q "fastapi" "$ROOT/pyproject.toml" 2>/dev/null || grep -q "fastapi" "$ROOT/backend/pyproject.toml" 2>/dev/null; then
        echo "backend=fastapi"
    elif grep -q "django" "$ROOT/pyproject.toml" 2>/dev/null; then
        echo "backend=django"
    elif grep -q "flask" "$ROOT/pyproject.toml" 2>/dev/null; then
        echo "backend=flask"
    else
        echo "backend=python"
    fi
elif grep -q '"express"' "$ROOT/package.json" 2>/dev/null; then
    echo "backend=express"
elif grep -q '"hono"' "$ROOT/package.json" 2>/dev/null; then
    echo "backend=hono"
else
    echo "backend=none"
fi

# --- Database ---
if find "$ROOT" -maxdepth 3 -name "*.sql" -o -name "alembic.ini" -o -name "migrations" -type d 2>/dev/null | grep -q .; then
    echo "database=yes"
    if grep -q "postgresql\|postgres\|psycopg\|asyncpg" "$ROOT/pyproject.toml" "$ROOT/backend/pyproject.toml" 2>/dev/null; then
        echo "db_type=postgresql"
    elif grep -q "sqlite" "$ROOT/pyproject.toml" 2>/dev/null; then
        echo "db_type=sqlite"
    fi
else
    echo "database=no"
fi

# --- Monorepo ---
if [ -f "$ROOT/turbo.json" ] || [ -f "$ROOT/pnpm-workspace.yaml" ] || [ -f "$ROOT/lerna.json" ]; then
    echo "monorepo=yes"
else
    echo "monorepo=no"
fi

# --- Forge state ---
if [ -f "$ROOT/forge-state.json" ]; then
    PHASE=$(grep -m1 '"phase"' "$ROOT/forge-state.json" 2>/dev/null | sed 's/.*"phase"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    echo "forge_phase=$PHASE"
fi
if [ -f "$ROOT/forge-prd.md" ]; then echo "has_prd=yes"; else echo "has_prd=no"; fi
if [ -f "$ROOT/forge-context.md" ]; then echo "has_context=yes"; else echo "has_context=no"; fi
