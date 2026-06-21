---
name: forge-metrics
description: Show aggregate metrics from the forge tracking ledger — phase durations, build progress, reviewer findings, regression skip rate, design-ref coverage, audit findings, top agents, event distribution. Run anytime to see how the forge has been performing on this project.
allowed-tools: Read, Bash
---

# forge:metrics — Aggregate stats from the tracking ledger

Run the metrics script:

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-metrics.sh
```

If `forge-history.jsonl` doesn't exist yet, tell the user:
> No tracking ledger found. Metrics will appear once the forge starts logging events (after the first `/forge:idea` or `/forge:build-frontend` run).

## What you'll see

- **Phase transitions** — every `phase_change` event with timestamps
- **Build progress** — task_started / task_done / task_failed counts + success rate
- **Reviewer findings** — HIGH (sent inline) vs MED/LOW (issued as GH issues), grouped by reviewer
- **Regression runs** — full runs vs skipped (staleness gate working), pass/fail counts
- **Design-reference read coverage** — % of frontend-builder tasks that logged a `design_refs_read` event (target: 100%)
- **Audits** — count + per-run severity breakdown
- **Top 5 most active agents**
- **Event type distribution**

## Suggesting follow-ups based on the metrics

If the report shows:
- **Design coverage < 100%** → some builders skipped reading the design system. Suggest `/forge:review` to catch any design-rule violations they may have introduced.
- **Regression skip rate is 0%** → staleness gate not engaging. Either every run had real changes, or `last_regression_at` isn't being persisted in `forge-state.json`. Worth investigating.
- **Many `task_failed` events** → builders are getting stuck. Suggest the user inspect failures with `${CLAUDE_PLUGIN_ROOT}/scripts/forge-timeline.sh` filtered by event type.
- **Audit `critical > 0` on the latest run** → recommend `/forge:implement` immediately to fix critical findings before deploy.
