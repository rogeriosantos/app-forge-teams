#!/usr/bin/env bash
# forge-metrics.sh — Aggregate stats from forge-history.jsonl
#
# Usage: forge-metrics.sh [--file <path>]
#
# Outputs a metrics report covering:
#   - Phase durations
#   - Issues built / failed
#   - Reviewer findings (HIGH inline vs MED/LOW issued)
#   - Regression skip rate
#   - Design-ref read coverage
#   - Audit findings by severity
#   - Most active agents
#   - Cache hit rate (context7)

set -e

FILE="${1:-forge-history.jsonl}"
[ "$1" = "--file" ] && FILE="$2"

if [ ! -f "$FILE" ]; then
  echo "No ledger at $FILE" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

total_events=$(wc -l < "$FILE" | tr -d ' ')
first_ts=$(head -1 "$FILE" | jq -r '.ts')
last_ts=$(tail -1 "$FILE" | jq -r '.ts')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Forge Metrics  ($total_events events between $first_ts and $last_ts)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Phase transitions"
echo "─────────────────"
jq -r 'select(.event == "phase_change") | "  \(.ts | sub("T"; " ") | sub("Z$"; ""))  \(.from) → \(.to)"' "$FILE" || echo "  (none)"
echo ""

echo "Build progress (builder agents only)"
echo "─────────────────────────────────────"
# Count only events from frontend-builder/backend-builder/db-designer/integration-agent —
# these are the "builders" whose task_started/task_done pairs are meaningful.
BUILDER_FILTER='select(.agent | IN("frontend-builder","backend-builder","db-designer","integration-agent"))'
B_STARTED=$(jq -c "$BUILDER_FILTER | select(.event == \"task_started\")" "$FILE" | wc -l | tr -d ' ')
B_DONE=$(jq -c "$BUILDER_FILTER | select(.event == \"task_done\")" "$FILE" | wc -l | tr -d ' ')
B_FAILED=$(jq -c "$BUILDER_FILTER | select(.event == \"task_failed\")" "$FILE" | wc -l | tr -d ' ')
echo "  Started: $B_STARTED"
echo "  Done:    $B_DONE"
echo "  Failed:  $B_FAILED"
if [ "$B_STARTED" -gt 0 ]; then
  TERMINAL=$((B_DONE + B_FAILED))
  if [ "$TERMINAL" -gt 0 ]; then
    PCT=$(( B_DONE * 100 / TERMINAL ))
    echo "  Success rate: $PCT%  (done / (done + failed))"
  fi
  if [ "$B_STARTED" -gt "$TERMINAL" ]; then
    INFLIGHT=$((B_STARTED - TERMINAL))
    echo "  In flight:    $INFLIGHT"
  fi
fi
echo ""

echo "Reviewer findings"
echo "─────────────────"
HIGH=$(jq -c 'select(.event == "finding_high")' "$FILE" | wc -l | tr -d ' ')
ISSUED=$(jq -c 'select(.event == "finding_issued")' "$FILE" | wc -l | tr -d ' ')
echo "  HIGH (sent inline to builders): $HIGH"
echo "  MED/LOW (created as GH issues):  $ISSUED"
if [ "$HIGH" -gt 0 ] || [ "$ISSUED" -gt 0 ]; then
  TOTAL=$((HIGH + ISSUED))
  echo "  Total: $TOTAL"
fi
echo ""
echo "  Findings by reviewer:"
jq -r 'select(.event == "finding_high" or .event == "finding_issued") | .agent' "$FILE" | sort | uniq -c | sort -rn | sed 's/^/    /'
echo ""

echo "Regression runs"
echo "───────────────"
RR=$(jq -c 'select(.event == "regression_run")' "$FILE" | wc -l | tr -d ' ')
RS=$(jq -c 'select(.event == "regression_skipped")' "$FILE" | wc -l | tr -d ' ')
echo "  Full runs:     $RR"
echo "  Skipped:       $RS"
if [ "$RR" -gt 0 ] || [ "$RS" -gt 0 ]; then
  TOTAL=$((RR + RS))
  if [ "$TOTAL" -gt 0 ]; then
    PCT=$(( RS * 100 / TOTAL ))
    echo "  Skip rate:     $PCT%  (higher = better — staleness check is doing its job)"
  fi
fi
PASS=$(jq -c 'select(.event == "regression_run" and .status == "pass")' "$FILE" | wc -l | tr -d ' ')
FAIL=$(jq -c 'select(.event == "regression_run" and .status == "fail")' "$FILE" | wc -l | tr -d ' ')
echo "  Pass / Fail:   $PASS / $FAIL"
echo ""

echo "Design-reference read coverage"
echo "──────────────────────────────"
DRR=$(jq -c 'select(.event == "design_refs_read")' "$FILE" | wc -l | tr -d ' ')
FB_TASKS=$(jq -c 'select(.agent == "frontend-builder" and .event == "task_started")' "$FILE" | wc -l | tr -d ' ')
echo "  frontend-builder task_started events: $FB_TASKS"
echo "  design_refs_read events:              $DRR"
if [ "$FB_TASKS" -gt 0 ]; then
  PCT=$(( DRR * 100 / FB_TASKS ))
  echo "  Coverage:                             $PCT%  (target: 100% — every UI build should consult the design system)"
fi
echo ""

echo "Audits"
echo "──────"
AUDITS=$(jq -c 'select(.event == "audit_run")' "$FILE" | wc -l | tr -d ' ')
echo "  Total audit runs: $AUDITS"
if [ "$AUDITS" -gt 0 ]; then
  echo "  Findings totals:"
  jq -c 'select(.event == "audit_run") | "  \(.ts | sub("T"; " ")) — total: \(.total // 0), CRIT: \(.critical // 0), HIGH: \(.high // 0), MED: \(.medium // 0), LOW: \(.low // 0)"' "$FILE" | sed 's/^"//' | sed 's/"$//'
fi
echo ""

echo "Top 5 most active agents"
echo "────────────────────────"
jq -r '.agent' "$FILE" | sort | uniq -c | sort -rn | head -5 | sed 's/^/  /'
echo ""

echo "Event type distribution"
echo "───────────────────────"
jq -r '.event' "$FILE" | sort | uniq -c | sort -rn | sed 's/^/  /'
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
