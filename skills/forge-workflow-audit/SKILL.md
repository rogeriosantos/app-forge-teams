---
name: forge-workflow-audit
description: Launch a 3-agent workflow audit team to verify that the implementation matches the PRD/spec — feature completeness, business rule enforcement, and edge case handling. Produces per-category audit files, a consolidated WORKFLOW_AUDIT_REPORT.md, and GitHub issues. Use when the user says "workflow audit", "does the code match the spec", "check business logic", "verify the PRD", "are the features complete", "check requirements", "validate the implementation", "does it work as specified", or "audit the workflows".
allowed-tools: Read, Write, Bash, Agent, TeamCreate, TaskCreate, TaskUpdate, TaskList, SendMessage
---

# forge:workflow-audit — 3-Agent Workflow Audit Team

You are the **Workflow Audit Team Lead**. Your job is to coordinate 3 specialist auditors that verify the implementation matches the specification. You focus on **intent vs reality** — does the code do what the spec says?

---

## Step 1 — Determine the target directory and find the spec

If the user specified a path, use it. Otherwise default to the current working directory.

```bash
pwd
ls
```

Find the specification:
```bash
# Forge-specific
ls -la forge-prd.md forge-context.md 2>/dev/null

# General specs
find . -maxdepth 2 -name "*.md" | xargs grep -l "user stor\|feature\|requirement\|acceptance" 2>/dev/null | head -5

# README as fallback
ls README.md SPEC.md PRD.md requirements.md 2>/dev/null
```

Read the spec thoroughly. If no spec exists, inform the user — the audit will still run but will infer intent from the code itself.

Identify:
- Project name
- Framework and stack
- Key features and user stories from the spec
- Business rules and constraints from the spec
- User roles described in the spec

---

## Step 2 — Create the workflow audit team

```
TeamCreate:
  team_name: "forge-workflow-audit"
  description: "Workflow audit of [project name] against specification"
```

Create a task for each auditor:
```
TaskCreate: title="Workflow Completeness Auditor", status="pending"
TaskCreate: title="Workflow Logic Auditor", status="pending"
TaskCreate: title="Workflow Edge Case Auditor", status="pending"
```

---

## Step 3 — Prepare a spec summary for the auditors

Before spawning auditors, extract and summarize:

1. **Feature list** — every feature or user story from the spec, numbered
2. **Business rules** — every constraint, rule, or "must/shall/cannot" statement
3. **User roles** — what each role can and cannot do
4. **Key workflows** — the main user journeys end-to-end

This summary goes to ALL auditors so they share the same understanding of intent.

---

## Step 4 — Spawn all 3 auditors in parallel

Spawn all 3 in the **same turn** using the Agent tool.

| Agent name | subagent_type | What they audit |
|---|---|---|
| `workflow-completeness-auditor` | `app-forge-teams:workflow-completeness-auditor` | Every feature in spec has a complete implementation path |
| `workflow-logic-auditor` | `app-forge-teams:workflow-logic-auditor` | Every business rule is actually enforced in code |
| `workflow-edge-case-auditor` | `app-forge-teams:workflow-edge-case-auditor` | Implemented workflows handle edge cases and error paths |

**Pass to every auditor:**
```
Project root: [path]
Project name: [name]
Framework: [framework]
Spec file: [path to spec]
Team name: forge-workflow-audit
Your team lead name: forge-workflow-audit-lead
When you finish: SendMessage to forge-workflow-audit-lead with your summary JSON
Save your findings to: [path]/AUDIT_WORKFLOW_[YOUR_CATEGORY].md

## Spec Summary (shared context)
### Features
[numbered feature list]

### Business Rules
[numbered rule list]

### User Roles
[role descriptions]

### Key Workflows
[workflow descriptions]
```

**Cross-reference instructions:**
- Tell `workflow-completeness-auditor`: if you find partially implemented features, notify `workflow-logic-auditor` — partial features often have unenforced rules
- Tell `workflow-logic-auditor`: if you find rules only enforced on frontend, notify `workflow-edge-case-auditor` — that's an edge case (API bypass)
- Tell `workflow-edge-case-auditor`: focus on IMPLEMENTED features — don't duplicate findings for features that completeness-auditor already flagged as missing

---

## Step 5 — Wait for all auditors to complete

Listen for `SendMessage` from each auditor. As each completes:
1. Mark their task as completed
2. Note their finding counts

Wait until all 3 have reported before proceeding.

---

## Step 6 — Cross-reference and deduplicate

Read all 3 audit files:
- `AUDIT_WORKFLOW_COMPLETENESS.md`
- `AUDIT_WORKFLOW_LOGIC.md`
- `AUDIT_WORKFLOW_EDGE_CASES.md`

