# App Forge Teams

> Build production-ready full-stack apps with a coordinated AI agent team — from idea to deployed code, guided by a structured workflow.

App Forge Teams is a [Claude Code](https://claude.ai/code) plugin that orchestrates **multi-agent teams** to plan, build, review, test, audit, and deploy full-stack applications. Agents communicate in real time, self-correct during the build, and produce traceable GitHub issues at every stage.

---

## What It Does

You describe an app. The forge workflow turns it into:

- A structured PRD with feature specs and data model
- A GitHub repository with labels, milestones, and one issue per feature
- A built Next.js frontend (App Router, shadcn/ui, TypeScript, i18n)
- A built FastAPI backend (PostgreSQL, SQLAlchemy 2.0, Alembic, Pydantic v2)
- Wired integration (CORS, API client, aligned response types)
- Code and architecture review findings as GitHub issues
- A full regression test suite run after every build batch
- Deployment to Vercel + Railway/Render with a Playwright smoke test

All driven by slash commands. No boilerplate to write yourself.

---

## Prerequisites

| Tool | Required | Notes |
|------|----------|-------|
| [Claude Code](https://claude.ai/code) | ✅ | Any plan |
| [gh CLI](https://cli.github.com) | ✅ | Authenticated (`gh auth login`) |
| Node.js 20+ | ✅ | For Next.js scaffold |
| Python 3.12+ + [uv](https://docs.astral.sh/uv/) | ✅ | For FastAPI backend |
| [Vercel CLI](https://vercel.com/docs/cli) | Optional | For `/forge:deploy` |
| [Railway CLI](https://docs.railway.app/develop/cli) | Optional | For `/forge:deploy` |

---

## Installation

This plugin is auto-discovered by Claude Code from the `plugins/marketplaces/local-tools/` directory.

```bash
# Clone into your local plugins directory
git clone https://github.com/rogeriosantos/app-forge-teams \
  ~/.claude/plugins/marketplaces/local-tools/app-forge-teams
```

Restart Claude Code — the `/forge:*` skills will be available immediately.

---

## Quick Start

```bash
# 1. Go to your project workspace
mkdir my-app && cd my-app

# 2. Refine your idea into a structured spec
/forge:idea "A task management app for remote teams"

# 3. Generate the full PRD + issue breakdown
/forge:prd

# 4. Create the GitHub repo, labels, milestones, and all issues
/forge:init

# 5. Build the frontend with a coordinated agent team
/forge:build-frontend

# 6. Review the frontend, then approve to unlock Phase 2
/forge:approve

# 7. Build the backend, database, and wire everything together
/forge:build-backend

# 8. Run a comprehensive 6-agent audit
/forge:audit

# 9. Fix any findings
/forge:implement

# 10. Deploy to production
/forge:deploy
```

---

## Full Workflow

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PLANNING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 /forge:idea             Refine idea interactively
                         → forge-context.md

 /forge:prd              Generate full PRD + issue breakdown
                         → forge-prd.md

 /forge:init             Create GitHub repo + labels + milestones
                         + all issues → forge-state.json (phase: ready)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASE 1 — FRONTEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 /forge:build-frontend   Scaffolds Next.js, spawns agent team:
                           • build-team-lead (orchestrator)
                           • frontend-builder × N (parallel, max 4)
                           • code-reviewer (live, concurrent)
                           • arch-reviewer (final pass, after build)
                           • test-runner (regression, after build)
                         → phase: frontend-review

 /forge:review           [optional] Extra code + arch review pass
 /forge:implement        [optional] Fix review findings

 /forge:approve   ◄────── HUMAN GATE
                         You review the frontend, then approve
                         → phase: approved

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASE 2 — BACKEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 /forge:build-backend    Spawns agent team (sequenced):
                           1. db-designer (schema + migrations)
                           2. backend-builder × N (parallel, max 4)
                           3. integration-agent (wires frontend ↔ backend)
                           4. code-reviewer + arch-reviewer (final review)
                           5. test-runner (full regression)
                         → phase: integration-review

 /forge:review           [optional] Extra review pass
 /forge:implement        [optional] Fix review findings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 QUALITY & SHIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 /forge:audit            13-agent unified parallel audit:
                          • Quality (6):  dead-code · missing-impl · data-integrity
                                          security · consistency · saas-pages
                          • UX (4):       ux-flows · ux-interactions
                                          ux-states · ux-consistency
                          • Workflow (3): workflow-completeness
                                          workflow-logic · workflow-edge-cases
                         → AUDIT_REPORT.md + GitHub issues

 /forge:implement        Fix audit findings
 /forge:deploy           Deploy to Vercel + Railway/Render
                         Post-deploy Playwright smoke test
                         → phase: deployed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ANYTIME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 /forge:status           Phase · open issues · next step
 /forge:implement [N]    Implement any specific issue(s) on demand
 /forge:review           Any extra review pass
 /forge:audit            Any extra audit pass
 /forge:build            Phase dispatcher (shows what to run next)
 /forge:reset            Reset phase to "ready" (optionally --hard)
```

---

## Phase State Machine

```
ready
  ↓  /forge:build-frontend
frontend-review
  ↓  /forge:approve
approved
  ↓  /forge:build-backend
integration-review
  ↓  /forge:deploy
deployed
```

State is tracked in `forge-state.json` in your project directory.

---

## Skills Reference

| Skill | Phase | Description |
|-------|-------|-------------|
| `/forge:idea` | Planning | Interactive Q&A to refine your idea → `forge-context.md` |
| `/forge:prd` | Planning | Generate full PRD from context → `forge-prd.md` |
| `/forge:init` | Planning | Create GitHub repo, labels, milestones, issues → `forge-state.json` |
| `/forge:build-frontend` | Phase 1 | Coordinated agent team builds all frontend issues |
| `/forge:approve [note]` | Phase 1→2 | Human gate — approve frontend to unlock Phase 2 |
| `/forge:build-backend` | Phase 2 | Sequenced team: DB → backend → integration → review |
| `/forge:review [scope]` | Anytime | Parallel code + arch review pass → GitHub issues |
| `/forge:implement [N]` | Anytime | Implement specific issues (or all `status:agent-todo`) |
| `/forge:audit` | Anytime | 13-agent unified audit (quality · UX · workflow) → `AUDIT_REPORT.md` + issues |
| `/forge:redesign` | Anytime | **Modernize an existing app's visual design** — apply Apple HIG, swap palette, refactor components in batches with checkpoints. Works on any Next.js app. |
| `/forge:i18n` | Anytime | **Internationalize an existing app** — extract hardcoded strings, set up next-intl with cookie-based locale (no URL prefix), generate AI translations, add Language switcher to /settings or /profile. Works on any Next.js app. |
| `/forge:deploy` | Ship | Deploy frontend + backend, Playwright smoke test |
| `/forge:status` | Anytime | Show phase, open issues, recent ledger activity, next step |
| `/forge:metrics` | Anytime | Aggregate stats from `forge-history.jsonl` (build progress, reviewer findings, regression skip rate, design coverage) |
| `/forge:replay` | Anytime | Reconstruct a past session as a narrative — useful for post-mortems |
| `/forge:build` | Anytime | Phase dispatcher — tells you what to run next |
| `/forge:reset [--hard] [--force]` | Anytime | Reset phase to `ready`. `--hard` deletes code + artifacts. `--force` bypasses uncommitted-changes safety check. |

→ See [docs/skills-reference.md](docs/skills-reference.md) for full documentation of each skill.

---

## Agent Roster

### Build agents

| Agent | Role | Spawned by |
|-------|------|-----------|
| `build-team-lead` | Orchestrates builders + reviewers, phase-aware sequencing | `forge:build-frontend`, `forge:build-backend` |
| `frontend-builder` | Implements one frontend issue (Next.js, shadcn/ui, playwright verify). Follows shared design references in `references/_shared/` (Apple design system · table standard · search standard) | `build-team-lead` |
| `backend-builder` | Implements one FastAPI issue (with pytest before commit) | `build-team-lead` |
| `db-designer` | PostgreSQL schema + SQLAlchemy models + Alembic migrations | `build-team-lead` (Phase 2, first) |
| `integration-agent` | Wires frontend API calls ↔ backend endpoints, CORS, env vars | `build-team-lead` (Phase 2, last) |

### Review agents

| Agent | Role | Spawned by |
|-------|------|-----------|
| `code-reviewer` | **Line-level** review (security, types, validation, UI states, i18n, a11y, design-system rules). HIGH → builders inline, MED/LOW → `[CODE]`-prefixed issues | `build-team-lead`, `forge:review` |
| `arch-reviewer` | **Structural** review (component size, prop drilling, service layer, repository pattern, N+1 queries, response shapes). All findings → `[ARCH]`-prefixed issues | `build-team-lead`, `forge:review` |
| `test-runner` | Full regression suite: pytest + npm build + Playwright sweep of all routes | `build-team-lead`, `issue-dispatcher` |

### Implement agents

| Agent | Role | Spawned by |
|-------|------|-----------|
| `issue-dispatcher` | Routes issues to correct builder by label, enforces sequencing | `forge:implement` |

### Audit agents (all 13 run in parallel via `forge:audit`)

**Quality (6)**
| Agent | Finds |
|-------|-------|
| `dead-code-hunter` | Unused functions, imports, components, DB columns |
| `missing-impl-auditor` | TODOs, empty handlers, broken references, missing validation |
| `data-integrity-auditor` | Missing FK constraints, missing indexes, no transactions, race conditions |
| `security-auditor` | Hardcoded secrets, missing auth, SQL injection, XSS, CSRF, rate limiting |
| `consistency-auditor` | Mixed naming, duplicate logic, inconsistent error formats, circular deps |
| `saas-pages-auditor` | Missing SaaS pages: auth, profile, billing, onboarding, legal, error pages |

**UX (4) — skipped if no frontend**
| Agent | Finds |
|-------|-------|
| `ux-flow-auditor` | Broken navigation, dead-end pages, orphan routes, missing CRUD steps |
| `ux-interaction-auditor` | Non-functional buttons, empty handlers, forms that don't submit |
| `ux-state-auditor` | Missing loading/empty/error states, silent failures, no feedback |
| `ux-consistency-auditor` | Mixed CRUD patterns, terminology mismatches, inconsistent feedback |

**Workflow (3)**
| Agent | Finds |
|-------|-------|
| `workflow-completeness-auditor` | Spec features without complete implementation paths |
| `workflow-logic-auditor` | Business rules described in spec but not enforced in code |
| `workflow-edge-case-auditor` | Unhandled edge cases in implemented workflows |

→ See [docs/agents-reference.md](docs/agents-reference.md) for full agent documentation.

---

## Tech Stack

Every app built by forge uses:

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 16 (App Router) · shadcn/ui · Tailwind CSS · TypeScript strict · next-intl |
| Backend | Python 3.12 · FastAPI · UV · SQLAlchemy 2.0 async · Pydantic v2 · structlog |
| Database | PostgreSQL · Alembic migrations · UUID primary keys |
| Testing | pytest · playwright (browser) · npm build check |
| Deployment | Vercel (frontend) · Railway or Render (backend) |
| Code quality | context7 MCP (live docs lookup before writing any code) |

---

## How the Build Team Works

During `forge:build-frontend` and `forge:build-backend`, agents communicate in real time:

```
forge:build-frontend
  └─ build-team-lead
       ├─ frontend-builder #1  ──┐
       ├─ frontend-builder #2  ──┤  all write code in parallel
       ├─ frontend-builder #3  ──┘
       │
       ├─ code-reviewer  ←── monitors commits as they land
       │    └── HIGH finding → SendMessage → builder (fixes inline)
       │    └── MED/LOW finding → GitHub issue
       │
       └─ [after all builders done]
            ├─ test-runner  ←── runs full regression suite
            └─ arch-reviewer ←── structural review pass
```

**`forge:implement` vs `forge:build-*`**

| | `forge:build-frontend` / `forge:build-backend` | `forge:implement` |
|---|---|---|
| Role | Initial build from scratch | Fix specific issues |
| Team | Full: build-team-lead + N parallel builders + live code-reviewer | Lightweight: issue-dispatcher + builders |
| Live review | ✅ code-reviewer fixes HIGH issues inline while builders work | ❌ no live reviewer |
| When to use | Once per phase, at the start | After reviews/audits, to implement findings |

---

## Project File Structure

After a complete forge run, your workspace contains:

```
my-app/
├── forge-context.md        # Structured app spec (from /forge:idea)
├── forge-prd.md            # Full PRD with issue breakdown (from /forge:prd)
├── forge-state.json        # Current phase + GitHub repo info
├── forge-history.jsonl     # Append-only audit trail of every agent event
├── .forge-context/         # Per-issue PRD slices (one file per issue)
├── .forge-cache/           # Pre-built codebase scan for audit agents
│
├── frontend/               # Next.js 16 App Router
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── (routes)/
│   ├── components/
│   │   └── ui/             # shadcn/ui components
│   ├── lib/
│   │   ├── api/            # Typed API client (from integration-agent)
│   │   └── search.ts       # Universal search utility
│   └── .env.local.example
│
├── backend/                # FastAPI
│   ├── app/
│   │   ├── api/            # Route handlers
│   │   ├── core/           # Config, settings
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   ├── db/             # Session, base
│   │   └── main.py
│   ├── alembic/
│   ├── tests/
│   ├── db_schema.md        # Schema documentation
│   └── .env.example
│
└── AUDIT_REPORT.md         # Latest audit results (from /forge:audit)
```

---

## forge-state.json Schema

```json
{
  "repo": "owner/repo-name",
  "app_name": "My App",
  "phase": "ready | frontend-review | approved | integration-review | deployed",
  "issues_created": [1, 2, 3, 4, 5],
  "milestones": {
    "frontend": 1,
    "backend_db": 2,
    "integration": 3,
    "review": 4
  },
  "approval_notes": "optional notes from /forge:approve",
  "deployment": {
    "frontend_url": "https://my-app.vercel.app",
    "backend_url": "https://my-app.railway.app",
    "deployed_at": "2025-04-03T12:00:00Z"
  }
}
```

---

## GitHub Label Taxonomy

Labels created by `/forge:init`:

**Phase labels** (route issues to the correct builder)
- `phase:frontend` — Next.js frontend work
- `phase:backend` — FastAPI backend work
- `phase:database` — PostgreSQL + Alembic
- `phase:integration` — API wiring
- `phase:architecture` — Design decisions
- `phase:security` — Security requirements
- `phase:testing` — Tests and QA

**Type labels**
- `type:feature` — New feature
- `type:review-finding` — Found by code/arch reviewer
- `type:bug` — Something broken
- `type:chore` — Maintenance

**Status labels**
- `status:agent-todo` — Ready for agent to pick up (`/forge:implement` queries this)
- `status:needs-review` — Awaiting human review
- `status:blocked` — Needs input

---

## Documentation

| Doc | Contents |
|-----|---------|
| [Skills Reference](docs/skills-reference.md) | Full documentation for every `/forge:*` skill |
| [Agents Reference](docs/agents-reference.md) | Full documentation for every agent |
| [End-to-End Example](docs/example-walkthrough.md) | Complete session from idea to deployed app |
| [Workflow Reference](WORKFLOW.md) | Quick-reference workflow diagram |
| [Tracking Ledger](docs/tracking-ledger.md) | `forge-history.jsonl` schema, query recipes |

---

## Contributing

Issues and pull requests welcome at [rogeriosantos/app-forge-teams](https://github.com/rogeriosantos/app-forge-teams).

When adding or modifying a skill or agent:
1. Update the skill/agent markdown file
2. Update `WORKFLOW.md` if the workflow changes
3. Update `README.md` tables if new skills/agents are added
4. Update the relevant `docs/` file
