---
name: forge-audit
description: Launch a 6-agent audit team to perform a comprehensive application audit — dead code, missing implementations, data integrity, security vulnerabilities, architecture consistency, and SaaS page coverage (login, logout, profile, billing, onboarding, etc.). Use this whenever the user wants to audit a codebase, find security issues, find dead code, check for incomplete implementations, review data integrity, check for missing SaaS pages, or get a full health report on an application. Produces per-category audit files, a consolidated AUDIT_REPORT.md, and GitHub issues. Use PROACTIVELY when the user says "audit", "review the codebase", "find issues", "health check", "missing pages", "what's wrong with this app", or "check my SaaS".
allowed-tools: Read, Write, Bash, Agent, TeamCreate, TaskCreate, TaskUpdate, TaskList, SendMessage
---

# forge:audit — 6-Agent Application Audit Team

You are the **Team Lead**. Your job is to coordinate 6 specialist auditors, prevent overlap, and produce the final consolidated report.

---

## Step 1 — Determine the target directory

If the user specified a path, use it. Otherwise default to the current working directory. Confirm with the user if ambiguous.

```bash
pwd
ls
```

Identify:
- Project name (from package.json, pyproject.toml, or directory name)
- Language/stack (Python, Node.js, Go, etc.)
- Whether a database is present (look for migrations/, schema files, ORM configs)

---

## Step 2 — Create the audit team

```
TeamCreate:
  team_name: "forge-audit"
  description: "Comprehensive audit of [project name]"
```

Create a task for each auditor role:
```
TaskCreate: title="Dead Code Hunter", status="pending"
TaskCreate: title="Missing Implementation Auditor", status="pending"
TaskCreate: title="Data Integrity Auditor", status="pending"
TaskCreate: title="Security Auditor", status="pending"
TaskCreate: title="Consistency & Architecture Auditor", status="pending"
TaskCreate: title="SaaS Pages Auditor", status="pending"
```

---

## Step 3 — Spawn all 6 auditors in parallel

Spawn all 6 in the **same turn** using the Agent tool. Each gets:
- The project root path
- The project name and stack
- Their team name: `"forge-audit"`
- Instruction to message you (`forge-audit-lead`) when complete

| Agent name | subagent_type | Instructions source |
|---|---|---|
| `dead-code-hunter` | `app-forge-teams:dead-code-hunter` | agents/dead-code-hunter.md |
| `missing-impl-auditor` | `app-forge-teams:missing-impl-auditor` | agents/missing-impl-auditor.md |
| `data-integrity-auditor` | `app-forge-teams:data-integrity-auditor` | agents/data-integrity-auditor.md |
| `security-auditor` | `app-forge-teams:security-auditor` | agents/security-auditor.md |
| `consistency-auditor` | `app-forge-teams:consistency-auditor` | agents/consistency-auditor.md |
| `saas-pages-auditor` | `app-forge-teams:saas-pages-auditor` | agents/saas-pages-auditor.md |

**Pass to every auditor:**
```
Project root: [path]
Project name: [name]
Stack: [stack]
Team name: forge-audit
Your team lead name: forge-audit-lead
When you finish: SendMessage to forge-audit-lead with your summary count and top 5 critical findings
Save your findings to: [path]/AUDIT_[YOUR_CATEGORY].md
```

Also tell `data-integrity-auditor`: if you find DB objects that appear unused, SendMessage to `missing-impl-auditor` so they can cross-check.

---

## Step 4 — Wait and track

While auditors are running, check TaskList periodically. As each auditor sends you a completion message via SendMessage, update their task to `completed`.

Wait until all 6 report back before proceeding.

---

## Step 5 — Cross-reference and deduplicate

Once all 6 audit files exist:

1. Read all 6 files: `AUDIT_DEAD_CODE.md`, `AUDIT_MISSING_IMPL.md`, `AUDIT_DATA_INTEGRITY.md`, `AUDIT_SECURITY.md`, `AUDIT_CONSISTENCY.md`, `AUDIT_SAAS_PAGES.md`
2. Deduplicate findings flagged by multiple auditors — keep only the highest-severity copy, note the duplicate in a comment
3. Cross-reference conflicts: if Dead Code Hunter says X is unused but Missing Impl Auditor says something calls it, re-examine and resolve — one of them is wrong
4. Cross-reference SaaS Pages findings with Security: if a page exists but has no auth guard, that's both a "partial page" (SaaS Pages) and a security finding — flag once as CRITICAL under Security
5. Validate severity assignments are consistent across all 6 files using the shared severity table

---

## Step 6 — Write AUDIT_REPORT.md

Create `[project-root]/AUDIT_REPORT.md`:

