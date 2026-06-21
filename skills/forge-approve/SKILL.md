---
name: forge-approve
description: Approve the frontend and trigger Phase 2 (database + backend build). Run this after reviewing the frontend built by /forge:build.
argument-hint: "[optional note for agents, e.g. 'auth flow needs rework']"
allowed-tools: Read, Write, Bash
---

# forge:approve — Approve Frontend, Start Phase 2

Read `forge-state.json`. If `phase` is not `frontend-review`, tell the user:
> Nothing to approve yet. Run `/forge:build-frontend` first to build the frontend.

---

## Steps

1. If an argument was provided, save the note to `forge-state.json` under `"approval_notes"`.

2. If there are open review-finding issues from Phase 1 (label `type:review-finding`), show a summary:
```bash
gh issue list --label "type:review-finding" --state open --json number,title
```
Ask: "There are [N] open review findings from Phase 1. Proceed to backend/DB build anyway? These will remain as issues to fix later. (yes/no)"

3. If the user answers **no**, abort without changing anything — leave `phase` at `"frontend-review"` and tell the user:
> Approval cancelled. Phase left at `"frontend-review"`. Resolve the open findings (e.g. `/forge:implement`), then run `/forge:approve` again when ready.

   Then stop — make no further changes.

4. If the user answers **yes** (or there were no open findings), update `forge-state.json` → `"phase": "approved"` and log it:

   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-approve phase_change \
     from=frontend-review to=approved
   ```

   Then tell the user:
> **Frontend approved.** Phase updated to `"approved"`.
> Run `/forge:build-backend` to start Phase 2 (database + backend build).
