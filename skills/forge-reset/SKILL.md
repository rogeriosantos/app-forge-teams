---
name: forge-reset
description: Reset the forge project state. Reverts forge-state.json to phase "ready" so you can restart the build phases without losing the GitHub repo, issues, or code. Use when you want to rebuild from scratch after changing the PRD, or when phase state is corrupted.
argument-hint: "[optional: --hard to also delete generated code directories (frontend/ and backend/)]"
allowed-tools: Read, Write, Bash
---

# forge:reset — Reset Project Phase

Read `forge-state.json` from the current directory. If it does not exist:
> No forge project found. Nothing to reset.

---

## Step 1 — Show current state

Show the user what will be affected:

```
Current state:
  App:    [app_name]
  Repo:   [repo]
  Phase:  [phase]
  [If deployed: Frontend URL, Backend URL]
```

---

## Step 2 — Confirm the reset

Ask:
> **Reset forge project to phase "ready"?**
>
> This will:
> - Set phase back to "ready" in forge-state.json
> - Clear deployment URLs (if any)
> [If --hard argument]: - DELETE the `frontend/` and `backend/` directories
>
> The GitHub repo and all issues are NOT affected.
>
> Type **yes** to confirm, or anything else to cancel.

If the user does not confirm, stop here.

---

## Step 3 — Reopen closed issues (optional)

Ask:
> **Reopen all closed GitHub issues?** This is useful if you want to rebuild from scratch and re-implement everything.
> (yes/no)

If yes:
```bash
gh issue list --state closed --json number --jq '.[].number' -R "$REPO" | \
  xargs -I{} gh issue reopen {} -R "$REPO" 2>/dev/null
echo "All closed issues reopened."
```

---

## Step 4 — Apply the reset

Update `forge-state.json`:
```json
{
  "repo": "[keep existing]",
  "app_name": "[keep existing]",
  "phase": "ready",
  "issues_created": "[keep existing]",
  "milestones": "[keep existing]"
}
```

Remove the `deployment` key if present. Remove `approval_notes` if present.

If `--hard` argument was provided:
```bash
rm -rf frontend/ backend/
echo "Deleted frontend/ and backend/ directories."
```

---

## Step 5 — Report

> **Reset complete.**
>
> Phase is now `ready`.
> [If issues reopened]: All GitHub issues have been reopened.
> [If --hard]: frontend/ and backend/ have been deleted.
>
> Next steps:
> - Run `/forge:prd` to update the PRD if your requirements changed
> - Run `/forge:build-frontend` to start Phase 1 again
