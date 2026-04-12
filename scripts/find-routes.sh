#!/usr/bin/env bash
# Find all routes in a Next.js or FastAPI project.
# Usage: bash find-routes.sh [project-root]
# Output: one route per line

set -euo pipefail
ROOT="${1:-.}"

echo "=== Frontend Routes ==="

# Next.js App Router
find "$ROOT" -path "*/app/**/page.tsx" -o -path "*/app/**/page.jsx" 2>/dev/null \
  | grep -v node_modules | grep -v ".next" | sort

# Next.js Pages Router
find "$ROOT" -path "*/pages/**/*.tsx" -o -path "*/pages/**/*.jsx" 2>/dev/null \
  | grep -v node_modules | grep -v ".next" | grep -v "_app" | grep -v "_document" | sort

echo ""
echo "=== API Routes ==="

# Next.js API routes
find "$ROOT" -path "*/app/api/**/route.ts" -o -path "*/app/api/**/route.js" 2>/dev/null \
  | grep -v node_modules | sort

find "$ROOT" -path "*/pages/api/**/*.ts" -o -path "*/pages/api/**/*.js" 2>/dev/null \
  | grep -v node_modules | sort

# FastAPI routes
grep -rn "@app\.\|@router\." "$ROOT" --include="*.py" 2>/dev/null \
  | grep -v node_modules | grep -v __pycache__ | grep -v ".venv" | sort

echo ""
echo "=== Error Pages ==="
find "$ROOT" -name "not-found.tsx" -o -name "error.tsx" -o -name "loading.tsx" -o -name "404.tsx" -o -name "500.tsx" 2>/dev/null \
  | grep -v node_modules | sort
