# Agents Reference

Complete documentation for every agent in the App Forge Teams system.

Agents are not invoked directly — they are spawned by skills or by other agents. This document explains what each agent does, what it receives, and what it produces.

---

## Table of Contents

**Build agents**
- [build-team-lead](#build-team-lead)
- [frontend-builder](#frontend-builder)
- [backend-builder](#backend-builder)
- [db-designer](#db-designer)
- [integration-agent](#integration-agent)

**Review agents**
- [code-reviewer](#code-reviewer)
- [arch-reviewer](#arch-reviewer)
- [test-runner](#test-runner)

**Implement agents**
- [issue-dispatcher](#issue-dispatcher)

**Audit agents**
- [dead-code-hunter](#dead-code-hunter)
- [missing-impl-auditor](#missing-impl-auditor)
- [data-integrity-auditor](#data-integrity-auditor)
- [security-auditor](#security-auditor)
- [consistency-auditor](#consistency-auditor)
- [saas-pages-auditor](#saas-pages-auditor)

---

## build-team-lead

**Color:** Magenta  
**Spawned by:** `forge:build-frontend`, `forge:build-backend`

The orchestrator of a build phase. Coordinates builders, tracks progress via tasks, monitors the live code-reviewer, and manages Phase 2 sequencing.

**Phase detection:**
- Checks issue labels to detect Phase 1 (frontend issues) vs Phase 2 (database/backend/integration issues)
- Applies different coordination strategies per phase

**Phase 1 behavior:**
- Spawns `frontend-builder` agents in parallel (max 4)
- Detects auth-related issues and ensures they're built first
- Spawns `code-reviewer` concurrently with `phase:frontend` label
- Signals `code-reviewer` when all builders are done (so it can finalize and report)
- Spawns `test-runner` after all builders complete

**Phase 2 behavior (strict sequencing):**
1. Spawns `db-designer` first — waits for schema to be ready
2. Spawns parallel `backend-builder` agents (max 4, with schema available)
3. Spawns `integration-agent` after all backend-builders complete
4. Spawns `test-runner` after integration-agent completes
5. Spawns `code-reviewer` with `phase:backend` label throughout

**Reviewer findings handling:**
- HIGH → SendMessage to the owning builder (inline fix before commit)
- MED → create GitHub issue
- LOW → batch into a single GitHub issue at end of phase

**Reports back:**
```json
{
  "phase_complete": true,
  "issues_built": [42, 43, 45],
  "review_issues_created": [67, 68],
  "regression_report": { "status": "pass", "regressions_found": 0 },
  "summary": "..."
}
```

---

## frontend-builder

**Color:** Cyan  
**Spawned by:** `build-team-lead`, `issue-dispatcher`

Implements one frontend GitHub issue at a time. Reports progress to the team lead, accepts live reviewer feedback, verifies with Playwright before committing.

**Process:**
1. Looks up current docs with context7 (mandatory — every library it will touch)
2. Claims the task (`TaskUpdate: in_progress`)
3. Reads `forge-prd.md` and existing `frontend/` patterns
4. Implements the feature following mandatory standards (see below)
5. Verifies with Playwright before committing (navigate → screenshot → console errors → interactions)
6. Responds to HIGH findings from code-reviewer inline
7. Commits with `git add [specific files]` (never `git add -A`)
8. Closes the GitHub issue with a commit reference

**Mandatory design standards:**
- **Apple HIG principles** — radical simplicity, 8px grid, 44px touch targets, semantic color palette
- **Table behavior** — sort, column visibility/resize/reorder, pagination (default 10), localStorage persistence, reset button
- **Universal search** — multi-field, diacritics-insensitive, `+` AND operator via `lib/search.ts`

**Tech stack enforced:**
- Next.js 16 App Router (Server Components by default, `'use client'` only when needed)
- shadcn/ui for all UI primitives
- TypeScript strict (no `any`)
- next-intl for all user-facing text (no hardcoded strings)
- `loading.tsx` + `error.tsx` on every page
- Semantic HTML + aria labels

**Hard rules:**
- One issue at a time — never starts the next before confirming completion
- Never touches files owned by another builder
- Never stages `.env*`, `*.key`, `*.pem`, credential files

---

## backend-builder

**Color:** Yellow  
**Spawned by:** `build-team-lead`, `issue-dispatcher`

Implements one FastAPI GitHub issue. Runs pytest before every commit.

**Process:**
1. Looks up current docs with context7 (fastapi, sqlalchemy, pydantic, alembic)
2. Claims the task
3. Reads `forge-prd.md` API Design section and existing `backend/app/` patterns
4. Implements the feature
5. Runs `uv run pytest -x --tb=short` — must pass before committing
6. Responds to code-reviewer HIGH findings inline
7. Commits and closes the GitHub issue

**Standards enforced:**
- Typed Pydantic request/response models (no raw dicts)
- Input validation on all endpoints
- HTTPException with correct status codes
- Service layer — no business logic in route handlers
- structlog for create/update/delete operations
- No secrets in code — env vars via `core/config.py`
- At least one test per feature in `tests/test_[feature].py`

**Hard rules:**
- Never returns passwords or sensitive data in responses
- Never puts DB queries in route handlers
- Coordinates with other backend-builders via team-lead if same table/model needed

---

## db-designer

**Color:** Red  
**Spawned by:** `build-team-lead` (Phase 2, first — all backend-builders wait for this)

Designs the entire PostgreSQL database schema from the PRD and frontend code, then generates Alembic migrations.

**Process:**
1. Looks up current docs with context7 (sqlalchemy async session, alembic autogenerate, fastapi dependency injection)
2. Reads `forge-prd.md` Data Model section
3. Reads all frontend TypeScript interfaces, form fields, and API call shapes
4. Cross-references PRD with frontend expectations — resolves discrepancies
5. Designs schema with: snake_case names, UUID PKs, `created_at`/`updated_at` on every table, FK constraints, indexes on FK columns, NOT NULL constraints, check constraints for enums
6. Creates the full `backend/` FastAPI project structure
7. Writes SQLAlchemy models for every table
8. Runs `alembic revision --autogenerate` and verifies the migration
9. Writes `backend/db_schema.md` — table/column/relationship documentation
10. Closes all `phase:database` issues

**Quality bar:** Schema passes: no orphaned FKs, no missing indexes on FK columns, every table has audit columns, every enum is constrained.

---

## integration-agent

**Color:** Green  
**Spawned by:** `build-team-lead` (Phase 2, last — runs after all backend-builders complete)

Wires the built frontend to the built backend — aligns API calls, configures CORS, creates typed API client, documents env vars.

**Process:**
1. Looks up current docs with context7 (nextjs API routes + env vars, fastapi CORS middleware)
2. Audits all frontend fetch/axios/useSWR calls
3. Audits all backend route definitions
4. Builds a mapping of frontend call → expected endpoint vs actual backend endpoint
5. Fixes mismatches: updates fetch paths, aligns response type interfaces
6. Creates `frontend/lib/api/client.ts` (base API client with env var base URL)
7. Creates `frontend/lib/api/[resource].ts` service files
8. Configures CORS in `backend/app/main.py` (origin from `FRONTEND_URL` env var)
9. Creates/updates env var example files
10. Closes all `phase:integration` issues

---

## code-reviewer

**Color:** Magenta  
**Spawned by:** `build-team-lead` (runs concurrently during build), `forge:review`

Live code quality reviewer. Monitors commits as they land and communicates directly with builders for HIGH findings — before they move on.

**Absolute rule:** Never edits, writes, or creates any source code files.

**Severity classification:**

| Severity | What qualifies | Action |
|----------|---------------|--------|
| HIGH | Security: XSS, missing auth, secrets in code, SQL injection. Broken: missing page, broken import, TypeScript error. Data: sensitive data exposed | SendMessage to builder immediately |
| MED | Missing loading/error/empty states, hardcoded strings, missing validation, `any` TypeScript, accessibility failures, missing tests | Create GitHub issue |
| LOW | Code style, naming improvements, performance optimizations, refactor suggestions | Batch into single issue at end of phase |

**Phase label:** Uses the `$PHASE_LABEL` passed in its prompt (`phase:frontend` or `phase:backend`). Falls back to inferring from file paths (`frontend/` → `phase:frontend`, `backend/` → `phase:backend`).

**Stop condition:** Receives `{"type": "builders_done"}` from `build-team-lead` → does final pass and sends `review_done`.

**Deduplication:** Before creating any issue, checks with `arch-reviewer` via SendMessage to avoid duplicates.

---

## arch-reviewer

**Color:** Blue  
**Spawned by:** `forge:build-frontend` (after build), `forge:build-backend` (after build), `forge:review`

Architecture reviewer. Focuses on structural patterns, not line-level code quality (that's code-reviewer's job).

**Absolute rule:** Never edits, writes, or creates any source code files.

**Frontend review focus:**
- Components >200 lines that should be split
- Business logic in UI components (should be in hooks/services)
- Prop drilling >2 levels (needs context or state management)
- Wrong Server vs Client Component usage
- Missing service layer (direct fetch in components)
- Missing environment variable management

**Backend review focus:**
- Business logic in route handlers (needs service layer)
- Missing repository pattern
- N+1 query risks
- Missing pagination on list endpoints
- Circular imports
- Services violating single responsibility
- Missing background task handling for slow operations

**Overall:**
- Missing CORS configuration
- Frontend/backend response shape mismatches
- Missing `.env.example` files
- Missing `README.md` setup instructions

**Deduplication:** Before creating any issue, checks with `code-reviewer` via SendMessage.

**When spawned directly by skill (not within a build-team-lead team):** Completes and returns — does NOT try to SendMessage to build-team-lead (which may not be running).

---

## test-runner

**Color:** Red  
**Spawned by:** `build-team-lead` (after builders complete), `issue-dispatcher` (after implementations)

Regression detector. Tests the **entire application** — not just newly implemented features — to catch things that broke.

**Process:**
1. Starts backend (uvicorn) and frontend (npm dev) with **readiness polling** (curl loops, max 30s/60s — no hardcoded sleep)
2. Runs `uv run pytest --tb=short -q` on the backend (if present)
3. Runs `npm run build` on the frontend (catches TypeScript errors, broken imports)
4. Playwright sweep: navigates to **every route** (discovered from `find frontend/app -name "page.tsx"`), takes screenshots, checks console for errors, checks network requests for 4xx/5xx

**Regression flags:**
- Console `error` level messages (not warnings)
- Network requests returning 4xx/5xx on routes that should work
- Next.js error boundary rendered (`Something went wrong`)
- Blank page where content is expected

**Does NOT fix anything** — reports only.

**Reports back:**
```json
{
  "type": "regression_report",
  "status": "pass" | "fail",
  "backend_tests": { "passed": 12, "failed": 0 },
  "frontend_build": "pass",
  "playwright_results": [
    { "route": "/dashboard", "status": "pass" },
    { "route": "/settings", "status": "fail", "severity": "HIGH", "issue": "Console error: ..." }
  ],
  "regressions_found": 1,
  "summary": "1 regression: /settings console error (HIGH)"
}
```

---

## issue-dispatcher

**Color:** Yellow  
**Spawned by:** `forge:implement`

Routes issues to the correct builder agent based on `phase:*` labels. Enforces sequencing constraints.

**Routing table:**

| Label | Agent |
|-------|-------|
| `phase:frontend` | `frontend-builder` |
| `phase:backend` | `backend-builder` |
| `phase:database` | `db-designer` |
| `phase:integration` | `integration-agent` |
| `phase:architecture`, `phase:security`, `phase:testing` | Inferred from issue body |
| No phase label | `frontend-builder` (noted in report) |

**Sequencing rules:**
- `phase:database` issues must complete before any `phase:backend` issues start
- `phase:integration` issues run last, after all frontend and backend issues complete
- All other issues run in parallel (max 4 at a time)

**After all builders complete:** Spawns `test-runner` for regression detection. Never reports `dispatch_complete` until test results are in.

**Never implements code itself — routes and coordinates only.**

---

## dead-code-hunter

**Color:** Default  
**Spawned by:** `forge:audit` (in parallel with 5 other auditors)

Finds unused code: functions, variables, imports, exports, React components, API routes, DB columns, and entire files that nothing references.

**Output:** `AUDIT_DEAD_CODE.md`

---

## missing-impl-auditor

**Color:** Orange  
**Spawned by:** `forge:audit` (in parallel)

Finds incomplete or broken implementations: TODO/FIXME comments, empty function bodies, broken imports, routes without handlers, hardcoded mock data in production code, missing error handling.

**Output:** `AUDIT_MISSING_IMPL.md`

**Cross-team:** Coordinates with `data-integrity-auditor` on unused DB procedures.

---

## data-integrity-auditor

**Color:** Default  
**Spawned by:** `forge:audit` (in parallel)

Finds database integrity gaps: missing FK constraints, missing indexes on FK columns, operations without transactions, race conditions on concurrent writes, orphaned records.

**Output:** `AUDIT_DATA_INTEGRITY.md`

**Cross-team:** Signals `missing-impl-auditor` about unused DB objects for cross-checking.

---

## security-auditor

**Color:** Red  
**Spawned by:** `forge:audit` (in parallel)

Finds security vulnerabilities across the full codebase including config files, CI files, and deployment scripts.

**Checks:**
- Hardcoded secrets, API keys, tokens (`[REDACTED]` in findings — never writes actual values)
- Missing authentication on routes
- SQL injection vectors (string concatenation in queries)
- XSS vectors (`dangerouslySetInnerHTML`, unescaped output)
- CORS misconfiguration (wildcard `*` with auth)
- Missing rate limiting on auth endpoints
- Sensitive data in logs
- Insecure cookie configuration
- Path traversal in file operations
- Insecure dependencies (`npm audit`)

**Output:** `AUDIT_SECURITY.md`

---

## consistency-auditor

**Color:** Purple  
**Spawned by:** `forge:audit` (in parallel)

Finds inconsistencies and architectural anti-patterns. First infers the intended architecture (MVC, layered, feature-based) then flags deviations.

**Checks:**
- Mixed naming conventions (camelCase vs snake_case in same layer)
- Duplicate logic that should be abstracted
- Inconsistent error response shapes across endpoints
- Mixed patterns for same concern (some routes use middleware, others inline)
- God objects/functions (>200 lines, >10 responsibilities)
- Missing abstraction layers (direct DB calls in route handlers)
- Circular dependencies
- Inconsistent logging patterns

**Output:** `AUDIT_CONSISTENCY.md`

---

## saas-pages-auditor

**Color:** Default  
**Spawned by:** `forge:audit` (in parallel)

Checks for the presence of all essential SaaS pages and flows. Reports missing pages with severity.

**Checks for:**
- Authentication: login, register, forgot password, reset password, email verification
- User management: profile, settings, avatar upload, password change, account deletion
- Billing: subscription plans, checkout, invoice history, payment method management
- Onboarding: welcome flow, setup wizard, first-use empty states
- Team/org management (if multi-tenant): invite, member list, roles, leave/delete org
- Legal: privacy policy, terms of service, cookie policy
- Error pages: 404, 500, unauthorized (401), forbidden (403)
- Notifications: notification list, read/unread state

**Output:** `AUDIT_SAAS_PAGES.md`
