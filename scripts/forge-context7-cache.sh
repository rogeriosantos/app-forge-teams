#!/usr/bin/env bash
# forge-context7-cache.sh — Cache lookup helper for context7 library docs
#
# Builders call this BEFORE invoking context7 to check if a fresh cached copy exists.
# Cache TTL: 7 days (libraries don't change daily, but training data is months old).
#
# Usage:
#   forge-context7-cache.sh check <library-id> <topic>
#     → echoes cache file path if fresh, exits 0
#     → exits 1 if not cached or stale (caller should fetch + save)
#
#   forge-context7-cache.sh save <library-id> <topic> <content-file>
#     → writes content to cache with timestamp
#
# Cache layout: .forge-cache/docs/{library-id-slug}/{topic-slug}.md

set -e

CACHE_ROOT="${FORGE_CACHE_DIR:-.forge-cache}/docs"
TTL_SECONDS=$((7 * 24 * 60 * 60))   # 7 days

slug() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -e 's/[^a-z0-9]/-/g' -e 's/--*/-/g' -e 's/^-//' -e 's/-$//'
}

cmd="${1:-}"
case "$cmd" in
  check)
    lib="$2"; topic="$3"
    file="${CACHE_ROOT}/$(slug "$lib")/$(slug "$topic").md"
    if [ -f "$file" ]; then
      now=$(date +%s)
      mtime=$(stat -f %m "$file" 2>/dev/null || stat -c %Y "$file" 2>/dev/null)
      age=$((now - mtime))
      if [ "$age" -lt "$TTL_SECONDS" ]; then
        echo "$file"
        exit 0
      fi
    fi
    exit 1
    ;;
  save)
    lib="$2"; topic="$3"; src="$4"
    dir="${CACHE_ROOT}/$(slug "$lib")"
    mkdir -p "$dir"
    cp "$src" "$dir/$(slug "$topic").md"
    echo "$dir/$(slug "$topic").md"
    ;;
  list)
    [ -d "$CACHE_ROOT" ] && find "$CACHE_ROOT" -name "*.md" -type f | sort || echo "(no cache yet)"
    ;;
  clear)
    rm -rf "$CACHE_ROOT"
    echo "Cleared $CACHE_ROOT"
    ;;
  *)
    echo "usage: forge-context7-cache.sh {check|save|list|clear} ..." >&2
    exit 2
    ;;
esac
