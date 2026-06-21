---
name: forge-replay
description: Reconstruct what happened during a past forge session — read forge-history.jsonl (or an archived ledger file) and produce a narrative summary of the events. Useful for post-mortem debugging when a build went wrong, or when returning to a project after time away.
argument-hint: "[optional: --since <ISO timestamp> | --file <path> | --issue <N>]"
allowed-tools: Read, Bash
---

# forge:replay — Reconstruct a past session from the ledger

Read `forge-history.jsonl` (or an archived `forge-history-YYYYMMDD-HHMMSS.jsonl` if specified via `--file`).

If the file doesn't exist:
> No tracking ledger found at `forge-history.jsonl`. Look for archived ledgers with: `ls forge-history-*.jsonl 2>/dev/null`

## Step 1 — Parse the argument

The user may pass:
- `--since 2026-05-08T00:00:00Z` — only events at or after this timestamp
- `--file forge-history-20260507-143200.jsonl` — replay an archived ledger
- `--issue 42` — only events related to issue #42

Default (no args): replay the entire current `forge-history.jsonl`.

## Step 2 — Emit the timeline header

Show the date range and event count using the timeline script:

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-timeline.sh [pass-through args]
```

## Step 3 — Synthesize a narrative

Read the events and produce a human-readable narrative. Group by phase. For each phase:

- When did it start? (first `phase_change` event into this phase, or the first `spawn` if no `phase_change`)
- When did it end? (next `phase_change` out, or the last event in the phase)
- How long did it take? (duration calc)
- Which agents ran? Which issues built? Which failed?
- Were any reviewer findings raised? Were any regressions found?

Example output shape:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Replay of [filename]
 [N] events between [first ts] and [last ts]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase: ready → frontend-review (2026-05-08 14:00 → 14:32, duration 32m)
  Spawned: build-team-lead, frontend-builder × 4, code-reviewer, arch-reviewer
  Issues built:    #42, #43, #44, #45 (4 of 4 succeeded)
  Issues failed:   none
  Reviewer findings:
    HIGH (inline):  2  (issue #42, issue #44)
    MED/LOW issued: 5  ([CODE]: 3, [ARCH]: 2)
  Regression: pass — 8 routes swept, 0 regressions
  Design refs read: 4 of 4 builders (100% coverage)

Phase: frontend-review → approved (2026-05-08 16:15)
  Manual approval via /forge:approve

Phase: approved → integration-review (2026-05-08 16:18 → 17:02, duration 44m)
  Spawned: build-team-lead, db-designer, backend-builder × 3, integration-agent
  ...

Audits run: 1
  2026-05-08 17:30 — 18 findings (CRIT: 1, HIGH: 3, MED: 9, LOW: 5)

Anomalies detected:
  • frontend-builder issue #42: HIGH finding from code-reviewer mid-build (auto-fixed inline)
  • test-runner skipped 3 times during /forge:implement passes (no source changes)
```

## Step 4 — Highlight anomalies

After the narrative, scan for items that deserve attention:
- `task_failed` events — what failed and why?
- `regression_run` with `status: fail` — which routes broke?
- Missing `design_refs_read` events on frontend-builder tasks — coverage gap
- Long gaps between events (>30 min) — possibly a stalled or interrupted run

Surface these as a short "Anomalies detected" list at the end.

## Step 5 — Suggest follow-up

Based on what the replay shows:
- If the latest phase has unresolved findings → suggest `/forge:implement` or `/forge:review`
- If audits show critical findings → suggest immediate `/forge:implement [audit-issue-N]`
- If regressions failed → point at the failing route(s)
- If the replay is of an archived (closed-out) session → just confirm the final phase the project ended in

---

## Rules

- Don't fabricate events — only report what's in the ledger
- If the ledger is empty or only has 1–2 events, say so plainly — no narrative needed
- Timestamps in the narrative use the ledger's UTC timestamps converted to a `YYYY-MM-DD HH:MM` shape; mention "UTC"
- Total replay output should fit on a screen for typical builds (~50–200 lines max). For very long sessions, summarize per-phase with totals; offer to show full timeline with `${CLAUDE_PLUGIN_ROOT}/scripts/forge-timeline.sh`
