# Skills Reference

Complete documentation for every `/forge:*` skill.

---

## Table of Contents

- [forge:idea](#forgeidea)
- [forge:prd](#forgeprd)
- [forge:init](#forgeinit)
- [forge:build-frontend](#forgebuild-frontend)
- [forge:approve](#forgeapprove)
- [forge:build-backend](#forgebuild-backend)
- [forge:review](#forgereview)
- [forge:implement](#forgeimplement)
- [forge:audit](#forgeaudit)
- [forge:deploy](#forgedeploy)
- [forge:status](#forgestatus)
- [forge:build](#forgebuild)
- [forge:reset](#forgereset)

---

## forge:idea

**Usage:** `/forge:idea [your app idea]`

**Phase:** Planning (before anything else)

**What it does:**

Transforms a vague app description into a structured specification. Asks 4–6 clarifying questions covering the core problem, target users, key actions, integrations, scale, and non-goals. Then writes `forge-context.md` to your working directory.

**Before running:** Confirms your current working directory and asks you to verify it's where you want to build.

**Output:** `forge-context.md` — structured spec with app name, problem statement, target users, core features, data entities, auth method, and tech stack.

**Example:**
```
/forge:idea A SaaS tool for managing freelance contracts
```

**Next step:** `/forge:prd`

---

## forge:prd

**Usage:** `/forge:prd`

**Phase:** Planning

**What it does:**

Reads `forge-context.md` and generates a comprehensive Product Requirements Document covering:

1. Product Overview (name, tagline, success metrics)
2. User Personas (goals, pain points, key actions)
3. Feature Specifications (user stories, acceptance criteria, priority P0/P1/P2)
4. Data Model (tables, fields, relationships)
5. API Design (endpoints, request/response shapes, auth)
6. Frontend Pages & Components (routes, key components, data fetched)
7. Authentication & Authorization (method, roles, protected routes)
8. Non-Functional Requirements (performance, security, accessibility)
9. GitHub Issue Breakdown (all issues by phase label)

**Requires:** `forge-context.md` (run `/forge:idea` first)

**Output:** `forge-prd.md` — typically 20–40 issues across all phases

**Issue phases generated:**
- `phase:frontend` — Next.js pages and components
- `phase:backend` — FastAPI endpoints and services
- `phase:database` — PostgreSQL schema and migrations
- `phase:integration` — API wiring, CORS, env vars
- `phase:architecture` — Design decisions
- `phase:security` — Security requirements
- `phase:testing` — Tests and QA

**Next step:** `/forge:init`

---

## forge:init

**Usage:** `/forge:init`

**Phase:** Planning

**What it does:**

1. Creates a private GitHub repo from the app name slug
2. Deletes default GitHub labels and creates the forge label taxonomy
3. Creates 4 milestones (Frontend, Database & Backend, Integration, Review & Polish)
4. Creates every issue from the PRD's issue breakdown with correct labels and milestone
5. Saves `forge-state.json` with `phase: "ready"`

**Requires:** `forge-prd.md` (run `/forge:prd` first), `gh` CLI authenticated

**Output:** GitHub repo + issues, `forge-state.json`

**forge-state.json after init:**
```json
{
  "repo": "owner/my-app",
  "app_name": "My App",
  "phase": "ready",
  "issues_created": [1, 2, 3, ...],
  "milestones": { "frontend": 1, "backend_db": 2, "integration": 3, "review": 4 }
}
```

**Next step:** `/forge:build-frontend`

---

## forge:build-frontend

**Usage:** `/forge:build-frontend`

**Phase:** Phase 1 (requires `phase: "ready"`)

**What it does:**

1. Scaffolds `frontend/` with Next.js 16 + shadcn/ui if not already present
2. Fetches all `phase:frontend + status:agent-todo` issues from GitHub
3. Creates the `forge-frontend` agent team
4. Spawns `build-team-lead` which orchestrates:
   - Auth issues are implemented **first** (before feature pages)
   - Up to 4 `frontend-builder` agents run in parallel
   - `code-reviewer` runs live, sending HIGH findings to builders inline
   - After all builders complete: `test-runner` runs full regression suite
5. After build-team-lead completes: spawns `arch-reviewer` for structural pass
6. Updates `forge-state.json` → `phase: "frontend-review"`

**Guard:** Only runs when `phase === "ready"`. Shows the correct next step for any other phase.

**Output:** Built frontend in `./frontend/`, review findings as GitHub issues

**What builders enforce:**
- Apple HIG design principles (spacing, color, typography)
- Universal search (`lib/search.ts` utility, diacritics-insensitive, `+` AND operator)
- Table standards (sort, column visibility/resize/reorder, pagination, localStorage)
- context7 docs lookup before writing any code
- Playwright verification before committing

**Next step:** Review `cd frontend && npm run dev`, then `/forge:approve`

---

## forge:approve

**Usage:** `/forge:approve [optional note for agents]`

**Phase:** Phase 1 → Phase 2 gate (requires `phase: "frontend-review"`)

**What it does:**

This is the **human gate** between Phase 1 and Phase 2. You run this after reviewing the built frontend and deciding it's ready for the backend build.

1. If an argument is provided, saves it as `approval_notes` in `forge-state.json`
2. Checks for open `type:review-finding` issues from Phase 1 — asks if you want to proceed anyway
3. Updates `forge-state.json` → `phase: "approved"`

**Example with note:**
```
/forge:approve Auth flow needs rework — login redirect is broken
```

**Next step:** `/forge:build-backend`

---

## forge:build-backend

**Usage:** `/forge:build-backend`

**Phase:** Phase 2 (requires `phase: "approved"`)

**What it does:**

1. Fetches all database, backend, and integration issues from GitHub
2. Creates the `forge-backend` agent team
3. Spawns `build-team-lead` which orchestrates a **strictly sequenced** build:
   - **Step 1:** `db-designer` runs first — designs schema, writes SQLAlchemy models, generates Alembic migration. Backend builders cannot start until this completes.
   - **Step 2:** Up to 4 `backend-builder` agents run in parallel (with schema available)
   - **Step 3:** `integration-agent` runs last — wires frontend API calls to backend endpoints, configures CORS, documents env vars
   - **Step 4:** `test-runner` runs full regression suite
4. After build-team-lead completes: spawns `code-reviewer` + `arch-reviewer` in parallel (final review pass on backend + integration code)
5. Updates `forge-state.json` → `phase: "integration-review"`

**Guard:** Only runs when `phase === "approved"`. Shows guidance for any other phase.

**Output:** `./backend/` (FastAPI project), `backend/db_schema.md`, `frontend/lib/api/` (typed API client), review findings as GitHub issues

**Next step:** `/forge:review` (optional), `/forge:audit`, or `/forge:deploy`

---

## forge:review

**Usage:** `/forge:review [scope: frontend | backend | all]`

**Phase:** Anytime (after a build phase)

**What it does:**

Spawns a coordinated review team of two agents in parallel:
- `code-reviewer` — reviews code quality, security, missing states, TypeScript errors
- `arch-reviewer` — reviews architectural patterns, service layer, component structure

Both agents use a **deduplication protocol**: before filing any issue, each checks with the other via SendMessage to avoid creating duplicate findings.

All findings become GitHub issues with labels `type:review-finding`, `status:agent-todo`, and the appropriate `phase:*` label.

**Scope argument:**
- `frontend` — only reviews `./frontend/`
- `backend` — only reviews `./backend/`
- `all` (default) — reviews the full codebase

**Output:** GitHub issues with findings, summary count by severity

**Typical use:** After `/forge:build-frontend` or `/forge:build-backend`, before approving or auditing.

**Next step:** `/forge:implement` to fix findings

---

## forge:implement

**Usage:** `/forge:implement [issue numbers, comma-separated]`

**Phase:** Anytime

**What it does:**

A **repair tool** — implements specific GitHub issues produced by reviews and audits. Not a replacement for the build skills (which run a full team with live review).

**With issue numbers:**
```
/forge:implement 42
/forge:implement 42,43,45
```
Fetches and implements those specific issues (skips closed ones).

**Without arguments:**
Lists all open `status:agent-todo` issues and asks for confirmation before proceeding.

**Under the hood:**
1. Spawns `issue-dispatcher` which routes issues to the correct builder by `phase:*` label
2. Enforces sequencing: `phase:database` first, `phase:integration` last
3. After all builders complete: spawns `test-runner` for regression detection
4. Reports implemented issues, failed issues, and regression findings

**Important:** `forge:implement` has no live code-reviewer. For issues that need architectural review after implementation, run `/forge:review` afterward.

**Phase routing:**
| Label | Builder |
|-------|---------|
| `phase:frontend` | `frontend-builder` |
| `phase:backend` | `backend-builder` |
| `phase:database` | `db-designer` |
| `phase:integration` | `integration-agent` |
| `phase:architecture`, `phase:security`, etc. | Inferred from issue body |

---

## forge:audit

**Usage:** `/forge:audit`

**Phase:** Anytime (best after Phase 2 is complete)

**What it does:**

Launches 6 specialist auditors in parallel, each writing their own report file, then consolidates into `AUDIT_REPORT.md` and creates GitHub issues.

**The 6 auditors:**

| Auditor | Finds |
|---------|-------|
| `dead-code-hunter` | Unused functions, imports, components, DB columns, routes |
| `missing-impl-auditor` | TODOs, empty handlers, broken references, hardcoded mock data |
| `data-integrity-auditor` | Missing FK constraints, missing indexes, no transactions, orphaned records |
| `security-auditor` | Hardcoded secrets, missing auth, SQL injection, XSS, CSRF, missing rate limiting |
| `consistency-auditor` | Mixed naming, duplicate logic, inconsistent error formats, circular dependencies |
| `saas-pages-auditor` | Missing SaaS pages: login, logout, profile, billing, onboarding, legal, error pages |

**Cross-referencing:** `data-integrity-auditor` coordinates with `missing-impl-auditor` on orphaned DB objects. Findings flagged by multiple auditors are deduplicated.

**GitHub issues created:**
- One issue per CRITICAL finding
- One issue per HIGH finding
- One grouped issue per category for MEDIUM findings
- One grouped issue for all LOW findings

All audit issues get `status:agent-todo` + appropriate `phase:*` label so `/forge:implement` can route them.

**Output files:**
- `AUDIT_REPORT.md` — consolidated report with executive summary and fix roadmap
- `AUDIT_DEAD_CODE.md`, `AUDIT_MISSING_IMPL.md`, `AUDIT_DATA_INTEGRITY.md`, `AUDIT_SECURITY.md`, `AUDIT_CONSISTENCY.md`, `AUDIT_SAAS_PAGES.md`

**Severity levels:**
| Level | Definition |
|-------|-----------|
| CRITICAL | Data loss risk, security vulnerability, broken core functionality |
| HIGH | Feature gaps, significant dead code, missing error handling |
| MEDIUM | Inconsistencies, missing validation, code quality issues |
| LOW | Minor cleanup, style, optimization suggestions |

**Next step:** `/forge:implement` to fix findings

---

## forge:deploy

**Usage:** `/forge:deploy`

**Phase:** After `integration-review` or `deployed`

**What it does:**

1. Verifies environment variable documentation exists (`frontend/.env.local.example`, `backend/.env.example`)
2. Shows all required env vars and asks you to confirm they're set in your deployment platforms
3. Deploys frontend via `vercel --prod` (requires Vercel CLI)
4. Deploys backend via Railway CLI or Render (via GitHub push)
5. Runs a post-deploy Playwright smoke test on the live frontend URL
6. Runs `curl /health` on the backend
7. Updates `forge-state.json` → `phase: "deployed"` with deployment URLs

**If Vercel CLI is not installed:**
```
Install with: npm i -g vercel && vercel login
Then re-run /forge:deploy
```

**Output:** Live frontend + backend URLs in `forge-state.json`

---

## forge:status

**Usage:** `/forge:status`

**Phase:** Anytime

**What it does:**

Shows a snapshot of the current project state:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 My App
 Phase: frontend-review  |  Repo: owner/my-app
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Issues
  Open:   18  (agent-todo: 5  |  needs-review: 3  |  blocked: 0)
  Closed: 12

Ready to implement (5):
  #23 Fix missing loading state on dashboard
  #24 Add error boundary to settings page
  ...

Review findings open: 3
Last commits: ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next step: Run /forge:approve when ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## forge:build

**Usage:** `/forge:build`

**Phase:** Anytime

**What it does:**

A thin dispatcher — reads the current phase and tells you exactly what to run next:

| Phase | Next step |
|-------|-----------|
| `ready` | `/forge:build-frontend` |
| `frontend-review` | `/forge:approve` |
| `approved` | `/forge:build-backend` |
| `integration-review` | `/forge:audit` |
| `deployed` | `/forge:status` |

Run this if you're returning to a project and aren't sure where you left off.

---

## forge:reset

**Usage:** `/forge:reset [--hard]`

**Phase:** Anytime

**What it does:**

Resets `forge-state.json` back to `phase: "ready"` so you can re-run the build phases. The GitHub repo, issues, and code are **not** deleted unless you use `--hard`.

**Steps:**
1. Shows current state (app name, repo, phase, deployment URLs)
2. Asks for confirmation
3. Optionally reopens all closed GitHub issues
4. Resets phase to `"ready"`, removes `deployment` and `approval_notes`

**With `--hard`:**
```
/forge:reset --hard
```
Also deletes `frontend/` and `backend/` directories — full rebuild from scratch.

**When to use:**
- You changed the PRD significantly and want to rebuild
- A build phase got stuck in a broken state
- You want to test the full workflow again from scratch

**What is NOT reset:**
- `forge-context.md` and `forge-prd.md` (your spec files)
- The GitHub repo and its issues
- Git history
