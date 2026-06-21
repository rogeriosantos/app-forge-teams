---
name: forge-audit
description: Launch a 13-agent audit team to perform a comprehensive application audit covering quality (dead code, missing implementations, data integrity, security, consistency, SaaS pages), UX (broken flows, non-functional interactions, missing UI states, inconsistencies), and workflow (feature completeness, business rule enforcement, edge case handling). Produces per-category audit files and a consolidated AUDIT_REPORT.md with GitHub issues. Use whenever the user wants to audit a codebase, find security issues, find dead code, check for incomplete implementations, review data integrity, check for missing SaaS pages, find broken UI flows, check user flows, validate the implementation against the spec, or get a full health report on an application. Use PROACTIVELY when the user says "audit", "ux audit", "workflow audit", "review the codebase", "find issues", "health check", "missing pages", "broken buttons", "what's wrong with this app", "check my SaaS", "does the code match the spec", or "validate the implementation".
allowed-tools: Read, Write, Bash, Agent, TeamCreate, TaskCreate, TaskUpdate, TaskList, SendMessage
---

# forge:audit — Unified 13-Agent Application Audit

You are the **Team Lead** (`forge-audit-lead`) for a 13-agent audit covering three domains in one pass:

- **Quality (6)** — dead code, missing implementations, data integrity, security, consistency, SaaS pages
- **UX (4)** — flows, interactions, states, consistency
- **Workflow (3)** — feature completeness, business rule enforcement, edge cases

All 13 agents share a single pre-built `.forge-cache/`, message you (`forge-audit-lead`) on completion, and write to per-category files under the project root. You produce one consolidated `AUDIT_REPORT.md`.

---

## Step 1 — Determine the target directory and gather context

If the user specified a path, use it. Otherwise default to the current working directory. Confirm if ambiguous.

```bash
pwd
ls
```

Identify:
- Project name (from `package.json`, `pyproject.toml`, or directory name)
- Language/stack (Python, Node.js, Go, etc.)
- Framework (Next.js, FastAPI, etc.)
- UI library (shadcn/ui, MUI, Chakra, etc.) — only if a frontend exists
- Whether a database is present (look for `migrations/`, schema files, ORM configs)

Locate the specification (for the workflow auditors):
```bash
ls -la forge-prd.md forge-context.md 2>/dev/null

# Fallback search
find . -maxdepth 2 -name "*.md" | xargs grep -l "user stor\|feature\|requirement\|acceptance" 2>/dev/null | head -5

# Common fallbacks
ls README.md SPEC.md PRD.md requirements.md 2>/dev/null
```

Read the spec thoroughly if found. If no spec exists, the workflow auditors will infer intent from the code itself — note this in the final report.

If the project has no frontend (pure API or CLI), skip the 4 UX auditors and tell the user — the audit will run with the 9 remaining agents.

---

## Step 1.5 — Build (or reuse) the shared codebase cache

Cache freshness check first — avoid rebuilding if the cache is current.

```bash
CACHE_DIR="[project-root]/.forge-cache"
REBUILD=1

if [ -f "$CACHE_DIR/index.json" ]; then
  CACHE_MTIME=$(stat -f %m "$CACHE_DIR/index.json" 2>/dev/null || stat -c %Y "$CACHE_DIR/index.json" 2>/dev/null)
  NEWEST_SRC=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.go" -o -name "*.sql" -o -name "*.css" \) \
    -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" -not -path "*/__pycache__/*" \
    -newer "$CACHE_DIR/index.json" 2>/dev/null | head -1)
  if [ -z "$NEWEST_SRC" ]; then
    REBUILD=0
    echo "Cache is fresh — reusing $CACHE_DIR"
  fi
fi

if [ "$REBUILD" = "1" ]; then
  python3 ${CLAUDE_PLUGIN_ROOT}/scripts/build-codebase-cache.py [project-root]
  if [ ! -f "$CACHE_DIR/index.json" ]; then
    echo "WARNING: Cache build failed — agents will fall back to scanning individually (slower, more tokens)"
  fi
fi

cat "$CACHE_DIR/index.json" 2>/dev/null
ls "$CACHE_DIR" 2>/dev/null
```

