---
name: forge-build-frontend
description: Build the Next.js frontend using a coordinated agent team. Spawns build-team-lead who orchestrates parallel frontend-builder agents plus a live code-reviewer and a final arch-reviewer pass. Only runs when forge-state.json phase is "ready". Sets phase to "frontend-review" when complete.
allowed-tools: Read, Write, Bash, Agent, TeamCreate, TaskCreate, TaskUpdate, TaskList, SendMessage
---

# forge:build-frontend — Phase 1: Frontend Agent Team

Read `forge-state.json` using the Read tool. If it does not exist, tell the user to run `/forge:init` first.

If `phase` is not `"ready"`:

| Phase | Message |
|-------|---------|
| `frontend-review` | Frontend is already built. Review it in `./frontend`, then run `/forge:approve` when ready. |
| `approved` | Frontend was approved. Run `/forge:build-backend` to build the database and backend. |
| `integration-review` | Both phases are complete. Run `/forge:review` or `/forge:audit`. |
| `deployed` | Already deployed. Run `/forge:status` for a summary. |
| anything else | Show the phase value and list the valid phases above. |

Only continue if phase is `"ready"`.

---

## Step 1 — Scaffold the frontend (if not already done)

```bash
[ -d "frontend" ] && echo "exists" || echo "missing"
```

If `frontend/` does not exist:
```bash
npx create-next-app@latest frontend --typescript --tailwind --app --eslint --src-dir --import-alias "@/*" --no-git
cd frontend && npx shadcn@latest init -d
```

---

## Step 2 — Fetch all frontend issues

Use the Read tool to read `forge-state.json` and extract the `repo` field into `$REPO`. Then:

```bash
gh issue list \
  --label "phase:frontend" \
  --label "status:agent-todo" \
  --state open \
  --json number,title,body,labels \
  --limit 50 \
  -R "$REPO"
```

If there are no open frontend issues, tell the user:
> No open frontend issues found with `status:agent-todo`. All frontend issues may already be implemented.
> Run `/forge:review` to review what was built, or `/forge:status` to check the project state.

---

## Step 3 — Create the frontend team

Use TeamCreate:
```
team_name: "forge-frontend"
description: "Phase 1 frontend build for [app_name from forge-state.json]"
```

---

## Step 4 — Spawn build-team-lead

Check the issue list from Step 2 for any auth-related issues (issues whose title contains "auth", "login", "register", "session", "JWT", "Clerk", "NextAuth"). If any exist, note them — pass them to build-team-lead with the instruction to implement auth issues FIRST, before any other frontend issues, since all authenticated pages depend on the auth scaffold being in place.

Use the Agent tool:
- `subagent_type`: `"app-forge-teams:build-team-lead"`
- `team_name`: `"forge-frontend"`
- `name`: `"build-team-lead"`
- `prompt`: Pass all of the following:
  - Full list of frontend GitHub issues (number, title, body, labels)
  - Repo name (`owner/repo`)
  - Path to `forge-prd.md`
  - Phase label: `phase:frontend` (pass this to the code-reviewer for issue labeling)
  - Sequencing note: if any issues are auth-related (auth scaffold, login, session setup), implement those FIRST before other features — other pages depend on auth being set up
  - Instruction: orchestrate the frontend build — spawn one `frontend-builder` per issue (max 4 parallel), spawn `code-reviewer` concurrently with phase label `phase:frontend`, run `test-runner` after all builders complete, then report back

---

## Step 5 — Wait for build-team-lead completion

The build-team-lead Agent tool call returns when Phase 1 is done. Capture the result — it contains:
```json
{
  "phase_complete": true,
  "issues_built": [...],
  "review_issues_created": [...],
  "regression_report": { "status": "pass|fail", "regressions_found": N },
  "summary": "..."
}
```

Store `review_issues_created` count and `regression_report` for the Step 7 report.

---

## Step 5.5 — Architecture review

Spawn the arch-reviewer for a final structural pass on the built frontend. This is a separate Agent tool call that runs after build-team-lead completes:

Use the Agent tool:
- `subagent_type`: `"app-forge-teams:arch-reviewer"`
- `team_name`: `"forge-frontend"`
- `name`: `"arch-reviewer"`
- `prompt`: Review the frontend codebase in `./frontend/` for architectural issues.
  Scope: frontend only (Next.js App Router structure, component boundaries, data flow, state management patterns).
  The code-reviewer has already reviewed line-level quality — focus on structural/architectural patterns.
  Create GitHub issues for any findings (labels: `type:review-finding`, `phase:frontend`, `status:agent-todo`).
  **Do NOT SendMessage to build-team-lead** — it is no longer running. Simply complete your review and return.

When the Agent tool returns, extract `issues_created` from the arch-reviewer's completion output for the Step 7 report.

---

## Step 6 — Update state

Update `forge-state.json` → `"phase": "frontend-review"`.

---

## Step 7 — Report to user

> **Frontend build complete.**
>
> Built [N] issues. Code reviewer created [N] findings. Arch reviewer created [N] architectural findings.
> Regression tests: [passed / N issues found — see findings above].
>
> Next steps:
> 1. Review the frontend: `cd frontend && npm run dev`
> 2. Run `/forge:review` for an additional review pass (optional)
> 3. Run `/forge:implement` to fix any open findings (optional)
> 4. Run `/forge:approve` when the frontend is ready for the backend build
