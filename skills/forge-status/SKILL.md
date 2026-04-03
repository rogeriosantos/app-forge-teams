---
name: forge-status
description: Show the current state of the forge project — phase, open issues by label, last build, and the recommended next step. Run this when returning to a project or when unsure of where you are in the workflow.
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

## Step 2 — Fetch issue counts from GitHub

```bash
# Open issues by status label
echo "=== Open issues by status ==="
gh issue list --state open --json labels --jq '.[].labels[].name' -R "$REPO" 2>/dev/null \
  | sort | uniq -c | sort -rn

# Total open / closed
echo "=== Totals ==="
gh issue list --state open  --json number --jq 'length' -R "$REPO" 2>/dev/null
gh issue list --state closed --json number --jq 'length' -R "$REPO" 2>/dev/null

# Agent-todo count
echo "=== Ready to implement ==="
gh issue list --state open --label "status:agent-todo" --json number,title --limit 10 -R "$REPO" 2>/dev/null

# Review findings
echo "=== Review findings ==="
gh issue list --state open --label "type:review-finding" --json number,title --limit 5 -R "$REPO" 2>/dev/null

# Last commit
echo "=== Last build activity ==="
git log --oneline -3 2>/dev/null
```

## Step 3 — Determine next step

Based on the `phase` field, recommend:

| Phase | Next step |
|-------|-----------|
| `ready` | Run `/forge:build-frontend` to start Phase 1 (frontend) |
| `frontend-review` | Review the frontend in `./frontend`, then run `/forge:approve` or `/forge:implement` for open findings |
| `approved` | Run `/forge:build-backend` to start Phase 2 (backend + DB) |
| `integration-review` | Run `/forge:review` or `/forge:audit` for a final quality pass |
| `deployed` | App is live. Run `/forge:audit` for ongoing quality checks |

## Step 4 — Report

Output this exact format:

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

Last commits:
  [git log output]

[If deployed]
  Frontend: [url]
  Backend:  [url]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next step: [recommendation from table above]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
