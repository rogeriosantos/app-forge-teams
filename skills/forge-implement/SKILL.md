---
name: forge-implement
description: Implement one or more GitHub issues using the right builder agent, regardless of current forge phase. Works at any point in the workflow — ideal for implementing audit findings, review issues, or manually added issues. Accepts optional issue numbers as argument.
argument-hint: "[optional: issue numbers, comma-separated — e.g. 42 or 42,43,45]"
allowed-tools: Read, Bash, Agent, TeamCreate, TaskCreate, TaskUpdate, TaskList
---

# forge:implement — Issue-Level Implementation

Implement one or more GitHub issues on-demand, routing each to the right builder agent based on its labels. Phase-agnostic — works at any stage of the forge workflow.

## Step 1 — Load context

Use the Read tool to read `forge-state.json` in the current directory. If it does not exist, tell the user:
> `forge-state.json` not found. Run `/forge:init` first to set up the repository.

Extract:
- `repo` — the GitHub repo (`owner/repo`)
- `app_name` — for display purposes

## Step 2 — Determine which issues to implement

### If the user provided issue numbers as argument (e.g. `42` or `42,43,45`):

For each number, fetch the issue:
```bash
gh issue view [N] --json number,title,body,labels,state -R "$REPO"
```

- If the issue is **closed**, skip it and warn the user: "Issue #[N] is already closed — skipping."
- If the issue is **open**, include it in the implementation list.

### If no argument was provided:

Fetch all open issues with `status:agent-todo`:
```bash
gh issue list \
  --label "status:agent-todo" \
  --state open \
  --json number,title,body,labels \
  --limit 50 \
  -R "$REPO"
```

Show the user the list in this format:
```
Found [N] open issues ready to implement:
  #42 [phase:frontend] Dashboard overview page
  #43 [phase:frontend] User settings form
  #47 [phase:backend]  Auth endpoints

Proceed with all [N]? (or specify issue numbers to filter)
```

Wait for confirmation before continuing.

## Step 3 — Create a dispatch team

Use TeamCreate:
```
team_name: "forge-impl-[first issue number]"
description: "Implement [N] issue(s) for [app_name]"
```

## Step 4 — Spawn issue-dispatcher

Use the Agent tool with:
- `subagent_type`: `"app-forge-teams:issue-dispatcher"`
- `team_name`: the team created above
- `name`: `"issue-dispatcher"`
- `prompt`: Pass all of the following:
  - The full list of issues to implement (number, title, body, labels array)
  - The repo name (`owner/repo`)
  - The path to `forge-prd.md` (in the current directory) for context

## Step 5 — Report completion

When the dispatcher reports back with `{"type": "dispatch_complete", ...}`:

```
**Implementation complete.**

✅ Implemented ([N] issues):
  #42 — Dashboard overview page  (commit: abc1234)
  #43 — User settings form       (commit: def5678)

❌ Failed ([N] issues):
  #47 — Auth endpoints  (reason: [reason from dispatcher])

Next steps:
  • Run `/forge:review` to review the new code
  • Run `/forge:audit` for a full audit pass
  • Fix failed issues manually or re-run `/forge:implement [N]`
```
