# End-to-End Example Walkthrough

This document walks through a complete forge session — from idea to deployed app — for a real example: a **freelance contract management SaaS**.

---

## The Idea

> A SaaS tool where freelancers can create, send, and track client contracts. Clients can sign online. Freelancers get notified when signed.

---

## Step 1 — forge:idea

```
/forge:idea A SaaS for freelancers to create, send, and track contracts with online signing
```

**Forge confirms working directory:**
```
Working directory: /Users/john/projects/contractly
Is this correct? (yes/no)
```

**Forge asks clarifying questions:**
```
1. Who signs contracts — freelancers AND clients, or just clients?
2. Do freelancers need templates, or do they write contracts from scratch?
3. Any payment integration (e.g. charge on signature)?
4. Single freelancer per account, or do you need team/agency support?
5. What's NOT in v1? (e.g. video calls, project management, invoicing?)
```

**After answers, forge writes `forge-context.md`:**

```markdown
# App Forge Context

## App Name
Contractly

## Problem Statement
Freelancers lose time chasing unsigned contracts sent over email.
They need a simple, professional way to send, track, and collect signatures online.

## Target Users
- **Freelancer**: creates and sends contracts, tracks signing status
- **Client**: receives link, reads contract, signs online (no account required)

## Core Features (MVP)
1. Contract builder: rich text editor with reusable clauses
2. Contract templates: save and reuse common contract structures
3. Send for signature: generate unique signing link per client
4. Online signing: client signs with typed name + timestamp, no account needed
5. Status tracking: real-time dashboard showing sent/viewed/signed/expired
6. Email notifications: freelancer notified on sign; client gets reminder

## Data Entities
- User (freelancer account), Contract, Template, Clause, Signature, Client

## Auth & Roles
- JWT auth for freelancers; clients sign via unique token (no login)

## Non-Goals (v1)
- Team/agency accounts, payment integration, video calls, invoicing
```

---

## Step 2 — forge:prd

```
/forge:prd
```

Generates `forge-prd.md` with 34 issues across 6 phases:

```
phase:frontend (13 issues)
  - Auth pages (login/register/forgot password)
  - Dashboard with contract list and status indicators
  - Contract builder with rich text editor
  - Template library page
  - Send contract flow (client email + message)
  - Client signing page (public, no auth)
  - Signature confirmation page
  - Settings page (profile, password, notifications)
  - Empty states for all list views
  ...

phase:backend (11 issues)
  - Auth endpoints (register, login, refresh, logout)
  - Contracts CRUD
  - Templates CRUD
  - Send contract (generate unique token, send email)
  - Sign contract endpoint (validates token, records signature)
  - Dashboard stats endpoint
  ...

phase:database (2 issues)
  - Initial PostgreSQL schema and Alembic migration

phase:integration (2 issues)
  - Wire frontend API calls to backend
  - Document all environment variables

phase:security (3 issues)
  - Rate limiting on auth endpoints
  - CSRF protection on signing endpoint
  - Input sanitization on contract content

phase:testing (3 issues)
  - E2E test: full sign flow
  - Unit tests for token generation and validation
  - Load test for dashboard stats endpoint
```

---

## Step 3 — forge:init

```
/forge:init
```

```
Creating repo: contractly (private)
Creating 14 labels...
Creating 4 milestones...
Creating 34 issues...

Repo contractly initialized with 34 issues across 4 milestones.

Issues by phase:
  Frontend: 13 issues
  Backend + DB: 13 issues
  Integration: 2 issues
  Architecture/Security/Testing: 6 issues

Run /forge:build-frontend to start Phase 1.
```

`forge-state.json`:
```json
{
  "repo": "johndoe/contractly",
  "app_name": "Contractly",
  "phase": "ready",
  "issues_created": [1, 2, 3, ..., 34]
}
```

---

## Step 4 — forge:build-frontend

```
/forge:build-frontend
```

```
Scaffolding Next.js 16 frontend...
✅ npx create-next-app@latest frontend (typescript, tailwind, app router)
✅ npx shadcn@latest init

Fetching phase:frontend issues... found 13

Auth-related issues detected: #1 (Auth pages)
→ Will build auth scaffold first before other features.

Creating team: forge-frontend

Spawning build-team-lead...
```

