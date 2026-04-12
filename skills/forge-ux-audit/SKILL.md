---
name: forge-ux-audit
description: Launch a 4-agent UX audit team to find broken flows, non-functional interactions, missing UI states, and UX inconsistencies. Produces per-category audit files, a consolidated UX_AUDIT_REPORT.md, and GitHub issues. Use when the user says "UX audit", "check the UI", "find broken buttons", "test the interface", "UX review", "find UI bugs", "check user flows", "is the UI working", or "audit the frontend UX".
allowed-tools: Read, Write, Bash, Agent, TeamCreate, TaskCreate, TaskUpdate, TaskList, SendMessage
---

# forge:ux-audit — 4-Agent UX Audit Team

You are the **UX Audit Team Lead**. Your job is to coordinate 4 specialist UX auditors, prevent overlap, and produce a consolidated UX audit report.

---

## Step 1 — Determine the target directory

If the user specified a path, use it. Otherwise default to the current working directory. Confirm with the user if ambiguous.

```bash
pwd
ls
```

Identify:
- Project name (from package.json, pyproject.toml, or directory name)
- Framework (Next.js, React, Vue, etc.)
- UI library (shadcn/ui, MUI, Chakra, etc.)
- Whether there's a PRD or spec file (`forge-prd.md`, `forge-context.md`)

If a PRD/spec exists, read it — it tells you what the app is supposed to do, which is critical context for evaluating UX flows.

---

## Step 2 — Create the UX audit team

```
TeamCreate:
  team_name: "forge-ux-audit"
  description: "UX audit of [project name]"
```

Create a task for each auditor:
```
TaskCreate: title="UX Flow Auditor", status="pending"
TaskCreate: title="UX Interaction Auditor", status="pending"
TaskCreate: title="UX State Auditor", status="pending"
TaskCreate: title="UX Consistency Auditor", status="pending"
```

---

## Step 3 — Spawn all 4 auditors in parallel

Spawn all 4 in the **same turn** using the Agent tool. Each gets:
- The project root path
- The project name, framework, and UI library
- Their team name: `"forge-ux-audit"`
- Instruction to message you (`forge-ux-audit-lead`) when complete
- If a PRD/spec exists: a summary of the key features and user flows

| Agent name | subagent_type | What they audit |
|---|---|---|
| `ux-flow-auditor` | `app-forge-teams:ux-flow-auditor` | Broken navigation, dead-end pages, orphan routes, missing CRUD steps |
| `ux-interaction-auditor` | `app-forge-teams:ux-interaction-auditor` | Non-functional buttons, empty handlers, forms that don't submit |
| `ux-state-auditor` | `app-forge-teams:ux-state-auditor` | Missing loading/empty/error states, silent failures, no feedback |
| `ux-consistency-auditor` | `app-forge-teams:ux-consistency-auditor` | Mixed CRUD patterns, terminology mismatches, inconsistent feedback |

**Pass to every auditor:**
```
Project root: [path]
Project name: [name]
Framework: [framework]
UI library: [ui-lib]
Team name: forge-ux-audit
Your team lead name: forge-ux-audit-lead
When you finish: SendMessage to forge-ux-audit-lead with your summary JSON
Save your findings to: [path]/AUDIT_UX_[YOUR_CATEGORY].md
```

**Cross-reference instructions:**
- Tell `ux-flow-auditor`: if you find buttons that navigate to missing pages, also notify `ux-interaction-auditor` via SendMessage
- Tell `ux-interaction-auditor`: if you find buttons with no handler, check with `ux-flow-auditor` if those buttons should be navigation
- Tell `ux-state-auditor`: if you find mutations with no feedback, notify `ux-interaction-auditor` (they track the button side)
- Tell `ux-consistency-auditor`: you'll receive summaries from other auditors — use them to detect patterns

---

## Step 4 — Wait for all auditors to complete

Listen for `SendMessage` from each auditor. As each completes:
1. Mark their task as completed
2. Note their finding counts

Wait until all 4 have reported before proceeding.

---

## Step 5 — Cross-reference and deduplicate

Read all 4 audit files:
- `AUDIT_UX_FLOWS.md`
- `AUDIT_UX_INTERACTIONS.md`
- `AUDIT_UX_STATES.md`
- `AUDIT_UX_CONSISTENCY.md`

