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
 /forge:audit            13-agent unified parallel audit:
                          • Quality (6):  dead-code · missing-impl · data-integrity
                                          security · consistency · saas-pages
                          • UX (4):       ux-flows · ux-interactions
                                          ux-states · ux-consistency
                          • Workflow (3): workflow-completeness
                                          workflow-logic · workflow-edge-cases
                         All 13 share one .forge-cache/ build (auto-reused if fresh).
                         → AUDIT_REPORT.md + GitHub issues

 /forge:implement        Fix audit findings

 /forge:deploy           Deploy to Vercel (frontend) + Railway/Render (backend)
                         Post-deploy Playwright smoke test
                         → phase: deployed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ANYTIME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 /forge:status           Phase · open issues · recent ledger activity · next step
 /forge:metrics          Aggregate stats from forge-history.jsonl
 /forge:replay           Narrative reconstruction of a past session (debugging)
 /forge:implement [N]    Implement any specific issue(s) on demand
 /forge:review           Any extra review pass
 /forge:audit            13-agent unified audit (quality · UX · workflow)
 /forge:redesign         Modernize visual design — apply Apple HIG to existing app,
                         swap palette, refactor components in batches w/ checkpoints
 /forge:i18n             Internationalize an existing app — extract strings, set up
                         next-intl (cookie-based, no URL prefix), AI-translate,
                         add Language switcher to /settings or /profile
 /forge:build            Phase dispatcher (shows what to run next)
 /forge:reset [--hard]   Reset phase to "ready" (--hard deletes code + artifacts)
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

## Tracking ledger — `forge-history.jsonl`

Every agent appends one line to `forge-history.jsonl` on key events: spawn, task_started, task_done, finding_high, finding_issued, regression_run, regression_skipped, audit_run, phase_change, design_refs_read, review_done.

`/forge:status` surfaces recent activity; the full schema is in [`docs/tracking-ledger.md`](docs/tracking-ledger.md). Quick query:
```bash
tail -10 forge-history.jsonl | jq -c
```

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

### Review agents (partitioned scopes — no runtime dedup)
| Agent | Scope | Title prefix | Spawned by |
|-------|------|---|-----------|
| `code-reviewer` | Line-level: security, types, validation, UI states, i18n, a11y, design-system | `[CODE]` | `build-team-lead`, `forge:review` |
| `arch-reviewer` | Structural: component size, prop drilling, service layer, repo pattern, N+1, response shapes | `[ARCH]` | `build-team-lead`, `forge:review` |
| `test-runner` | Regression suite + Playwright sweep. Skips if no source changes since last run. | — | `build-team-lead`, `issue-dispatcher` |

### Implement agents
| Agent | Role | Spawned by |
|-------|------|-----------|
| `issue-dispatcher` | Routes issues → right builder | `forge:implement` |
| `redesign-applier` | Refactors one component family (buttons / cards / inputs / etc.) to comply with the Apple design system. Preserves component APIs. Captures before/after screenshots. | `forge:redesign` |
| `i18n-extractor` | Replaces hardcoded user-facing strings with `t('key')` calls in one namespace, populates `messages/en.json`, flags interpolations and plurals for review. | `forge:i18n` |

### Audit agents (all 13 spawned in parallel by forge:audit)

**Quality (6)**
| Agent | Role |
|-------|------|
| `dead-code-hunter` | Finds unused code |
| `missing-impl-auditor` | Finds incomplete features |
| `data-integrity-auditor` | Finds DB consistency issues |
| `security-auditor` | Finds security vulnerabilities |
| `consistency-auditor` | Finds naming/pattern inconsistencies |
| `saas-pages-auditor` | Checks for missing SaaS pages |

**UX (4) — skipped if no frontend**
| Agent | Role |
|-------|------|
| `ux-flow-auditor` | Broken navigation, dead-end pages, orphan routes |
| `ux-interaction-auditor` | Non-functional buttons, empty handlers, broken forms |
| `ux-state-auditor` | Missing loading/empty/error states, silent failures |
| `ux-consistency-auditor` | Mixed CRUD patterns, terminology mismatches |

**Workflow (3)**
| Agent | Role |
|-------|------|
| `workflow-completeness-auditor` | Spec features without implementation paths |
| `workflow-logic-auditor` | Business rules not enforced in code |
| `workflow-edge-case-auditor` | Unhandled edge cases in implemented flows |
