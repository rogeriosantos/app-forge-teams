---
name: forge-build-backend
description: Build the FastAPI backend and PostgreSQL database using a coordinated agent team. Runs db-designer first (sequential — backend needs the schema), then parallel backend-builder agents, then integration-agent, then a final review team. Only runs when forge-state.json phase is "approved". Sets phase to "integration-review" when complete.
allowed-tools: Read, Write, Bash, Agent, TeamCreate, TaskCreate, TaskUpdate, TaskList, SendMessage
---

# forge:build-backend — Phase 2: Database + Backend + Integration Agent Team

Read `forge-state.json` using the Read tool. If it does not exist, tell the user to run `/forge:init` first.

**Preflight — verify required CLI tools:**
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-prerequisites.sh forge-build-backend
```
If this prints `RESULT: FAIL` (e.g. `uv` or `python3` not installed), tell the user which tool is missing and stop.

If `phase` is not `"approved"`:

| Phase | Message |
|-------|---------|
| `ready` | Frontend hasn't been built yet. Run `/forge:build-frontend` first. |
| `frontend-review` | Frontend is built but not yet approved. Review it, then run `/forge:approve` to unlock Phase 2. |
| `integration-review` | Phase 2 is already complete. Run `/forge:review` or `/forge:audit`. |
| `deployed` | Already deployed. Run `/forge:status` for a summary. |
| anything else | Show the phase value and list the valid phases above. |

Only continue if phase is `"approved"`.

---

## Step 1 — Fetch all backend issues

Use the Read tool to read `forge-state.json` and extract the `repo` field into `$REPO`. Then fetch all three groups:

```bash
# Database issues
gh issue list --label "phase:database" --label "status:agent-todo" \
  --state open --json number,title,body,labels --limit 200 -R "$REPO"

# Backend issues
gh issue list --label "phase:backend" --label "status:agent-todo" \
  --state open --json number,title,body,labels --limit 200 -R "$REPO"

# Integration issues
gh issue list --label "phase:integration" --label "status:agent-todo" \
  --state open --json number,title,body,labels --limit 200 -R "$REPO"
```

---

## Step 2 — Create the backend team

Use TeamCreate:
```
team_name: "forge-backend"
description: "Phase 2 database + backend + integration build for [app_name]"
```

---

## Step 3 — Spawn build-team-lead for Phase 2

Use the Agent tool:
- `subagent_type`: `"app-forge-teams:build-team-lead"`
- `team_name`: `"forge-backend"`
- `name`: `"build-team-lead"`
- `prompt`: Pass all of the following:
  - Phase: 2
  - Database issues, backend issues, integration issues (separate lists)
  - Repo name (`owner/repo`)
  - Path to `forge-prd.md` and path to `frontend/` directory
  - `approval_notes` from `forge-state.json` (if present): human feedback on the frontend that the backend/integration work must respect. Tell build-team-lead to factor these notes into the build.
  - Sequencing instruction:
    1. **First** run `db-designer` (sequential — backend needs the schema)
    2. **Then** spawn parallel `backend-builder` agents (one per backend issue, max 4 at a time)
    3. **Then** run `integration-agent` (sequential — needs both sides complete)
    4. **Then** run `test-runner` for full regression
    5. Report back when all are complete

---

## Step 4 — Wait for Phase 2 completion

The build-team-lead will SendMessage back when done with:
```json
{
  "phase_complete": true,
  "issues_built": [...],
  "regression_report": { "status": "pass|fail", "regressions_found": N },
  "summary": "..."
}
```

---

## Step 5 — Final review team

After Phase 2 build is done, spawn both reviewers **in parallel** (same message, two Agent tool calls). Each runs as a separate Agent tool call returning synchronously when complete — do NOT wait for SendMessage from them.

**code-reviewer:**
- `subagent_type`: `"app-forge-teams:code-reviewer"`
- `team_name`: `"forge-backend"`
- `name`: `"code-reviewer"`
- `prompt`: Review all code in `./backend/` for quality, security, and correctness issues.
  Phase label for issues: `phase:backend`.
  **Do NOT SendMessage to build-team-lead** — it is no longer running. Simply complete and return.

**arch-reviewer:**
- `subagent_type`: `"app-forge-teams:arch-reviewer"`
- `team_name`: `"forge-backend"`
- `name`: `"arch-reviewer"`
- `prompt`: Review the backend and integration code for architectural issues.
  Scope: `./backend/` and `./frontend/lib/api/`.
  **Do NOT SendMessage to build-team-lead** — it is no longer running. Simply complete and return.

Both Agent tool calls return when the reviewers complete. Capture `issues_created` counts from both for the Step 7 report.

---

## Step 6 — Update state and log phase change

Update `forge-state.json` → `"phase": "integration-review"`.

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-build-backend phase_change \
  from=approved to=integration-review issues=[count of issues built]
```

---

## Step 7 — Report to user

> **Backend build complete.** Frontend is now wired to the backend.
>
> Built: [N] database issues, [N] backend issues, [N] integration issues.
> Final review created [N] issues.
> Regression tests: [passed / N issues found].
>
> Next steps:
> 1. Test both servers locally:
>    - Backend:  `cd backend && uv run uvicorn app.main:app --reload`
>    - Frontend: `cd frontend && npm run dev`
> 2. Run `/forge:review` for additional review passes
> 3. Run `/forge:audit` for a comprehensive quality check
> 4. Run `/forge:deploy` when ready to ship
