---
name: forge-prd
description: Generate a complete Product Requirements Document from the structured app spec. Reads forge-context.md and produces forge-prd.md.
allowed-tools: Read, Write
---

# forge:prd — Spec to PRD

Read `forge-context.md` from the current directory. If it does not exist, tell the user to run `/forge:idea` first.

Generate a comprehensive `forge-prd.md` with the following sections:

---

## 1. Product Overview
- App name, tagline, problem statement
- Success metrics (what does "done" look like?)

## 2. User Personas
For each user type: name, role, goals, pain points, key actions

## 3. Feature Specifications
For each MVP feature:
- **Feature name**
- Description
- User stories: `As a [user], I want to [action] so that [benefit]`
- Acceptance criteria (bullet list)
- Priority: P0 (must-have) / P1 (important) / P2 (nice-to-have)

## 4. Data Model
For each entity:
- Table name (snake_case)
- Fields: name, type, constraints, description
- Relationships (FK references)

## 5. API Design
For each resource:
- Endpoints: METHOD /path — description
- Request/response shape (JSON)
- Auth requirement

## 6. Frontend Pages & Components
For each page:
- Route
- Purpose
- Key components
- Data fetched
- User actions

## 7. Authentication & Authorization
- Auth method
- User roles and permissions matrix
- Protected routes

## 8. Non-Functional Requirements
- Performance targets
- Security requirements (input validation, rate limiting, HTTPS)
- Accessibility (WCAG AA minimum)

## 9. GitHub Issue Breakdown
List ALL issues to be created, grouped by label:

**phase:frontend** (Next.js)
- [ ] [Issue title] — [1-line description]

**phase:backend** (FastAPI)
- [ ] [Issue title] — [1-line description]

**phase:database** (PostgreSQL + Alembic)
- [ ] [Issue title] — [1-line description]

**phase:architecture**
- [ ] [Issue title] — [1-line description]

**phase:security**
- [ ] [Issue title] — [1-line description]

**phase:testing**
- [ ] [Issue title] — [1-line description]

---

Be thorough. A complete PRD for a small app should have 20–40 issues total.

After saving `forge-prd.md`, tell the user:
> `forge-prd.md` saved with [N] issues planned. Run `/forge:init` to create the GitHub repo and issues.
