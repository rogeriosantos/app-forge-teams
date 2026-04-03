---
name: forge-build
description: Phase dispatcher — reads the current forge phase and tells you exactly which skill to run next. Also documents the full forge workflow. Run this if you are unsure where you are.
allowed-tools: Read
---

# forge:build — Phase Dispatcher & Workflow Reference

Read `forge-state.json` using the Read tool. If it does not exist:
> Run `/forge:init` first to create the GitHub repo and issues.

Based on the `phase` field, tell the user exactly what to run next:

| Phase | Run this | Why |
|-------|----------|-----|
| `ready` | `/forge:build-frontend` | Builds all frontend issues with an agent team |
| `frontend-review` | `/forge:approve` | Frontend built — review it, then approve to unlock Phase 2 |
| `approved` | `/forge:build-backend` | Builds database + backend + integration |
| `integration-review` | `/forge:audit` | Both phases done — run a full quality audit |
| `deployed` | `/forge:status` | Already deployed |

Tell the user:
> **Current phase: `[phase]`**
> Run `[matching skill]` to continue.

---

## Full Forge Workflow

```
PLANNING
  /forge:idea             Refine idea → forge-context.md
  /forge:prd              Generate PRD + issue breakdown → forge-prd.md
  /forge:init             Create GitHub repo, labels, issues → phase: ready

PHASE 1 — FRONTEND
  /forge:build-frontend   Agent team builds ALL frontend issues
                          (build-team-lead + builders + live code-reviewer + test-runner)
                          → phase: frontend-review

  /forge:review           [optional] Extra review pass → new issues
  /forge:implement        [optional] Fix the review findings

  /forge:approve          ← HUMAN GATE: you review the frontend, then approve
                          → phase: approved

PHASE 2 — BACKEND
  /forge:build-backend    db-designer → backend-builders → integration-agent
                          + final review team + regression test
                          → phase: integration-review

  /forge:review           [optional] Extra review pass → new issues
  /forge:implement        [optional] Fix the review findings

QUALITY & SHIP
  /forge:audit            6-agent deep audit → AUDIT_REPORT.md + GitHub issues
  /forge:implement        Fix audit findings
  /forge:deploy           Deploy to Vercel + Railway/Render → phase: deployed

ANYTIME
  /forge:status           Current phase, open issues, what to run next
  /forge:implement [N]    Implement any specific issue(s) on demand
```

> **Note:** `/forge:implement` is a repair tool — it implements specific issues
> produced by reviews and audits. It is NOT a replacement for `/forge:build-frontend`
> or `/forge:build-backend`, which run a full coordinated agent team with a live
> code-reviewer and regression testing.
