---
name: forge-approve
description: Approve the frontend and trigger Phase 2 (database + backend build). Run this after reviewing the frontend built by /forge:build.
argument-hint: "[optional note for agents, e.g. 'auth flow needs rework']"
allowed-tools: Read, Write, Bash
---

# forge:approve — Approve Frontend, Start Phase 2

Read `forge-state.json`. If `phase` is not `frontend-review`, tell the user:
> Nothing to approve yet. Run `/forge:build` first to build the frontend.

---

## Steps

1. If an argument was provided, save the note to `forge-state.json` under `"approval_notes"`.

2. Update `forge-state.json` → `"phase": "approved"`.

   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-approve phase_change \
     from=frontend-review to=approved
   ```

3. If there are open review-finding issues from Phase 1 (label `type:review-finding`), show a summary:
```bash
gh issue list --label "type:review-finding" --state open --json number,title
```
Ask: "There are [N] open review findings from Phase 1. Proceed to backend/DB build anyway? These will remain as issues to fix later. (yes/no)"

4. On confirmation, tell the user:
> **Frontend approved.** Phase updated to `"approved"`.
> Run `/forge:build-backend` to start Phase 2 (database + backend build).
