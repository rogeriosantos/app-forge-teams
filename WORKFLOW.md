# App Forge Teams — Workflow Reference

## The Complete Workflow

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PLANNING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 /forge:idea             Refine idea interactively
                         → forge-context.md

 /forge:prd              Generate full PRD + issue breakdown
                         → forge-prd.md

 /forge:init             Create GitHub repo + labels + milestones
                         + all issues → forge-state.json (phase: ready)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASE 1 — FRONTEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 /forge:build-frontend   Scaffolds Next.js, spawns agent team:
                           • build-team-lead (orchestrator)
                           • frontend-builder × N (parallel, max 4)
                           • code-reviewer (live, concurrent)
                           • arch-reviewer (final pass, after build)
                           • test-runner (regression, after build)
                         → phase: frontend-review

 /forge:review           [optional] Extra code + arch review pass
                         → creates issues (status:agent-todo)

 /forge:implement        [optional] Fix the review findings
                         → implements specific issues

 /forge:approve   ◄────── HUMAN GATE
                         You review the frontend, then approve
                         → phase: approved

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASE 2 — BACKEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 /forge:build-backend    Spawns agent team (sequenced):
                           1. db-designer (schema + migrations)
                           2. backend-builder × N (parallel, max 4)
                           3. integration-agent (wires frontend ↔ backend)
                           4. code-reviewer + arch-reviewer (final review)
                           5. test-runner (full regression)
                         → phase: integration-review

 /forge:review           [optional] Extra review pass
                         → creates issues (status:agent-todo)

 /forge:implement        [optional] Fix the review findings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 QUALITY & SHIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 /forge:audit            6-agent parallel audit:
                           dead-code · missing-impl · data-integrity
                           security · consistency · saas-pages
                         → AUDIT_REPORT.md + GitHub issues

 /forge:implement        Fix audit findings

 /forge:deploy           Deploy to Vercel (frontend) + Railway/Render (backend)
                         Post-deploy Playwright smoke test
                         → phase: deployed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ANYTIME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 /forge:status           Phase · open issues · next step
 /forge:implement [N]    Implement any specific issue(s) on demand
 /forge:review           Any extra review pass
 /forge:audit            Any extra audit pass
 /forge:build            Phase dispatcher (shows what to run next)
```

---

## forge:implement — What it is and isn't

| | `forge:build-frontend` / `forge:build-backend` | `forge:implement` |
|---|---|---|
| **Role** | Initial build from scratch | Repair / fix specific issues |
| **Team** | Full: team-lead + N parallel builders + **live code-reviewer** | Lightweight: dispatcher + builders |
| **Live review** | ✅ code-reviewer fixes HIGH issues inline while builders work | ❌ no live reviewer |
| **When to use** | Once per phase, at the start | After reviews/audits, to implement findings |
| **Trigger** | `/forge:build-frontend` or `/forge:build-backend` | `/forge:implement` or `/forge:implement 42,43` |

**Rule:** `forge:implement` is always a consequence of `forge:review` or `forge:audit`. It never replaces a build phase.

---

## forge-state.json phases

```
ready
  ↓  /forge:build-frontend
frontend-review
  ↓  /forge:approve
approved
  ↓  /forge:build-backend
integration-review
  ↓  /forge:deploy
deployed
```

---

## Agent inventory

### Build agents (spawned by build-team-lead)
| Agent | Role | Spawned by |
|-------|------|-----------|
| `build-team-lead` | Orchestrates builders + reviewer | `forge:build-frontend`, `forge:build-backend` |
| `frontend-builder` | Implements one frontend issue | `build-team-lead`, `issue-dispatcher` |
| `backend-builder` | Implements one backend issue | `build-team-lead`, `issue-dispatcher` |
| `db-designer` | PostgreSQL schema + Alembic migrations | `build-team-lead` |
| `integration-agent` | Wires frontend ↔ backend | `build-team-lead` |

### Review agents
| Agent | Role | Spawned by |
|-------|------|-----------|
| `code-reviewer` | Live code quality review | `build-team-lead`, `forge:review` |
| `arch-reviewer` | Live architecture review | `build-team-lead`, `forge:review` |
| `test-runner` | Full regression suite + Playwright | `build-team-lead`, `issue-dispatcher` |

### Implement agents
| Agent | Role | Spawned by |
|-------|------|-----------|
| `issue-dispatcher` | Routes issues → right builder | `forge:implement` |

### Audit agents (all spawned in parallel by forge:audit)
| Agent | Role |
|-------|------|
| `dead-code-hunter` | Finds unused code |
| `missing-impl-auditor` | Finds incomplete features |
| `data-integrity-auditor` | Finds DB consistency issues |
| `security-auditor` | Finds security vulnerabilities |
| `consistency-auditor` | Finds naming/pattern inconsistencies |
| `saas-pages-auditor` | Checks for missing SaaS pages |
