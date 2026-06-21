# Tracking Ledger — `forge-history.jsonl`

The forge keeps an **append-only audit trail** of every meaningful event that happens during a build, review, audit, or deploy. It lives alongside `forge-state.json` in the project root.

```
my-app/
├── forge-state.json        ← current snapshot (phase, repo, deployment URLs)
├── forge-history.jsonl     ← append-only event log (this file)
└── ...
```

## Why both files?

- `forge-state.json` answers *"where am I right now?"* — it's a small mutable snapshot.
- `forge-history.jsonl` answers *"what has happened?"* — it's an immutable log.

Append-only is the right shape for parallel agents: every agent writes one line via the `scripts/forge-log.sh` helper, no locking needed (writes < `PIPE_BUF` are atomic on POSIX).

## Format

One JSON object per line. Required fields: `ts`, `agent`, `event`. Everything else is event-specific.

```jsonl
{"ts":"2026-05-08T14:23:00Z","agent":"build-team-lead","event":"phase_change","from":"ready","to":"frontend-review"}
{"ts":"2026-05-08T14:23:01Z","agent":"frontend-builder","event":"task_started","issue":42,"design_refs_read":"apple-design-system.md,table-standard.md"}
{"ts":"2026-05-08T14:25:30Z","agent":"frontend-builder","event":"task_done","issue":42,"commit":"abc1234","files":3}
{"ts":"2026-05-08T14:25:31Z","agent":"code-reviewer","event":"finding_high","issue":42,"file":"app/page.tsx","line":47}
{"ts":"2026-05-08T14:30:00Z","agent":"test-runner","event":"regression_run","status":"pass","backend_passed":12,"backend_failed":0,"routes_swept":8}
```

## Event types

| Event | Emitted by | Required keys |
|---|---|---|
| `spawn` | orchestrators (build-team-lead, issue-dispatcher, audit lead) | `child` (the spawned agent name) |
| `task_started` | builders, auditors | `issue` or `category` |
| `task_done` | builders, auditors | `issue` or `category`, `commit` (if applicable) |
| `task_failed` | builders, auditors | `issue` or `category`, `reason` |
| `finding_high` | code-reviewer, arch-reviewer | `issue`, `file`, `line` |
| `finding_issued` | code-reviewer, arch-reviewer | `gh_issue` (the new issue number), `severity` |
| `review_done` | code-reviewer, arch-reviewer | `findings_high`, `findings_issued` |
| `regression_run` | test-runner | `status` (pass/fail), `routes_swept` |
| `regression_skipped` | test-runner | `reason` (with timestamp of last run) |
| `audit_run` | forge:audit | `agents`, `total_findings`, `critical`, `high` |
| `phase_change` | build skills, approve, deploy | `from`, `to` |
| `design_refs_read` | frontend-builder | `refs` (comma-separated) |
| `shutdown` | any agent | — |

## How agents log

Every agent appends an event by calling the helper:

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh <agent-name> <event-type> [key=value ...]
```

The helper writes to `./forge-history.jsonl` in the current working directory by default. Override via `FORGE_HISTORY_FILE` env var.

Example calls embedded in agent files:

```bash
# frontend-builder, on task completion:
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh frontend-builder task_done \
  issue=42 commit=$(git rev-parse --short HEAD) files=3

# test-runner, when skipping due to staleness:
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh test-runner regression_skipped \
  reason="no source changes since 2026-05-08T14:23:00Z"
```

## Reading the ledger

### Quick tail
```bash
tail -20 forge-history.jsonl | jq -c
```

### Filter by agent
```bash
jq -c 'select(.agent == "frontend-builder")' forge-history.jsonl
```

### Filter by event type
```bash
jq -c 'select(.event == "regression_run")' forge-history.jsonl
```

### When did Phase 1 finish?
```bash
jq -c 'select(.event == "phase_change" and .to == "frontend-review")' forge-history.jsonl
```

### What did builders read for issue #42?
```bash
jq -c 'select(.issue == 42 and .event == "design_refs_read")' forge-history.jsonl
```

### How many regressions skipped vs run this sprint?
```bash
jq -r '.event' forge-history.jsonl | sort | uniq -c | grep regression
```

### Latest event from each agent
```bash
jq -s 'group_by(.agent) | map(max_by(.ts))' forge-history.jsonl
```

`/forge:status` surfaces the most useful queries automatically — see the skill for details.

## Lifecycle

- The ledger is **never truncated automatically** — it's the audit trail.
- `/forge:reset --hard` clears it (full reset).
- Manual cleanup: `mv forge-history.jsonl forge-history-$(date +%Y%m%d).jsonl` to archive.
- Add to `.gitignore` if you don't want the log committed; commit it if you want CI to verify history.

## When NOT to log

- Per-line code review (would flood the ledger). Log only summary events (`review_done`, `finding_issued`).
- Per-grep / per-file-read inside an agent. Log only what crosses an agent boundary.
- Internal tool calls within a single agent. Log only externally visible state changes.

The rule of thumb: **if a different agent might want to know it later, log it. Otherwise don't.**
