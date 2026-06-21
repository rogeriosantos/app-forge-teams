---
name: forge-prd
description: Generate a complete Product Requirements Document from the structured app spec. Reads forge-context.md and produces forge-prd.md. Uses a 3-agent team to research the industry domain, design workflows based on best practices, and validate the design for logical consistency — all BEFORE writing the PRD. Produces DOMAIN_RESEARCH.md, WORKFLOW_SPEC.md, WORKFLOW_VALIDATION.md, and the final forge-prd.md.
allowed-tools: Read, Write, Bash, Agent, TeamCreate, TaskCreate, TaskUpdate, TaskList, SendMessage, WebSearch, WebFetch
---

# forge:prd — Research-Driven PRD Generation (3-Agent Team)

You are the **PRD Team Lead**. Your job is to orchestrate 3 specialist agents that research the domain, design workflows, and validate the design — all BEFORE you write a single line of the PRD.

**THE OLD WAY (broken):** Read context → fill in PRD template → get things wrong because nobody researched the domain.

**THE NEW WAY:** Research the industry → design workflows based on best practices → validate for contradictions → THEN write the PRD with confidence.

---

## Step 1 — Read the app context

```bash
cat forge-context.md
```

If `forge-context.md` does not exist, tell the user to run `/forge:idea` first and stop.

Extract:
- App name and domain
- Problem statement
- Target users and roles
- Core features (MVP)
- Data entities
- Tech stack

---

## Step 2 — Create the PRD team

```
TeamCreate:
  team_name: "forge-prd"
  description: "Research-driven PRD generation for [app name]"
```

Create tasks:
```
TaskCreate: title="Domain Research", status="pending"
TaskCreate: title="Workflow Design", status="pending"
TaskCreate: title="Workflow Validation", status="pending"
TaskCreate: title="Write PRD", status="pending"
```

---

## Step 3 — Phase 1: Domain Research (SEQUENTIAL — must finish before design)

Spawn the domain-researcher agent:

```
Agent:
  name: "domain-researcher"
  subagent_type: "app-forge-teams:domain-researcher"
  prompt: |
    Research the industry domain for this application.

    Project root: [path]
    App name: [name]
    Domain: [inferred industry]
    
    Context summary:
    [paste key sections from forge-context.md: problem, users, features, entities]
    
    Team name: forge-prd
    Your team lead name: forge-prd-lead
    When you finish: SendMessage to forge-prd-lead with your summary
    Save your findings to: [path]/DOMAIN_RESEARCH.md
    
    Research thoroughly:
    1. Industry best practices and standard workflows
    2. Existing competitors and their standard features
    3. Regulatory/compliance requirements (ISO, legal)
    4. Standard terminology used by practitioners
    5. Common pitfalls when building software for this domain
    
    Use WebSearch extensively — at least 8-12 different queries.
```

**WAIT** for domain-researcher to complete before proceeding. The research is the foundation for everything else.

Mark task "Domain Research" as completed when done.

---

## Step 4 — Phase 2: Workflow Design (SEQUENTIAL — needs research first)

Read `DOMAIN_RESEARCH.md` to confirm it's thorough. Then spawn the workflow-designer:

```
Agent:
  name: "workflow-designer"
  subagent_type: "app-forge-teams:workflow-designer"
  prompt: |
    Design complete workflows for this application based on the domain research.

    Project root: [path]
    App name: [name]
    
    Read these files:
    - forge-context.md (app specification)
    - DOMAIN_RESEARCH.md (industry best practices — just completed)
    
    Team name: forge-prd
    Your team lead name: forge-prd-lead
    When you finish: SendMessage to forge-prd-lead with your summary
    Save your design to: [path]/WORKFLOW_SPEC.md
    
    Design:
    1. State machines for every major entity
    2. Business rules (numbered: BR-001, BR-002, ...)
    3. User journey maps for each persona
    4. Permission matrix
    5. Cross-workflow dependencies
    6. Notification/event map
    
    Base your design on the DOMAIN_RESEARCH.md — use industry-standard workflows, not guesses.
```

**WAIT** for workflow-designer to complete before proceeding.

Mark task "Workflow Design" as completed when done.

---

## Step 5 — Phase 3: Workflow Validation (SEQUENTIAL — needs design first)

Spawn the workflow-validator:

```
Agent:
  name: "workflow-validator"
  subagent_type: "app-forge-teams:workflow-validator"
  prompt: |
    Validate the designed workflows for logical consistency and completeness.

    Project root: [path]
    App name: [name]
    
    Read these files:
    - forge-context.md (original specification)
    - DOMAIN_RESEARCH.md (industry best practices)
    - WORKFLOW_SPEC.md (designed workflows — just completed)
    
    Team name: forge-prd
    Your team lead name: forge-prd-lead
    When you finish: SendMessage to forge-prd-lead with your summary
    Save your report to: [path]/WORKFLOW_VALIDATION.md
    
    Validate:
    1. State machine consistency (unreachable states, dead ends, contradictions)
    2. Business rule conflicts (does BR-X contradict BR-Y?)
    3. Cross-workflow logic (race conditions, cascading effects)
    4. User journey walk-throughs (can each persona complete their journey?)
    5. Domain compliance (does the design match industry standards?)
    6. Edge case coverage (empty, null, concurrent, cascade)
    
    If you find CRITICAL issues, send them back to forge-prd-lead immediately.
    Zero critical issues is the goal.
```

**WAIT** for workflow-validator to complete.

Mark task "Workflow Validation" as completed when done.

---

## Step 6 — Handle validation issues

Read `WORKFLOW_VALIDATION.md`.

