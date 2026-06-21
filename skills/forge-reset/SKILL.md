---
name: forge-reset
description: Reset the forge project state. Reverts forge-state.json to phase "ready" so you can restart the build phases without losing the GitHub repo, issues, or code. Use when you want to rebuild from scratch after changing the PRD, or when phase state is corrupted.
argument-hint: "[--hard to delete frontend/, backend/, and forge artifacts] [--force to bypass uncommitted-changes check on --hard]"
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

## Step 2 — Safety check (only for --hard)

If `--hard` was passed, check for uncommitted work that would be destroyed:

```bash
DIRTY=$(git status --porcelain 2>/dev/null | head -20)
UNTRACKED_BUILD=$(find frontend backend -type f -newer forge-state.json 2>/dev/null | head -10)
```

If `$DIRTY` is non-empty OR there are recent untracked files in `frontend/` or `backend/`, warn the user:

> ⚠️ **Uncommitted changes detected.** `--hard` will permanently delete:
>
> ```
> [list of modified/untracked files in frontend/ and backend/]
> ```
>
> These changes are NOT in git history and will be lost.
>
> To proceed anyway: re-run `/forge:reset --hard --force`
> To save your work first: commit + push, then re-run `/forge:reset --hard`
> To cancel: do nothing.

If the user did not pass `--force`, **stop here** without making changes.

## Step 3 — Confirm the reset

Ask:
> **Reset forge project to phase "ready"?**
>
> This will:
> - Set phase back to "ready" in forge-state.json
> - Clear deployment URLs (if any)
> [If --hard]: - DELETE the `frontend/` and `backend/` directories, `.forge-context/`, `.forge-cache/`, and `forge-history.jsonl`
>
> The GitHub repo and all issues are NOT affected.
>
> Type **yes** to confirm, or anything else to cancel.

If the user does not confirm, stop here.

---

## Step 4 — Reopen closed issues (optional)

Ask:
> **Reopen all closed GitHub issues?** This is useful if you want to rebuild from scratch and re-implement everything.
> (yes/no)

If yes:
```bash
REPO=$(jq -r '.repo' forge-state.json 2>/dev/null || sed -n 's/.*"repo"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' forge-state.json | head -1)
gh issue list --state closed --json number --jq '.[].number' -R "$REPO" | \
  xargs -I{} gh issue reopen {} -R "$REPO" 2>/dev/null
echo "All closed issues reopened."
```

---

## Step 5 — Apply the reset

Update `forge-state.json`:
```json
{
  "repo": "[keep existing]",
  "app_name": "[keep existing]",
  "phase": "ready",
  "issues_created": "[keep existing]"
}
```

Remove the `deployment` key if present. Remove `approval_notes` if present.

If `--hard` argument was provided:
```bash
rm -rf frontend/ backend/ .forge-context/ .forge-cache/ forge-history.jsonl
echo "Deleted frontend/, backend/, .forge-context/, .forge-cache/, and forge-history.jsonl."
```

Otherwise (soft reset), preserve the audit trail by archiving the history file:
```bash
[ -f forge-history.jsonl ] && mv forge-history.jsonl "forge-history-$(date +%Y%m%d-%H%M%S).jsonl"
```

Log the reset itself to a fresh ledger:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-reset phase_change \
  from=[previous phase] to=ready hard=[true|false]
```

---

## Step 6 — Report

> **Reset complete.**
>
> Phase is now `ready`.
> [If issues reopened]: All GitHub issues have been reopened.
> [If --hard]: frontend/ and backend/ have been deleted.
>
> Next steps:
> - Run `/forge:prd` to update the PRD if your requirements changed
> - Run `/forge:build-frontend` to start Phase 1 again
