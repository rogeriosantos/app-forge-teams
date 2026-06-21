---
name: forge-init
description: Initialize the GitHub repository with labels, milestones, and all issues from the PRD. Reads forge-prd.md. Requires gh CLI authenticated.
allowed-tools: Read, Write, Bash
---

# forge:init — PRD to GitHub

Read `forge-prd.md` from the current directory. If it does not exist, tell the user to run `/forge:prd` first.

## Step 1 — Create the GitHub repository

Extract the app name from the "Product Overview" section of `forge-prd.md`. Convert it to a slug (lowercase, hyphens, no spaces or special chars) to use as the repo name.

Verify the authenticated GitHub user:
```bash
gh api user --jq .login
```

Create the repo:
```bash
gh repo create [app-name-slug] --private --description "[tagline from PRD]" --clone
```

If the repo name is already taken, append a short suffix (e.g., `-app`) and retry once. If it still fails, tell the user and ask them to provide a repo name.

## Step 2 — Labels

Create all labels (delete existing defaults first):
```bash
gh label delete "bug" --yes 2>/dev/null; gh label delete "documentation" --yes 2>/dev/null
gh label delete "duplicate" --yes 2>/dev/null; gh label delete "enhancement" --yes 2>/dev/null
gh label delete "good first issue" --yes 2>/dev/null; gh label delete "help wanted" --yes 2>/dev/null
gh label delete "invalid" --yes 2>/dev/null; gh label delete "question" --yes 2>/dev/null
gh label delete "wontfix" --yes 2>/dev/null

# Phase labels
gh label create "phase:frontend"      --color "0075ca" --description "Next.js frontend work"
gh label create "phase:backend"       --color "e4e669" --description "FastAPI backend work"
gh label create "phase:database"      --color "d93f0b" --description "PostgreSQL + Alembic migrations"
gh label create "phase:integration"   --color "0e8a16" --description "Wiring frontend to backend"
gh label create "phase:architecture"  --color "5319e7" --description "Architecture & design decisions"
gh label create "phase:security"      --color "b60205" --description "Security requirements"
gh label create "phase:testing"       --color "1d76db" --description "Tests and QA"

# Type labels
gh label create "type:feature"        --color "a2eeef" --description "New feature"
gh label create "type:review-finding" --color "fbca04" --description "Found by code/arch review agent"
gh label create "type:bug"            --color "d73a4a" --description "Something is broken"
gh label create "type:chore"          --color "ededed" --description "Maintenance, tooling"

# Status labels
gh label create "status:agent-todo"   --color "c2e0c6" --description "Ready for agent to work on"
gh label create "status:needs-review" --color "fef2c0" --description "Awaiting human review"
gh label create "status:blocked"      --color "e11d48" --description "Blocked, needs input"
```

## Step 3 — Milestones

```bash
gh api repos/{owner}/{repo}/milestones -X POST -f title="Phase 1: Frontend"   -f description="Build the entire Next.js frontend" -f state="open"
gh api repos/{owner}/{repo}/milestones -X POST -f title="Phase 2: Database & Backend" -f description="DB schema, migrations, FastAPI" -f state="open"
gh api repos/{owner}/{repo}/milestones -X POST -f title="Phase 3: Integration" -f description="Wire frontend to backend" -f state="open"
gh api repos/{owner}/{repo}/milestones -X POST -f title="Phase 4: Review & Polish" -f description="Review findings, QA, launch prep" -f state="open"
```

## Step 4 — Create Issues

Parse the "GitHub Issue Breakdown" section from `forge-prd.md` and create every issue using `gh issue create`.

For each issue:
```bash
gh issue create \
  --title "[issue title]" \
  --body "[description from PRD, with acceptance criteria]" \
  --label "phase:[phase],type:feature,status:agent-todo" \
  --milestone "[matching milestone]"
```

Map phases to milestones:
- `phase:frontend` → "Phase 1: Frontend"
- `phase:backend`, `phase:database` → "Phase 2: Database & Backend"
- `phase:integration` → "Phase 3: Integration"
- `phase:architecture`, `phase:security`, `phase:testing` → "Phase 4: Review & Polish"

## Step 4.5 — Manage .gitignore for forge artifacts

Ensure the project's `.gitignore` excludes forge-internal files. Create or append to `.gitignore`:

```bash
touch .gitignore
for pattern in \
  "# Forge — internal artifacts" \
  "forge-history.jsonl" \
  "forge-history-*.jsonl" \
  ".forge-cache/" \
  ".forge-context/" \
; do
  grep -qxF "$pattern" .gitignore 2>/dev/null || echo "$pattern" >> .gitignore
done
```

`forge-state.json`, `forge-prd.md`, `forge-context.md`, `DOMAIN_RESEARCH.md`, `WORKFLOW_SPEC.md`, `WORKFLOW_VALIDATION.md` are NOT ignored — they're the project's source-of-truth documents and should be committed.

## Step 5 — Save State

Save `forge-state.json` in current directory:
```json
{
  "repo": "owner/repo",
  "app_name": "[from PRD]",
  "phase": "ready",
  "issues_created": [list of issue numbers],
  "milestones": {
    "frontend": 1,
    "backend_db": 2,
    "integration": 3,
    "review": 4
  }
}
```

## Step 6 — Log to history and report

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-init phase_change \
  from=none to=ready issues=$ISSUES_CREATED repo=$REPO
```

Tell the user:
> Repo `[repo]` initialized with [N] issues across 4 milestones.
>
> Issues by phase:
> - Frontend: [N] issues
> - Backend + DB: [N] issues
> - Integration: [N] issues
> - Architecture/Security/Testing: [N] issues
>
> Run `/forge:build-frontend` to start Phase 1 (frontend build).
