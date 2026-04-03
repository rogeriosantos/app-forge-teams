---
name: forge-build
description: Orchestrate a real agent TEAM to build the application. Phase 1 spawns a coordinated frontend team (builders + reviewer communicating live). After /forge:approve, Phase 2 spawns a backend team. Agents talk to each other, self-correct before creating issues.
allowed-tools: Read, Write, Bash, Agent, TeamCreate, TaskCreate, TaskUpdate, TaskList, SendMessage
---

# forge:build — Agent Team Orchestration (v2)

Read `forge-state.json`. If missing, tell user to run `/forge:init` first.

Check the `phase` field to determine which team to spawn.

---

## If phase = "ready" → Spawn Phase 1 Frontend Team

### Step 1 — Scaffold if needed
```bash
npx create-next-app@latest frontend --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"
cd frontend && npx shadcn@latest init -d
```

### Step 2 — Fetch all frontend issues
Use the Read tool to read `forge-state.json` and extract the `repo` field. Then run:
```bash
gh issue list --label "phase:frontend,status:agent-todo" --json number,title,body --limit 50 -R "$REPO"
```

### Step 3 — Create the team
Use TeamCreate tool:
```
team_name: "forge-phase1"
description: "Phase 1: Frontend build team for [app name from forge-state.json]"
```

### Step 4 — Spawn the build-team-lead
Use the Agent tool with:
- `subagent_type`: "app-forge-teams:build-team-lead"
- `team_name`: "forge-phase1"
- `name`: "build-team-lead"
- `prompt`: Pass the full list of frontend GitHub issues, the repo name, the path to forge-prd.md, and the instruction to orchestrate the frontend build.

### Step 5 — Wait for team completion
The build-team-lead will message you when Phase 1 is done. It will report:
- Issues completed
- Issues created by the reviewer
- Any blockers

### Step 6 — Update state and report to user
Update `forge-state.json` → `"phase": "frontend-review"`

Tell user:
> **Phase 1 complete.** The agent team built [N] frontend features.
> Review findings: [N] issues created by the live code reviewer.
>
> Review the frontend in `./frontend`. Run `/forge:approve` when ready.

---

## If phase = "approved" → Spawn Phase 2 Backend + DB Team

### Step 1 — Create Phase 2 team
Use TeamCreate:
```
team_name: "forge-phase2"
description: "Phase 2: Database + Backend + Integration team"
```

### Step 2 — Spawn build-team-lead for Phase 2
Use the Agent tool with:
- `subagent_type`: "app-forge-teams:build-team-lead"
- `team_name`: "forge-phase2"
- `name`: "build-team-lead"
- `prompt`: Pass phase=2, DB issues + backend issues + integration issues, repo name, paths to forge-prd.md and frontend/ directory.

The team-lead will:
1. First: run `db-designer` agent (sequential — backend needs the schema)
2. Then: spawn parallel `backend-builder` agents (one per backend issue)
3. Then: run `integration-agent` (sequential — needs both sides complete)

### Step 3 — Final review team
After Phase 2 build is done, spawn a dedicated review team:
```
team_name: "forge-final-review"
```
Spawn both reviewers with the Agent tool in the same message turn:
- `code-reviewer`: `subagent_type: "app-forge-teams:code-reviewer"`, `team_name: "forge-final-review"`, `name: "code-reviewer"`
- `arch-reviewer`: `subagent_type: "app-forge-teams:arch-reviewer"`, `team_name: "forge-final-review"`, `name: "arch-reviewer"`

Both run in parallel, messaging the team-lead with findings.

### Step 4 — Update state and report
Update `forge-state.json` → `"phase": "integration-review"`

Tell user:
> **Build complete.** Backend wired to frontend.
> Final review created [N] issues.
> Run `/forge:review` for additional passes anytime.

---

## If phase = "frontend-review" → Waiting for approval

Phase 1 is already complete. Tell the user:
> The frontend has been built and is awaiting approval.
> Review the frontend in `./frontend`, then run `/forge:approve` to proceed to Phase 2.

---

## If phase = "integration-review" → Phase 2 is complete

Phase 2 has already finished. Tell the user:
> **Phase 2 is complete.** Your backend is wired to the frontend.
> Run `/forge:review` for additional review passes, or start both servers to test:
> - Backend: `cd backend && uv run uvicorn app.main:app --reload`
> - Frontend: `cd frontend && npm run dev`

---

## If phase is anything else → Unknown state

Read the `phase` value from `forge-state.json` and tell the user:
> The current phase is `"[phase value]"` — this is not a recognized state.
> Please check `forge-state.json` and correct the `phase` field manually.
>
> Valid transitions:
> - `"ready"` → run `/forge:build` to start Phase 1
> - `"frontend-review"` → run `/forge:approve` to approve the frontend
> - `"approved"` → run `/forge:build` to start Phase 2
> - `"integration-review"` → run `/forge:review` for additional review passes