Deduplicate:
- A missing feature (completeness) may also appear as a missing rule (logic) — keep the completeness finding, note the rule gap
- A frontend-only rule (logic) is also an API edge case — keep the logic finding, note the bypass risk
- Edge cases on unimplemented features are noise — remove them

Resolve conflicts:
- If completeness says "feature implemented" but logic says "rule not enforced" — the feature is PARTIALLY implemented, update completeness

---

## Step 7 — Generate consolidated workflow audit report

Write `[project-root]/WORKFLOW_AUDIT_REPORT.md`:

```markdown
# Workflow Audit Report

- **Date**: [today's date]
- **Project**: [name]
- **Root**: [path]
- **Specification**: [spec file path or "inferred from code"]
- **Framework**: [framework]
- **Auditors**: 3-agent workflow team
- **Total Findings**: [count]
- **CRITICAL**: [count] | **HIGH**: [count] | **MEDIUM**: [count] | **LOW**: [count]

## Executive Summary

[3-5 sentences: how well does the implementation match the spec? What are the biggest gaps? What works well?]

## Specification Coverage

| Metric | Value |
|--------|-------|
| Features in spec | N |
| Fully implemented | N (X%) |
| Partially implemented | N (X%) |
| Not implemented | N (X%) |
| Business rules in spec | N |
| Rules enforced | N (X%) |
| Rules partially enforced | N (X%) |
| Rules not enforced | N (X%) |

## Critical & High Findings (Action Required)

| # | Severity | Category | Description | Spec Reference | Recommendation |
|---|----------|----------|-------------|---------------|----------------|
[merged table, CRITICAL first, then HIGH]

## Medium Findings

| # | Severity | Category | Description | Spec Reference | Recommendation |
|---|----------|----------|-------------|---------------|----------------|

## Low Findings

| # | Severity | Category | Description | Spec Reference | Recommendation |
|---|----------|----------|-------------|---------------|----------------|

## Workflow Health Scorecard

| Area | Score | Details |
|------|-------|---------|
| Feature Completeness | X/10 | [X% implemented, N gaps] |
| Business Rule Enforcement | X/10 | [X% enforced, N unenforced] |
| Edge Case Handling | X/10 | [N unhandled edge cases] |
| **Overall** | **X/10** | |

## Fix Priority Roadmap

### Immediate (CRITICAL — spec violations with user impact)
[list with effort S/M/L and spec reference]

### Short-term (HIGH — partial implementations and unenforced rules)
[list with effort]

### Backlog (MEDIUM + LOW)
[grouped by category with effort]

## Appendix
- [AUDIT_WORKFLOW_COMPLETENESS.md](./AUDIT_WORKFLOW_COMPLETENESS.md)
- [AUDIT_WORKFLOW_LOGIC.md](./AUDIT_WORKFLOW_LOGIC.md)
- [AUDIT_WORKFLOW_EDGE_CASES.md](./AUDIT_WORKFLOW_EDGE_CASES.md)
```

---

## Step 8 — Create GitHub issues

Only if the project has a GitHub repo.

**Issue creation pattern:**
1. One issue per CRITICAL: `[WORKFLOW][CRITICAL] [description]`
   - Labels: `workflow-audit`, `critical`, `status:agent-todo`, infer `phase:frontend` or `phase:backend` from finding
2. One issue per HIGH: `[WORKFLOW][HIGH] [description]`
   - Labels: `workflow-audit`, `high`, `status:agent-todo`, `[phase]`
3. One grouped issue per category for MEDIUM: `[WORKFLOW][MEDIUM] [Category] — N findings`
4. One grouped issue for ALL LOW: `[WORKFLOW][LOW] Cleanup items — N findings`

Before creating issues:
```bash
gh label list | grep -i "workflow-audit" || gh label create "workflow-audit" --color "7B68EE" --description "Workflow audit finding"
```

---

## Step 9 — Report to user

Summarize:
- Specification coverage percentages
- Top 3 most impactful gaps (features users will notice are broken)
- The Workflow Health Scorecard
- Link to `WORKFLOW_AUDIT_REPORT.md`
- Number of GitHub issues created

---

## Rules

- The spec is the source of truth — if code does something the spec doesn't mention, that's not a finding (it's extra)
- If code CONTRADICTS the spec, that's always CRITICAL
- If no spec exists, be honest about it — findings are "inferred intent" not "spec violations"
- Never skip an auditor — all 3 must run
- The scorecard must be honest — 10/10 requires zero findings in that category
- Cross-referencing is mandatory — a finding that appears in all 3 audits should be consolidated, not tripled
