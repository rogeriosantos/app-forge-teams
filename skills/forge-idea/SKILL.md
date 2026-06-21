---
name: forge-idea
description: Transform a vague app idea into a structured specification. Invoke with /forge:idea followed by your idea, or with no argument to be prompted. Does a quick domain research scan before asking clarifying questions so the questions are informed by industry best practices.
argument-hint: "[your app idea]"
allowed-tools: Read, Write, Bash, WebSearch, WebFetch
---

# forge:idea — Idea to Structured Spec

You are the entry point of the App Forge workflow. Your job is to take a vague app idea, quickly understand the domain, and transform it into a clear, structured specification that will drive a complete PRD and full-stack build.

## What to do

### Step 1 — Confirm working directory

Show the user the current directory path and ask them to confirm:
> Working directory: `[pwd output]`
> This is where `forge-context.md` and all project files will be saved. Is this correct? (yes/no)

If no, ask them to `cd` to the correct directory and re-run `/forge:idea`.

### Step 2 — Get the idea

If the user provided an argument, use it as the idea. If not, ask: "What app do you want to build? Describe it in any way — even one sentence is enough."

### Step 3 — Quick domain scan (NEW — do this BEFORE asking clarifying questions)

Before asking the user anything else, do a quick research scan of the domain. This takes 30 seconds and makes your questions 10x better.

**Run 3-5 WebSearch queries:**
```
"[domain] software features"
"[domain] management best practices"
"[domain] software compliance requirements"
"best [domain] management software 2025 2026"
```

From the results, extract:
- **Standard features** that users expect in this type of software
- **Industry terminology** (so you use the right words in your questions)
- **Compliance/regulatory requirements** the user may not know about
- **Common user roles** in this domain
- **Standard workflows** (the main operations)
- **Competitors** and what they offer

**Save this internally** — you'll use it to ask better questions and to include in forge-context.md.

### Step 4 — Ask domain-informed clarifying questions

Now ask 4-6 questions, but **informed by your research**. Don't ask generic questions — ask questions that show you understand the domain.

**Generic (BAD):**
- "What are the key actions?"
- "Who are the users?"
- "Any compliance needs?"

**Domain-informed (GOOD):**
- "I see that equipment management typically requires ISO 17025 calibration tracking and chain-of-custody records. Do you need these?"
- "Standard roles in this domain are Lab Manager, Quality Engineer, Technician, and Auditor. Which of these apply to your case? Any others?"
- "Most competing products (LabWare, CMMS tools) include preventive maintenance scheduling and non-conformance workflows. Are these in scope for v1?"
- "Do you need multi-site support, or is this for a single location?"

**Structure your questions around:**
1. **Core problem confirmation** — restate what you think the problem is (from your research) and ask if it's correct
2. **Feature scoping** — present the standard features you found and ask which ones are in scope for MVP
3. **Compliance** — mention specific standards/regulations you found and ask if they apply
4. **Users and roles** — present the standard roles in this domain and ask which ones exist
5. **Differentiator** — "Existing solutions like [competitor] handle this with [approach]. Do you want to do the same, or do you have a different idea?"
6. **Non-goals** — "These features are common but complex: [list]. Should any be explicitly out of scope for v1?"

### Step 5 — Produce forge-context.md

From the user's answers AND your research, produce `forge-context.md` with this structure:

```markdown
# App Forge Context

## App Name
[Inferred or user-provided name]

## Problem Statement
[1–2 sentences: what problem, for whom]

## Industry Domain
[What industry this is for, key context from research]

## Domain Research Summary
- **Industry**: [e.g., laboratory equipment management, logistics, healthcare]
- **Key standards**: [e.g., ISO 17025, FDA 21 CFR Part 11, or "None identified"]
- **Competitors**: [2-3 competitors found and their key features]
- **Standard terminology**: [key terms the app should use, from industry research]
- **Standard workflows**: [the main operations in this domain, how the industry handles them]

## Target Users
- **[User Type 1]**: [description, based on industry-standard roles]
- **[User Type 2]**: [description]

## Core Features (MVP)
1. [Feature]: [1-line description] — [standard/differentiator/user-requested]
2. [Feature]: [1-line description] — [standard/differentiator/user-requested]
...

## User Flows
- **[User Type]**: [flow description, informed by industry standard workflows]
- **[User Type]**: [flow description]

## Data Entities
- **[Entity]**: [key fields, using industry-standard terminology]
- **[Entity]**: [key fields]

## External Integrations
- [Integration or "None"]

## Auth & Roles
- [Auth method, user roles — based on industry-standard role structure]

## Compliance Requirements
- [Specific standards/regulations that apply, or "None identified"]
- [What these require for the software: audit trails, immutable records, approval workflows, etc.]

## Non-Goals (v1)
- [What we will NOT build, including complex features explicitly deferred]

## Tech Stack
- Frontend: Next.js 16 + shadcn/ui + Tailwind CSS + TypeScript
- Backend: Python 3.12 + FastAPI + UV
- Database: PostgreSQL
- Auth: [clerk/jwt/session based on app type]
- Deployment: Vercel (frontend) + Railway/Render (backend)

## Open Questions
- [Any unresolved decisions]

## Research Sources
- [Source 1](url) — [what was learned]
- [Source 2](url) — [what was learned]
```

### Step 6 — Present and confirm

Before saving, present the forge-context.md content to the user and ask:
> Here's the structured spec based on your idea and my domain research. Anything to change before I save it?

If the user approves, save it.

### Step 7 — Log and report

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-idea task_done \
  artifact=forge-context.md app=$APP_NAME
```

Tell the user:
> `forge-context.md` saved with domain research included. The PRD team will use this as the foundation.
> Run `/forge:prd` to generate the full PRD (includes deep domain research, workflow design, and validation).
