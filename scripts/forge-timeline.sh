#!/usr/bin/env bash
# forge-timeline.sh — Pretty-print forge-history.jsonl as a chronological timeline
#
# Usage:
#   forge-timeline.sh [--since <ISO timestamp>] [--agent <name>] [--phase <name>]
#                     [--file <path>]
#
# Examples:
#   forge-timeline.sh                              # full timeline
#   forge-timeline.sh --since 2026-05-08T00:00:00Z # only events since this timestamp
#   forge-timeline.sh --agent frontend-builder     # filter by agent
#   forge-timeline.sh --phase frontend-review      # only events in this phase

set -e

FILE="forge-history.jsonl"
SINCE=""
AGENT=""
PHASE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --since) SINCE="$2"; shift 2 ;;
    --agent) AGENT="$2"; shift 2 ;;
    --phase) PHASE="$2"; shift 2 ;;
    --file)  FILE="$2";  shift 2 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

if [ ! -f "$FILE" ]; then
  echo "No ledger at $FILE" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

# Build filter expression
FILTER='.'
if [ -n "$SINCE" ]; then FILTER="${FILTER} | select(.ts >= \"$SINCE\")"; fi
if [ -n "$AGENT" ]; then FILTER="${FILTER} | select(.agent == \"$AGENT\")"; fi
# Phase filter is harder — we'd need to track current phase as we walk events.
# Leave it out for now; users can post-filter with --since instead.

# Color codes (only if stdout is a tty)
if [ -t 1 ]; then
  C_DIM='\033[2m'; C_BOLD='\033[1m'; C_BLUE='\033[34m'; C_GREEN='\033[32m'
  C_YELLOW='\033[33m'; C_RED='\033[31m'; C_CYAN='\033[36m'; C_RESET='\033[0m'
else
  C_DIM=''; C_BOLD=''; C_BLUE=''; C_GREEN=''; C_YELLOW=''; C_RED=''; C_CYAN=''; C_RESET=''
fi

# Render each line
jq -c "$FILTER" "$FILE" | while IFS= read -r line; do
  ts=$(echo "$line"       | jq -r '.ts')
  agent=$(echo "$line"    | jq -r '.agent')
  event=$(echo "$line"    | jq -r '.event')

  # Pick a color per event family
  case "$event" in
    phase_change)         color="$C_BOLD$C_BLUE"   ; symbol="◆" ;;
    spawn)                color="$C_DIM"           ; symbol="↳" ;;
    task_started)         color="$C_DIM"           ; symbol="·" ;;
    task_done)            color="$C_GREEN"         ; symbol="✓" ;;
    task_failed)          color="$C_RED"           ; symbol="✗" ;;
    finding_high)         color="$C_YELLOW"        ; symbol="!" ;;
    finding_issued)       color="$C_DIM"           ; symbol="·" ;;
    review_done)          color="$C_CYAN"          ; symbol="✓" ;;
    regression_run)       color="$C_GREEN"         ; symbol="●" ;;
    regression_skipped)   color="$C_DIM"           ; symbol="○" ;;
    audit_run)            color="$C_BOLD$C_CYAN"   ; symbol="◆" ;;
    design_refs_read)     color="$C_DIM"           ; symbol="·" ;;
    *)                    color=""                  ; symbol="·" ;;
  esac

  # Extract a few useful detail fields if present
  details=""
  for key in issue commit status from to severity reason child total critical high medium low routes_swept regressions; do
    val=$(echo "$line" | jq -r --arg k "$key" '.[$k] // empty')
    [ -n "$val" ] && details="${details} ${C_DIM}${key}=${C_RESET}${val}"
  done

  short_ts=$(echo "$ts" | sed 's/T/ /; s/Z$//' | cut -c12-19)

  printf "${C_DIM}%s${C_RESET}  %b%s%b  %-22s  %-22s%s\n" \
    "$short_ts" "$color" "$symbol" "$C_RESET" \
    "$agent" "$event" "$details"
done