**What happens inside the team:**

```
build-team-lead
  ↓
  Spawning code-reviewer (live, phase:frontend)
  ↓
  Batch 1 (auth first):
    frontend-builder → #1: Auth pages (login/register/forgot password)
  ↓
  [#1 complete]
  ↓
  Batch 2 (parallel, max 4):
    frontend-builder → #2: Dashboard with contract list
    frontend-builder → #3: Contract builder
    frontend-builder → #4: Template library page
    frontend-builder → #5: Send contract flow
  ↓
  code-reviewer: [HIGH] Issue #3 — contract-builder/page.tsx:45:
    Missing 'use client' directive on a component using useState
  → SendMessage → builder #3 → fixed inline
  ↓
  [Batch 2 complete]
  ↓
  Batch 3 (parallel):
    frontend-builder → #6: Client signing page
    frontend-builder → #7: Signature confirmation
    frontend-builder → #8: Settings page
    frontend-builder → #9: Empty states
  ↓
  code-reviewer creates 3 MED issues (hardcoded strings, missing error.tsx on signing page)
  ↓
  [All builders done]
  → SendMessage to code-reviewer: {"type": "builders_done"}
  → code-reviewer: final pass, sends review_done (2 LOW issues batched)
  ↓
  Spawning test-runner...
    ✅ Backend: N/A (no backend yet)
    ✅ Frontend build: pass
    ✅ Playwright: 9/9 routes pass
  test-runner: regression_report (status: "pass")
  ↓
  phase_complete sent
```

```
[After build-team-lead completes]
Spawning arch-reviewer for structural pass...
  ✅ Next.js App Router structure: correct
  → [MED] Contract builder component is 280 lines — suggests extracting clause editor
  → 1 issue created (#35)

Phase updated: frontend-review

Frontend build complete.

Built 13 issues. Code reviewer created 5 findings. Arch reviewer created 1 architectural finding.
Regression tests: passed (0 issues found).

Next steps:
  1. Review: cd frontend && npm run dev
  2. Run /forge:review for extra review (optional)
  3. Run /forge:approve when ready
```

---

## Step 5 — forge:approve

You run the frontend locally, test the signing flow in demo mode, and it looks good.

```
/forge:approve The contract builder textarea needs better placeholder text
```

```
Current phase: frontend-review

There are 6 open review findings from Phase 1.
Proceed to backend/DB build anyway? These will remain as issues to fix later. (yes/no)
> yes

Saving approval note: "The contract builder textarea needs better placeholder text"
Frontend approved. Phase updated to "approved".
Run /forge:build-backend to start Phase 2 (database + backend build).
```

---

## Step 6 — forge:build-backend

```
/forge:build-backend
```

```
Fetching issues:
  Database: 2 issues
  Backend: 11 issues
  Integration: 2 issues

Creating team: forge-backend
Spawning build-team-lead (Phase 2)...
```

**Phase 2 sequencing inside the team:**

```
Step 2a: db-designer (FIRST — backend waits for schema)
  context7: sqlalchemy async, alembic autogenerate, fastapi DI
  Reads forge-prd.md data model + frontend TypeScript interfaces
  Designs schema:
    users (id uuid, email, password_hash, name, created_at, updated_at)
    contracts (id, user_id FK, title, content, status, expires_at, ...)
    templates (id, user_id FK, name, content, ...)
    clients (id, name, email, ...)
    signatures (id, contract_id FK, client_id FK, signed_at, ip_address, ...)
  Writes SQLAlchemy models
  Runs: alembic revision --autogenerate -m "initial schema"
  Writes: backend/db_schema.md
  Closes #14 (schema), #15 (migration)
  → task_done: 5 tables, migration ready

Step 2b: backend-builders (parallel, schema available)
  backend-builder → #16: Auth endpoints (register/login/refresh/logout)
  backend-builder → #17: Contracts CRUD
  backend-builder → #18: Templates CRUD
  backend-builder → #19: Send contract (token generation + email)
  [4 at a time, 11 total backend issues]

  All builders run pytest before every commit.
  code-reviewer: [HIGH] #18 — templates router missing auth dependency
  → SendMessage → builder #18 → fixed inline

Step 2c: integration-agent (LAST)
  Audits all fetch() calls in frontend/lib/
  Maps to backend route definitions
  Fixes: /api/contracts → /contracts (path mismatch on 3 endpoints)
  Creates: frontend/lib/api/client.ts, frontend/lib/api/contracts.ts
  Configures CORS in backend/app/main.py
  Creates .env.local.example + backend/.env.example
  Commits + closes #27, #28

Step 2d: test-runner
  ✅ pytest: 23 passed, 0 failed
  ✅ frontend build: pass
  ✅ playwright: 12/12 routes pass
  → regression_report: status: "pass"

phase_complete
```