**If CRITICAL issues found:**
1. Read the critical issues
2. Decide whether they need workflow redesign or can be resolved in the PRD
3. If redesign needed: update `WORKFLOW_SPEC.md` yourself based on the validator's recommendations and the domain research
4. Document the resolution in the PRD

**If only MEDIUM/LOW issues:**
- Note them as known trade-offs in the PRD

---

## Step 7 — Phase 4: Write the PRD

Now you have:
- `forge-context.md` — what the user wants
- `DOMAIN_RESEARCH.md` — how the industry works
- `WORKFLOW_SPEC.md` — the designed workflows
- `WORKFLOW_VALIDATION.md` — validation of those workflows

Write `forge-prd.md` with the following sections. **Every section draws from the research and validated workflows, not from assumptions.**

```markdown
# Product Requirements Document: [App Name]

**Generated**: [date]
**Domain research**: DOMAIN_RESEARCH.md
**Workflow specification**: WORKFLOW_SPEC.md
**Validation report**: WORKFLOW_VALIDATION.md

---

## 1. Product Overview
- App name, tagline, problem statement
- Industry domain and context (from DOMAIN_RESEARCH.md)
- Success metrics
- Key industry standards/regulations that apply

## 2. User Personas
For each user type (informed by domain research):
- Name, role, goals, pain points, key actions
- Industry-standard responsibilities for this role
- Permission level

## 3. Domain Context
- Industry terminology glossary (from DOMAIN_RESEARCH.md)
- Relevant standards and regulations
- How competing products handle the key workflows
- Design decisions and their rationale

## 4. Workflow Specifications
For each major workflow (from WORKFLOW_SPEC.md):
- **State machine** with all valid AND invalid transitions
- **Business rules** (numbered, with enforcement layer)
- **User journey** step-by-step
- **Edge cases** and how they're handled
- **Cross-workflow dependencies**

## 5. Feature Specifications
For each MVP feature:
- **Feature name**
- Description
- User stories: `As a [user], I want to [action] so that [benefit]`
- Acceptance criteria (informed by business rules from WORKFLOW_SPEC.md)
- Related business rules: [BR-001, BR-005, ...]
- Priority: P0 / P1 / P2

## 6. Data Model
For each entity:
- Table name (snake_case, using industry-standard terminology)
- Fields: name, type, constraints, description
- Relationships (FK references)
- State field with valid values (from state machines)
- Audit fields if required by regulation

## 7. API Design
For each resource:
- Endpoints: METHOD /path — description
- Request/response shape (JSON)
- Auth requirement
- Business rules enforced (BR-XXX references)
- Validation rules

## 8. Frontend Pages & Components
For each page:
- Route
- Purpose
- Key components
- Data fetched
- User actions
- Loading/empty/error states
- Permission requirements

## 9. Authentication & Authorization
- Auth method
- User roles and permissions matrix (from WORKFLOW_SPEC.md)
- Protected routes
- Role hierarchy

## 10. Non-Functional Requirements
- Performance targets
- Security requirements
- Accessibility (WCAG AA minimum)
- Regulatory compliance requirements (from DOMAIN_RESEARCH.md)
- Audit trail requirements

## 11. Validation Issues & Trade-offs
- Issues found during workflow validation
- How each was resolved
- Known trade-offs and their rationale

## 12. GitHub Issue Breakdown
List ALL issues to be created, grouped by label:

**phase:frontend** (Next.js)
- [ ] [Issue title] — [1-line description] — [related BR-XXX]

**phase:backend** (FastAPI)
- [ ] [Issue title] — [1-line description] — [related BR-XXX]

**phase:database** (PostgreSQL + Alembic)
- [ ] [Issue title] — [1-line description]

**phase:integration** (API wiring + CORS + env vars)
- [ ] [Issue title] — [1-line description]

**phase:architecture**
- [ ] [Issue title] — [1-line description]

**phase:security**
- [ ] [Issue title] — [1-line description]

**phase:testing**
- [ ] [Issue title] — [1-line description]

---

## Reference Documents
- [DOMAIN_RESEARCH.md](./DOMAIN_RESEARCH.md) — Industry research
- [WORKFLOW_SPEC.md](./WORKFLOW_SPEC.md) — Workflow designs
- [WORKFLOW_VALIDATION.md](./WORKFLOW_VALIDATION.md) — Validation report
```

Mark task "Write PRD" as completed.

---

## Step 8 — Log and report

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-prd task_done \
  artifact=forge-prd.md domain=$DOMAIN issues_planned=$ISSUES_PLANNED \
  validation_critical=$CRITICAL_FOUND validation_high=$HIGH_FOUND
```

Summarize:
- Domain researched: [industry]
- Competitors analyzed: N
- Workflows designed: N (with N business rules)
- Validation issues found: N critical, N high (all resolved)
- PRD sections: 12
- GitHub issues planned: N
- Files created: `DOMAIN_RESEARCH.md`, `WORKFLOW_SPEC.md`, `WORKFLOW_VALIDATION.md`, `forge-prd.md`

Tell the user:
> `forge-prd.md` saved with [N] issues planned, backed by domain research and validated workflows.
> Run `/forge:init` to create the GitHub repo and issues.

---

## Rules

- **NEVER skip the research phase.** The whole point of this workflow is that research happens first.
- **Agents run SEQUENTIALLY, not in parallel.** Research → Design → Validate → Write. Each phase needs the output of the previous one.
- **If validation finds critical issues, resolve them before writing the PRD.** Don't propagate known contradictions into the PRD.
- **Every feature in the PRD must reference business rules by number (BR-XXX).** This creates traceability from PRD → code.
- **Use industry terminology from the research, not generic developer terms.**
- **The PRD must be self-sufficient.** A developer reading only the PRD should understand the domain well enough to build correctly.