```markdown
# Application Audit Report
- **Date**: [today's date]
- **Project**: [name]
- **Root**: [path]
- **Stack**: [stack]
- **Auditors**: 6-agent team (Dead Code · Missing Impl · Data Integrity · Security · Consistency · SaaS Pages)
- **Total Findings**: [count]
- **CRITICAL**: [count] | **HIGH**: [count] | **MEDIUM**: [count] | **LOW**: [count]

## Executive Summary
[3-5 sentences: overall health, biggest risks, immediate actions needed]

## Critical & High Findings (Action Required)

| # | Severity | Category | File | Line(s) | Description | Recommendation |
|---|----------|----------|------|---------|-------------|----------------|
[merged table, sorted: CRITICAL first, then HIGH; within each, sorted by category]

## Medium Findings

| # | Severity | Category | File | Line(s) | Description | Recommendation |
|---|----------|----------|------|---------|-------------|----------------|

## Low Findings

| # | Severity | Category | File | Line(s) | Description | Recommendation |
|---|----------|----------|------|---------|-------------|----------------|

## Fix Priority Roadmap

### Immediate (CRITICAL — fix before next deploy)
1. [Finding] — Effort: S/M/L
...

### Short-term (HIGH — fix this sprint)
1. [Finding] — Effort: S/M/L
...

### Backlog (MEDIUM + LOW)
- Group related fixes together
- [Category] cleanup: N items — Effort: M
...

## Appendix
Individual audit files:
- [AUDIT_DEAD_CODE.md](./AUDIT_DEAD_CODE.md)
- [AUDIT_MISSING_IMPL.md](./AUDIT_MISSING_IMPL.md)
- [AUDIT_DATA_INTEGRITY.md](./AUDIT_DATA_INTEGRITY.md)
- [AUDIT_SECURITY.md](./AUDIT_SECURITY.md)
- [AUDIT_CONSISTENCY.md](./AUDIT_CONSISTENCY.md)
- [AUDIT_SAAS_PAGES.md](./AUDIT_SAAS_PAGES.md)
```

---

## Step 7 — Create GitHub issues

Check if a GitHub remote exists:
```bash
gh repo view --json nameWithOwner 2>/dev/null
```

If yes, first ensure all required labels exist:
```bash
for label in audit critical high medium low security dead-code data-integrity consistency saas-pages missing-impl status:agent-todo; do
  gh label create "$label" --force 2>/dev/null || true
done
```

Use this **category → phase label** mapping when creating issues so `forge:implement` can route them to the right builder:

| Audit category | Phase label to add |
|---|---|
| `saas-pages` | `phase:frontend` |
| `dead-code` (frontend files) | `phase:frontend` |
| `dead-code` (backend files) | `phase:backend` |
| `missing-impl` (frontend files) | `phase:frontend` |
| `missing-impl` (backend files) | `phase:backend` |
| `data-integrity` | `phase:database` |
| `security` (API/auth/middleware) | `phase:backend` |
| `security` (XSS/client-side) | `phase:frontend` |
| `consistency` | infer from files: `phase:frontend` or `phase:backend` |

Then create issues:

1. **One issue per CRITICAL finding**
   - Title: `[AUDIT][CRITICAL] [description]`
   - Labels: `audit`, `critical`, `status:agent-todo`, `[category]`, `[phase label from mapping above]`

2. **One issue per HIGH finding**
   - Title: `[AUDIT][HIGH] [description]`
   - Labels: `audit`, `high`, `status:agent-todo`, `[category]`, `[phase label from mapping above]`

3. **One grouped issue per category for MEDIUM findings**
   - Title: `[AUDIT][MEDIUM] [Category] — N findings`
   - Labels: `audit`, `medium`, `status:agent-todo`, `[category]`, `[phase label from mapping above]`

4. **One grouped issue for ALL LOW findings**
   - Title: `[AUDIT][LOW] Cleanup items — N findings`
   - Labels: `audit`, `low`, `status:agent-todo`

Each issue body must include: file paths, line numbers, description, recommended fix, estimated effort (S/M/L).

If no GitHub remote → skip issue creation and tell the user.

---

## Step 8 — Report to user and shut down

Tell the user:
> **Audit complete.** Found [N] issues across 6 categories.
> - CRITICAL: [count] | HIGH: [count] | MEDIUM: [count] | LOW: [count]
>
> Full report: `AUDIT_REPORT.md`
> [If GitHub] Created [N] GitHub issues.
>
> Top 3 things to fix first:
> 1. [most critical finding]
> 2. [second most critical]
> 3. [third most critical]

Shut down all 6 auditors gracefully via SendMessage: `{"type": "shutdown_request"}`.

---

## Severity Reference (enforce consistently across all auditors)

| Severity | Definition | Examples |
|----------|-----------|---------|
| CRITICAL | Data loss risk, security vulnerability, broken core functionality | SQL injection, missing auth, orphaned data, broken references |
| HIGH | Feature gaps, significant dead code, missing error handling | Unused DB procedures, empty catch blocks, no input validation |
| MEDIUM | Inconsistencies, missing validation, code quality | Mixed naming, missing indexes, no transactions |
| LOW | Minor cleanup, style, optimization | Unused imports, TODO comments, missing comments |

## Finding Format (ALL auditors must use this)

```
| # | Severity | File | Line(s) | Description | Recommendation |
|---|----------|------|---------|-------------|----------------|
```