The cache contains the inputs all 13 agents need:
- `summary.md`, `index.json` — entry points
- `files.txt`, `pages.txt`, `api-routes.txt`, `navigation.txt`
- `todos.txt`, `empty-handlers.txt`, `buttons.txt`, `forms.txt`, `dialogs.txt`
- `api-calls.txt`, `state-hooks.txt`, `feedback.txt`
- `auth-usage.txt`, `db-models.txt`, `migrations.txt`
- `error-boundaries.txt`, `loading-files.txt`
- `secrets-scan.txt`, `imports.txt`, `exports.txt`

**Every agent reads from `.forge-cache/` first.** Re-scanning is permitted only when the cache lacks a needed pattern.

---

## Step 2 — Prepare the spec summary (for workflow auditors)

If a spec was found, extract a shared summary for the 3 workflow auditors so they all start from the same intent:

1. **Feature list** — every feature or user story from the spec, numbered
2. **Business rules** — every constraint, rule, or "must/shall/cannot" statement
3. **User roles** — what each role can and cannot do
4. **Key workflows** — main user journeys end-to-end

Keep this summary in memory; it goes verbatim into the prompt of each workflow auditor.

If no spec exists, prepare a one-line note: "No spec file found — infer intent from code; findings are 'inferred intent' rather than spec violations."

---

## Step 3 — Create the unified team

```
TeamCreate:
  team_name: "forge-audit"
  description: "Unified 13-agent audit of [project name]"
```

Create one task per auditor:

```
# Quality (6)
TaskCreate: title="Dead Code Hunter", status="pending"
TaskCreate: title="Missing Implementation Auditor", status="pending"
TaskCreate: title="Data Integrity Auditor", status="pending"
TaskCreate: title="Security Auditor", status="pending"
TaskCreate: title="Consistency & Architecture Auditor", status="pending"
TaskCreate: title="SaaS Pages Auditor", status="pending"

# UX (4) — skip if no frontend
TaskCreate: title="UX Flow Auditor", status="pending"
TaskCreate: title="UX Interaction Auditor", status="pending"
TaskCreate: title="UX State Auditor", status="pending"
TaskCreate: title="UX Consistency Auditor", status="pending"

# Workflow (3)
TaskCreate: title="Workflow Completeness Auditor", status="pending"
TaskCreate: title="Workflow Logic Auditor", status="pending"
TaskCreate: title="Workflow Edge Case Auditor", status="pending"
```

---

## Step 4 — Spawn all 13 auditors in one turn

Issue one Agent tool call per auditor in the **same turn** — maximum parallelism. The harness will throttle if needed.

| # | Agent name | subagent_type | Output file |
|---|---|---|---|
| 1 | `dead-code-hunter` | `app-forge-teams:dead-code-hunter` | `AUDIT_DEAD_CODE.md` |
| 2 | `missing-impl-auditor` | `app-forge-teams:missing-impl-auditor` | `AUDIT_MISSING_IMPL.md` |
| 3 | `data-integrity-auditor` | `app-forge-teams:data-integrity-auditor` | `AUDIT_DATA_INTEGRITY.md` |
| 4 | `security-auditor` | `app-forge-teams:security-auditor` | `AUDIT_SECURITY.md` |
| 5 | `consistency-auditor` | `app-forge-teams:consistency-auditor` | `AUDIT_CONSISTENCY.md` |
| 6 | `saas-pages-auditor` | `app-forge-teams:saas-pages-auditor` | `AUDIT_SAAS_PAGES.md` |
| 7 | `ux-flow-auditor` | `app-forge-teams:ux-flow-auditor` | `AUDIT_UX_FLOWS.md` |
| 8 | `ux-interaction-auditor` | `app-forge-teams:ux-interaction-auditor` | `AUDIT_UX_INTERACTIONS.md` |
| 9 | `ux-state-auditor` | `app-forge-teams:ux-state-auditor` | `AUDIT_UX_STATES.md` |
| 10 | `ux-consistency-auditor` | `app-forge-teams:ux-consistency-auditor` | `AUDIT_UX_CONSISTENCY.md` |
| 11 | `workflow-completeness-auditor` | `app-forge-teams:workflow-completeness-auditor` | `AUDIT_WORKFLOW_COMPLETENESS.md` |
| 12 | `workflow-logic-auditor` | `app-forge-teams:workflow-logic-auditor` | `AUDIT_WORKFLOW_LOGIC.md` |
| 13 | `workflow-edge-case-auditor` | `app-forge-teams:workflow-edge-case-auditor` | `AUDIT_WORKFLOW_EDGE_CASES.md` |

**Standard prompt block (passed to every auditor):**

