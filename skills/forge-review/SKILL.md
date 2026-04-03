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

**code-reviewer agent:**
- team_name: "forge-review-[timestamp]"
- name: "code-reviewer"
- Scope from argument (frontend/backend/all)
- Instruction: before creating any issue, check with arch-reviewer via SendMessage to avoid duplicates

**arch-reviewer agent:**
- team_name: "forge-review-[timestamp]"
- name: "arch-reviewer"
- Same scope
- Instruction: before creating any issue, check with code-reviewer via SendMessage to avoid duplicates

### Step 3 — Cross-communication protocol
Both agents will:
1. Find a potential issue
2. SendMessage to the other reviewer: "About to create issue: [title] — are you covering this?"
3. If the other says yes → skip, if no → create the issue
4. This prevents duplicate issues from two reviewers seeing the same problem

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
