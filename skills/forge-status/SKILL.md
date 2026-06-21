---
name: forge-status
description: Show the current state of the forge project — phase, open issues by label, recent activity from forge-history.jsonl, and the recommended next step. Run this when returning to a project or when unsure of where you are in the workflow.
allowed-tools: Read, Bash
---

# forge:status — Project State Summary

Read `forge-state.json` from the current directory. If it does not exist:
> No forge project found here. Run `/forge:idea` to start one.

---

## Step 1 — Read state

Extract from `forge-state.json`:
- `repo` — GitHub repo
- `app_name` — app name
- `phase` — current phase
- `issues_created` — total issues created at init
- `deployment` — deployed URLs (if present)
- `last_regression_at` / `last_regression_status` — most recent test-runner result

## Step 2 — Fetch issue counts from GitHub

```bash
echo "=== Open issues by status ==="
gh issue list --state open --json labels --jq '.[].labels[].name' -R "$REPO" 2>/dev/null \
  | sort | uniq -c | sort -rn

echo "=== Totals ==="
gh issue list --state open  --json number --jq 'length' -R "$REPO" 2>/dev/null
gh issue list --state closed --json number --jq 'length' -R "$REPO" 2>/dev/null

echo "=== Ready to implement ==="
gh issue list --state open --label "status:agent-todo" --json number,title --limit 10 -R "$REPO" 2>/dev/null

echo "=== Review findings ==="
gh issue list --state open --label "type:review-finding" --json number,title --limit 5 -R "$REPO" 2>/dev/null

echo "=== Last commits ==="
git log --oneline -3 2>/dev/null
```

## Step 3 — Read recent activity from the ledger

If `forge-history.jsonl` exists, surface the recent timeline:

```bash
if [ -f forge-history.jsonl ]; then
  echo "=== Recent activity (last 10 events) ==="
  tail -10 forge-history.jsonl | jq -c '{ts, agent, event, issue, status, from, to, total_findings}' 2>/dev/null

  echo "=== Phase transitions ==="
  jq -c 'select(.event == "phase_change") | {ts, from, to}' forge-history.jsonl 2>/dev/null | tail -5

  echo "=== Last regression run ==="
  jq -c 'select(.event == "regression_run" or .event == "regression_skipped")' forge-history.jsonl 2>/dev/null | tail -1

  echo "=== Last audit ==="
  jq -c 'select(.event == "audit_run")' forge-history.jsonl 2>/dev/null | tail -1

  echo "=== Event counts (lifetime) ==="
  jq -r '.event' forge-history.jsonl 2>/dev/null | sort | uniq -c | sort -rn
fi
```

## Step 4 — Determine next step

Based on the `phase` field, recommend:

| Phase | Next step |
|-------|-----------|
| `ready` | Run `/forge:build-frontend` to start Phase 1 (frontend) |
| `frontend-review` | Review the frontend in `./frontend`, then run `/forge:approve` or `/forge:implement` for open findings |
| `approved` | Run `/forge:build-backend` to start Phase 2 (backend + DB) |
| `integration-review` | Run `/forge:review` or `/forge:audit` for a final quality pass |
| `deployed` | App is live. Run `/forge:audit` for ongoing quality checks |

## Step 5 — Report

Output this format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 [app_name]
 Phase: [phase]  |  Repo: [repo]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Issues
  Open:   [N]  (agent-todo: [N]  |  needs-review: [N]  |  blocked: [N])
  Closed: [N]

Ready to implement ([N]):
  #[N] [title]
  #[N] [title]
  ... (up to 5)

Review findings open: [N]
Audit findings open:  [N]

Last regression: [pass/fail/skipped — relative time, e.g. "2 hours ago"]
                 [if skipped, show why]

Recent activity (from forge-history.jsonl):
  [HH:MM] agent — event (key details)
  [HH:MM] agent — event
  ... (last 5–10 events)

Phase transitions:
  [date] [from] → [to]
  [date] [from] → [to]

Last commits:
  [git log output]

[If deployed]
  Frontend: [url]
  Backend:  [url]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next step: [recommendation from table above]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If `forge-history.jsonl` does not exist (very first run, or after `/forge:reset --hard`), simply omit the activity sections — don't error.
