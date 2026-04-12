#!/usr/bin/env bash
# Check for required CLI tools before running forge skills.
# Usage: bash check-prerequisites.sh [skill-name]
# Output: PASS/FAIL for each tool, exit 1 if any required tool is missing

set -euo pipefail
SKILL="${1:-all}"
FAIL=0

check() {
    local tool="$1"
    local required="$2"  # "required" or "optional"
    if command -v "$tool" &>/dev/null; then
        echo "  PASS: $tool ($(command -v "$tool"))"
    elif [ "$required" = "required" ]; then
        echo "  FAIL: $tool — NOT FOUND (required)"
        FAIL=1
    else
        echo "  SKIP: $tool — not found (optional)"
    fi
}

echo "=== Prerequisites for: $SKILL ==="

# Always needed
check "git" "required"
check "node" "required"
check "npm" "required"

case "$SKILL" in
    forge-init)
        check "gh" "required"
        ;;
    forge-build-frontend|forge-build|smart-table|searchable-combobox|universal-search)
        check "npx" "required"
        ;;
    forge-build-backend)
        check "python3" "required"
        check "uv" "required"
        ;;
    forge-deploy)
        check "vercel" "optional"
        check "railway" "optional"
        ;;
    forge-tests-backend)
        check "python3" "required"
        check "uv" "required"
        ;;
    forge-tests-frontend)
        check "npx" "required"
        ;;
    all)
        check "gh" "required"
        check "npx" "required"
        check "python3" "optional"
        check "uv" "optional"
        check "vercel" "optional"
        check "railway" "optional"
        ;;
esac

if [ "$FAIL" -eq 1 ]; then
    echo ""
    echo "RESULT: FAIL — missing required tools"
    exit 1
else
    echo ""
    echo "RESULT: PASS"
    exit 0
fi
