---
name: forge-build
description: Smart dispatcher — detects the current forge phase and tells you which specific build skill to run. Use /forge:build-frontend for Phase 1 (Next.js) and /forge:build-backend for Phase 2 (database + FastAPI + integration).
allowed-tools: Read
---

# forge:build — Phase Dispatcher

Read `forge-state.json` using the Read tool. If it does not exist:
> Run `/forge:init` first to create the GitHub repo and issues.

Based on the `phase` field, guide the user to the right skill:

---

| Phase | What to run | Why |
|-------|-------------|-----|
| `ready` | `/forge:build-frontend` | Builds the Next.js frontend (Phase 1) |
| `frontend-review` | `/forge:approve` | Frontend is built — approve it to unlock Phase 2 |
| `approved` | `/forge:build-backend` | Builds the database + FastAPI backend + integration (Phase 2) |
| `integration-review` | `/forge:review` or `/forge:audit` | Both phases complete — review and audit before deploying |
| `deployed` | `/forge:status` | App is already deployed |

---

Tell the user:

> **Current phase: `[phase]`**
>
> Run `[the matching skill from the table above]` to continue.
>
> For a full project overview, run `/forge:status`.
