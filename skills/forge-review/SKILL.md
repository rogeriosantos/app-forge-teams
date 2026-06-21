---
name: forge-review
description: Run a coordinated review TEAM — code-reviewer and arch-reviewer run in parallel, communicate findings to each other to avoid duplicate issues, then report. All findings become GitHub issues.
argument-hint: "[scope: frontend | backend | all (default: all)]"
allowed-tools: Read, Bash, Agent, TeamCreate, TaskCreate, SendMessage
---

# forge:review — Coordinated Review Team (v2)

Read `forge-state.json` for the repo name.

### Step 1 — Create the review team
Use TeamCreate:
```
team_name: "forge-review-[timestamp]"
description: "Review pass: code quality + architecture"
```

### Step 2 — Spawn both reviewers in parallel
Use the Agent tool twice (in the same message, parallel):

**code-reviewer agent** (line-level scope):
- team_name: "forge-review-[timestamp]"
- name: "code-reviewer"
- Scope from argument (frontend/backend/all)
- Title prefix for issues: `[CODE]`

**arch-reviewer agent** (structural scope):
- team_name: "forge-review-[timestamp]"
- name: "arch-reviewer"
- Same scope filter
- Title prefix for issues: `[ARCH]`

The two reviewers have **non-overlapping scopes** by design (see their agent files). No runtime SendMessage negotiation — each agent stays in its lane.

### Step 3 — Post-pass dedup (team-lead's job)
After both reviewers complete, list the issues they created and dedupe by title:
```bash
gh issue list --label "type:review-finding" --state open --json number,title -R "$REPO" \
  | jq -r '.[] | "\(.number)\t\(.title)"' \
  | sort -u -k2
```

Rare overlaps (same bug surfaced by both) appear as adjacent lines with similar titles. Close the duplicate manually with a cross-reference comment. Most runs have zero overlaps because the scopes are partitioned.

### Step 4 — Summarize
After both complete, use the Read tool to read `forge-state.json` and extract the `repo` field. Then run:
```bash
gh issue list --label "type:review-finding" --state open --json number,title,labels -R "$REPO"
```

Report:
> Review team complete. [N] issues created (deduplicated):
> - [N] HIGH severity
> - [N] MED severity
> - [N] LOW severity