```
Final review team (parallel):
  code-reviewer: 2 MED findings on backend (missing pagination on /contracts list)
  arch-reviewer: 1 HIGH finding (contracts service is doing email sending — should be separate EmailService)
  → 3 issues created (#36, #37, #38)

Phase updated: integration-review

Backend build complete. Frontend is now wired to the backend.

Built: 2 database issues, 11 backend issues, 2 integration issues.
Final review created 3 issues.
Regression tests: passed.

Next steps:
  1. Test both servers locally
  2. Run /forge:audit for a comprehensive quality check
  3. Run /forge:deploy when ready to ship
```

---

## Step 7 — forge:audit

```
/forge:audit
```

13 auditors run in parallel across three domains (quality 6 · UX 4 · workflow 3), each writing their report file. After ~3 minutes:

```
Audit complete. Found 18 issues across 3 domains.
  CRITICAL: 1  |  HIGH: 3  |  MEDIUM: 9  |  LOW: 5

Full report: AUDIT_REPORT.md
Created 9 GitHub issues.

Top 3 things to fix first:
  1. [CRITICAL] security: Signing token not expiring — contracts can be signed after expiry
  2. [HIGH] missing-impl: Email service not implemented — send_contract calls placeholder
  3. [HIGH] data-integrity: contracts.client_id has no FK constraint (can reference deleted clients)
```

---

## Step 8 — forge:implement (fix audit findings)

```
/forge:implement 39,40,41
```

Implements the 3 critical/high audit findings. Runs regression tests after.

```
Implementation complete.

✅ Implemented (3 issues):
  #39 — Fix signing token expiry check (commit: a1b2c3d)
  #40 — Implement email service (commit: b2c3d4e)
  #41 — Add FK constraint on contracts.client_id (commit: c3d4e5f)

❌ Failed: 0

Regression tests: passed
```

---

## Step 9 — forge:deploy

```
/forge:deploy
```

```
Environment variables:
  frontend/.env.local.example — 3 variables (NEXT_PUBLIC_API_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)
  backend/.env.example — 6 variables (DATABASE_URL, SECRET_KEY, SMTP_HOST, ...)

Have you configured these in your deployment platforms? (yes/no)
> yes

Deploying frontend to Vercel...
✅ https://contractly-johndoe.vercel.app

Deploying backend to Railway...
✅ https://contractly-production.railway.app

Running smoke tests...
  Frontend: ✅ loaded, 0 console errors
  Backend: ✅ /health → {"status": "ok"}

forge-state.json updated: phase = "deployed"

Deployed.

Frontend: https://contractly-johndoe.vercel.app
Backend:  https://contractly-production.railway.app

Smoke test: ✅ passed
```

---

## Final State

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Contractly
 Phase: deployed  |  Repo: johndoe/contractly
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Issues
  Open:   12  (agent-todo: 8  |  needs-review: 4)
  Closed: 42

Frontend: https://contractly-johndoe.vercel.app
Backend:  https://contractly-production.railway.app

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next step: Run /forge:audit for ongoing quality checks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Common Patterns

### Returning to a project after a break

```
/forge:status    ← see where you left off
/forge:build     ← if unsure what to run next
```

### Extra review pass after implementing fixes

```
/forge:implement 42,43
/forge:review frontend   ← scope to only what changed
```

### Rebuilding from scratch with a changed PRD

```
/forge:reset --hard      ← deletes frontend/ and backend/
# edit forge-prd.md (or re-run /forge:prd)
/forge:build-frontend
```

### Implementing only specific audit findings

```
/forge:audit
# Read AUDIT_REPORT.md, pick what to fix
/forge:implement 55,56   ← specific issue numbers
```