Deduplicate:
- A broken button may appear in both flow (routes nowhere) and interaction (no handler) — keep the more specific one, note the cross-reference
- A missing feedback may appear in both state (no toast) and interaction (button appears to do nothing) — merge into one finding
- Consistency findings that are caused by a missing implementation should reference the implementation finding

---

## Step 6 — Generate consolidated UX audit report

Write `[project-root]/UX_AUDIT_REPORT.md`:

```markdown
# UX Audit Report

- **Date**: [today's date]
- **Project**: [name]
- **Root**: [path]
- **Framework**: [framework]
- **UI Library**: [ui-lib]
- **Auditors**: 4-agent UX team
- **Total Findings**: [count]
- **CRITICAL**: [count] | **HIGH**: [count] | **MEDIUM**: [count] | **LOW**: [count]

## Executive Summary

[3-5 sentences: overall UX health, biggest risks, most urgent fixes. Be specific — name the broken flows, not just "some UX issues found".]

## Critical & High Findings (Action Required)

| # | Severity | Category | File | Description | Recommendation |
|---|----------|----------|------|-------------|----------------|
[merged table, CRITICAL first, then HIGH, sorted by user impact]

## Medium Findings

| # | Severity | Category | File | Description | Recommendation |
|---|----------|----------|------|-------------|----------------|

## Low Findings

| # | Severity | Category | File | Description | Recommendation |
|---|----------|----------|------|-------------|----------------|

## UX Health Scorecard

| Area | Score | Details |
|------|-------|---------|
| Navigation Flows | X/10 | [summary: N broken links, N dead ends, N orphan routes] |
| Interactions | X/10 | [summary: N non-functional buttons, N broken forms] |
| UI States | X/10 | [summary: loading X%, empty X%, error X%] |
| Consistency | X/10 | [summary: N CRUD pattern mismatches, N terminology conflicts] |
| **Overall** | **X/10** | |

## Fix Priority Roadmap

### Immediate (CRITICAL — fix before showing to users)
[list with effort S/M/L]

### Short-term (HIGH — fix this sprint)
[list with effort]

### Backlog (MEDIUM + LOW)
[grouped by category with effort]

## Appendix
- [AUDIT_UX_FLOWS.md](./AUDIT_UX_FLOWS.md)
- [AUDIT_UX_INTERACTIONS.md](./AUDIT_UX_INTERACTIONS.md)
- [AUDIT_UX_STATES.md](./AUDIT_UX_STATES.md)
- [AUDIT_UX_CONSISTENCY.md](./AUDIT_UX_CONSISTENCY.md)
```

---

## Step 7 — Create GitHub issues

Only if the project has a GitHub repo (check with `gh repo view` or look for `.git`).

**Issue creation pattern:**
1. One issue per CRITICAL: `[UX][CRITICAL] [description]`
   - Labels: `ux-audit`, `critical`, `status:agent-todo`, `phase:frontend`
2. One issue per HIGH: `[UX][HIGH] [description]`
   - Labels: `ux-audit`, `high`, `status:agent-todo`, `phase:frontend`
3. One grouped issue per category for MEDIUM: `[UX][MEDIUM] [Category] — N findings`
   - Labels: `ux-audit`, `medium`, `status:agent-todo`, `phase:frontend`
4. One grouped issue for ALL LOW: `[UX][LOW] Cleanup items — N findings`
   - Labels: `ux-audit`, `low`, `status:agent-todo`, `phase:frontend`

Before creating issues, check if the labels exist:
```bash
gh label list | grep -i "ux-audit" || gh label create "ux-audit" --color "E99695" --description "UX audit finding"
```

---

## Step 8 — Report to user

Summarize:
- Total findings by severity
- Top 3 most impactful issues (user-facing impact, not technical)
- The UX Health Scorecard
- Link to `UX_AUDIT_REPORT.md`
- Number of GitHub issues created

---

## Rules

- Never skip a auditor — all 4 must run
- If a project has no frontend (pure API, CLI tool), report this and cancel the audit
- Do not fix anything — this is an audit, not a fix session
- The UX scorecard must be honest — a 10/10 requires zero findings in that category
- Cross-referencing is mandatory — duplicate findings across auditors wastes the user's time
