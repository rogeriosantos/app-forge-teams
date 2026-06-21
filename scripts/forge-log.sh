#!/usr/bin/env bash
# forge-log.sh — Append a structured event to forge-history.jsonl
#
# Usage:
#   forge-log.sh <agent-name> <event-type> [key=value ...]
#
# Examples:
#   forge-log.sh frontend-builder task_done issue=42 commit=abc1234 files=3
#   forge-log.sh code-reviewer finding_high issue=42 file=app/page.tsx severity=HIGH
#   forge-log.sh build-team-lead phase_change from=ready to=frontend-review
#   forge-log.sh test-runner regression_skipped reason="no source changes since 2026-05-08T12:00Z"
#
# Writes to: ./forge-history.jsonl in the current working directory.
# Append-only, one JSON object per line. Safe for concurrent agents.
#
# Schema (see also: docs/tracking-ledger.md):
#   ts:     ISO-8601 UTC timestamp
#   agent:  agent or skill name that emitted the event
#   event:  event type (see EVENT TYPES below)
#   ...:    arbitrary key=value pairs from the caller
#
# EVENT TYPES:
#   spawn                 — orchestrator spawned a worker agent
#   task_started          — worker agent claimed a task
#   task_done             — worker agent completed a task
#   task_failed           — worker agent failed
#   finding_high          — reviewer sent a HIGH finding inline
#   finding_issued        — reviewer created a GitHub issue (MED/LOW)
#   regression_run        — test-runner full sweep
#   regression_skipped    — test-runner staleness skip
#   audit_run             — forge:audit completion summary
#   phase_change          — forge-state.json phase transition
#   design_refs_read      — frontend-builder logged which design docs it consulted
#   review_done           — reviewer reported team-lead done
#   shutdown              — agent received shutdown signal

set -e

if [ $# -lt 2 ]; then
  echo "usage: forge-log.sh <agent-name> <event-type> [key=value ...]" >&2
  exit 1
fi

agent="$1"; shift
event="$1"; shift

ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Build the JSON object — start with required fields
json=$(printf '{"ts":"%s","agent":"%s","event":"%s"' "$ts" "$agent" "$event")

# Append each key=value pair as a JSON field
for kv in "$@"; do
  key="${kv%%=*}"
  val="${kv#*=}"
  # Numeric values pass through; string values get quoted + escaped
  if [[ "$val" =~ ^-?[0-9]+(\.[0-9]+)?$ ]]; then
    json="${json},\"${key}\":${val}"
  else
    # Escape backslash, quote, and control chars for JSON
    esc=$(printf '%s' "$val" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/	/\\t/g' -e 's/\r/\\r/g' -e 's/\n/\\n/g')
    json="${json},\"${key}\":\"${esc}\""
  fi
done

json="${json}}"

# Append atomically — single line, single write, append flag.
# Multiple agents writing concurrently is safe because each writes one line < PIPE_BUF.
echo "$json" >> "${FORGE_HISTORY_FILE:-./forge-history.jsonl}"