```
Project root: [path]
Project name: [name]
Stack: [stack]
Framework: [framework]
UI library: [ui-lib if frontend]
Spec file: [path or "none — infer from code"]
Team name: forge-audit
Your team lead name: forge-audit-lead

CACHE LOCATION: [path]/.forge-cache/
A pre-built codebase cache has been created for you. READ IT FIRST.
- Start with .forge-cache/summary.md and .forge-cache/index.json
- Then read the cache files specific to your audit category
- Only run additional grep/find if the cache lacks what you need
- Do NOT re-scan files already in the cache — grep ON the cache files

When you finish:
  SendMessage to forge-audit-lead with your summary count and top 5 critical findings
Save your findings to: [path]/[your output file from the table above]
```

**Additional prompt content for the 3 workflow auditors only — append:**
```
## Spec Summary (shared context)

### Features
[numbered feature list from Step 2]

### Business Rules
[numbered rule list from Step 2]

### User Roles
[role descriptions]

### Key Workflows
[workflow descriptions]
```

**Cross-reference instructions (added to specific agents' prompts):**

- `data-integrity-auditor`: if you find DB objects that appear unused, SendMessage to `missing-impl-auditor` so they can cross-check.
- `ux-flow-auditor`: if you find buttons that navigate to missing pages, also notify `ux-interaction-auditor`.
- `ux-interaction-auditor`: if you find buttons with no handler, check with `ux-flow-auditor` whether those buttons should be navigation.
- `ux-state-auditor`: if you find mutations with no feedback, notify `ux-interaction-auditor`.
- `ux-consistency-auditor`: you'll receive summaries from other UX auditors — use them to detect patterns.
- `workflow-completeness-auditor`: if you find partially implemented features, notify `workflow-logic-auditor` — partial features often have unenforced rules.
- `workflow-logic-auditor`: if you find rules only enforced on the frontend, notify `workflow-edge-case-auditor` — that's an API-bypass edge case.
- `workflow-edge-case-auditor`: focus on IMPLEMENTED features only — don't duplicate findings for features `workflow-completeness-auditor` already flagged as missing.

---

## Step 5 — Wait and track

While agents are running, check `TaskList` periodically. As each `SendMessage` completion arrives, update that task to `completed` and record finding counts.

Wait until all spawned agents have reported. (9 if no frontend, otherwise 13.)

---

## Step 6 — Cross-reference and deduplicate across all 13 audit files

Read every produced audit file. Apply the dedup rules in this order — keep the **most specific / highest severity** finding, drop or annotate duplicates:

1. **Within Quality**
   - Dead Code says X is unused but Missing Impl says something calls it → re-examine, resolve, drop one
   - SaaS Pages "page exists but no auth" + Security "missing auth guard" → keep once under Security as CRITICAL
   - Consistency naming issues that already exist in another category → drop the consistency duplicate

2. **Within UX**
   - Broken button flagged by both Flow (routes nowhere) and Interaction (no handler) → keep the more specific one, cross-link
   - Missing feedback flagged by both State (no toast) and Interaction (button does nothing) → merge into one

3. **Within Workflow**
   - Completeness "feature implemented" but Logic "rule not enforced" → upgrade to "PARTIALLY implemented"
   - Edge cases on features already flagged as not implemented → drop (noise)
   - Frontend-only rule (Logic) is also an API edge case → keep the Logic finding, note bypass risk

4. **Cross-domain (the most valuable dedup)**
   - UX "non-functional button" + Workflow "feature not implemented" → workflow finding wins; UX finding becomes "evidence"
   - Security "missing rate limit on /api/X" + Quality "missing-impl in /api/X handler" → both are valid, keep both, cross-link
   - Dead Code "unused endpoint" + Workflow Completeness "feature not consumed" → keep the workflow finding, drop the dead-code duplicate

Validate severity assignments are consistent across all files using the shared severity table at the bottom of this skill.

---

## Step 7 — Write consolidated AUDIT_REPORT.md

Write `[project-root]/AUDIT_REPORT.md`. Single top-level report with sections per domain plus a unified critical/high roll-up:

```markdown
# Application Audit Report

- **Date**: [today's date]
- **Project**: [name]
- **Root**: [path]
- **Stack**: [stack]
- **Specification**: [spec file path or "inferred from code"]
- **Auditors**: 13-agent unified team (Quality 6 · UX 4 · Workflow 3)
- **Cache**: [reused / rebuilt at HH:MM]
- **Total Findings**: [count]
- **CRITICAL**: [count] | **HIGH**: [count] | **MEDIUM**: [count] | **LOW**: [count]

## Executive Summary
[3–5 sentences: overall health, biggest cross-domain risks, top 3 immediate actions. Be specific — name the broken flows and unenforced rules, not "some issues found".]

## Critical & High Findings (Action Required)
| # | Severity | Domain | Category | File | Line(s) | Description | Recommendation |
|---|----------|--------|----------|------|---------|-------------|----------------|
[merged table — CRITICAL first, then HIGH; within each, sorted by domain then category]

## Health Scorecards

### Quality
| Area | Score | Details |
|------|-------|---------|
| Dead Code | X/10 | [N unused symbols, N unused endpoints] |
| Missing Impl | X/10 | [N TODOs, N empty handlers] |
| Data Integrity | X/10 | [N missing FKs, N missing indexes, N transaction gaps] |
| Security | X/10 | [N criticals: secrets, missing auth, etc.] |
| Consistency | X/10 | [N naming, N duplicate logic] |
| SaaS Pages | X/10 | [N missing pages] |

### UX (omit if no frontend)
| Area | Score | Details |
|------|-------|---------|
| Navigation Flows | X/10 | [N broken links, N dead ends] |
| Interactions | X/10 | [N non-functional buttons, N broken forms] |
| UI States | X/10 | [loading X%, empty X%, error X%] |
| UX Consistency | X/10 | [N CRUD pattern mismatches] |

### Workflow
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
| Edge cases unhandled | N |

### Overall
**[X/10]** — [one-line characterization]

## Medium Findings
| # | Severity | Domain | Category | File | Line(s) | Description | Recommendation |
|---|----------|--------|----------|------|---------|-------------|----------------|

## Low Findings
| # | Severity | Domain | Category | File | Line(s) | Description | Recommendation |
|---|----------|--------|----------|------|---------|-------------|----------------|

## Fix Priority Roadmap

### Immediate (CRITICAL — fix before next deploy)
1. [Finding] — Effort: S/M/L — Spec: [BR-XXX if applicable]
...

### Short-term (HIGH — fix this sprint)
1. [Finding] — Effort: S/M/L
...

### Backlog (MEDIUM + LOW)
- Group related fixes by category
- [Category] cleanup: N items — Effort: M
...

## Appendix — Per-Category Audit Files

**Quality**
- [AUDIT_DEAD_CODE.md](./AUDIT_DEAD_CODE.md)
- [AUDIT_MISSING_IMPL.md](./AUDIT_MISSING_IMPL.md)
- [AUDIT_DATA_INTEGRITY.md](./AUDIT_DATA_INTEGRITY.md)
- [AUDIT_SECURITY.md](./AUDIT_SECURITY.md)
- [AUDIT_CONSISTENCY.md](./AUDIT_CONSISTENCY.md)
- [AUDIT_SAAS_PAGES.md](./AUDIT_SAAS_PAGES.md)

**UX**
- [AUDIT_UX_FLOWS.md](./AUDIT_UX_FLOWS.md)
- [AUDIT_UX_INTERACTIONS.md](./AUDIT_UX_INTERACTIONS.md)
- [AUDIT_UX_STATES.md](./AUDIT_UX_STATES.md)
- [AUDIT_UX_CONSISTENCY.md](./AUDIT_UX_CONSISTENCY.md)

**Workflow**
- [AUDIT_WORKFLOW_COMPLETENESS.md](./AUDIT_WORKFLOW_COMPLETENESS.md)
- [AUDIT_WORKFLOW_LOGIC.md](./AUDIT_WORKFLOW_LOGIC.md)
- [AUDIT_WORKFLOW_EDGE_CASES.md](./AUDIT_WORKFLOW_EDGE_CASES.md)
```

---

## Step 8 — Create GitHub issues (bulk)

Check for a GitHub remote:
```bash
gh repo view --json nameWithOwner 2>/dev/null
```

If yes, ensure all required labels exist:
```bash
for label in \
  audit critical high medium low status:agent-todo \
  dead-code missing-impl data-integrity security consistency saas-pages \
  ux-audit ux-flow ux-interaction ux-state ux-consistency \
  workflow-audit workflow-completeness workflow-logic workflow-edge-case
do
  gh label create "$label" --force 2>/dev/null || true
done
```

**Category → phase label mapping** (so `forge:implement` can route to the right builder):

| Domain | Category | Phase label |
|---|---|---|
| Quality | `dead-code` (frontend files) | `phase:frontend` |
| Quality | `dead-code` (backend files) | `phase:backend` |
| Quality | `missing-impl` (frontend files) | `phase:frontend` |
| Quality | `missing-impl` (backend files) | `phase:backend` |
| Quality | `data-integrity` | `phase:database` |
| Quality | `security` (API/auth/middleware) | `phase:backend` |
| Quality | `security` (XSS/client-side) | `phase:frontend` |
| Quality | `consistency` | infer from files |
| Quality | `saas-pages` | `phase:frontend` |
| UX | `ux-flow` / `ux-interaction` / `ux-state` / `ux-consistency` | `phase:frontend` |
| Workflow | `workflow-completeness` | infer from files |
| Workflow | `workflow-logic` | `phase:backend` (rules typically belong server-side) |
| Workflow | `workflow-edge-case` | infer from files |

Issue creation pattern:

1. **One issue per CRITICAL** — `[AUDIT][CRITICAL] [description]`
   - Labels: `audit`, `critical`, `status:agent-todo`, `[category]`, `[phase label]`
2. **One issue per HIGH** — `[AUDIT][HIGH] [description]`
   - Labels: `audit`, `high`, `status:agent-todo`, `[category]`, `[phase label]`
3. **One grouped issue per category for MEDIUM** — `[AUDIT][MEDIUM] [Category] — N findings`
   - Labels: `audit`, `medium`, `status:agent-todo`, `[category]`, `[phase label]`
4. **One grouped issue for ALL LOW** — `[AUDIT][LOW] Cleanup items — N findings`
   - Labels: `audit`, `low`, `status:agent-todo`

Each issue body must include: file paths, line numbers, description, recommended fix, estimated effort (S/M/L), and a link back to the relevant `AUDIT_*.md` file.

If no GitHub remote → skip issue creation and tell the user.

---

## Step 9 — Log to history and report

Append a single audit-run summary to the ledger:

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-audit audit_run \
  agents=$NUM_AGENTS_SPAWNED total=$TOTAL_FINDINGS \
  critical=$CRITICAL_COUNT high=$HIGH_COUNT medium=$MEDIUM_COUNT low=$LOW_COUNT \
  cache=$CACHE_STATUS  # "fresh" or "rebuilt"
```

Tell the user:
> **Audit complete.** Found [N] issues across 3 domains (Quality · UX · Workflow).
> - CRITICAL: [count] | HIGH: [count] | MEDIUM: [count] | LOW: [count]
> - Spec coverage: [X%] features fully implemented, [X%] rules enforced
>
> Full report: `AUDIT_REPORT.md`
> [If GitHub] Created [N] GitHub issues.
>
> Top 3 things to fix first:
> 1. [most critical finding]
> 2. [second]
> 3. [third]

Send `{"type": "shutdown_request"}` to all 13 auditors gracefully (most have already exited; harmless for those who have).

The cache stays in place for fast re-runs. Tell the user it can be removed with `rm -rf .forge-cache` if desired.

---

## Severity Reference (enforce consistently across all 13 auditors)

| Severity | Definition | Examples |
|----------|-----------|---------|
| CRITICAL | Data loss risk, security vulnerability, broken core functionality, contradicts spec | SQL injection, missing auth, orphaned data, broken references, feature contradicts requirement |
| HIGH | Feature gaps, significant dead code, missing error handling, broken user flows | Unused DB procedures, empty catch blocks, no input validation, button routes nowhere, rule unenforced |
| MEDIUM | Inconsistencies, missing validation, code quality, missing UI states | Mixed naming, missing indexes, no transactions, missing empty state, partial rule enforcement |
| LOW | Minor cleanup, style, optimization | Unused imports, TODO comments, missing comments, cosmetic issues |

## Finding Format (every auditor must use this)

```
| # | Severity | File | Line(s) | Description | Recommendation |
|---|----------|------|---------|-------------|----------------|
```

---

## Rules

- **Never skip an auditor** — all 13 (or 9 without a frontend) must run, in one turn
- **The cache is the source of truth** — agents read it first, scan only when the cache lacks a pattern
- **Cross-domain dedup matters most** — a finding flagged by both UX and Workflow is the same bug, not two
- **Spec-driven scoring** — Workflow scorecards require the spec; without it, mark workflow scores as "inferred (no spec)"
- **Severity floor for spec contradictions** — code that contradicts the spec is always CRITICAL
- **Be honest in scorecards** — a 10/10 requires zero findings in that area
