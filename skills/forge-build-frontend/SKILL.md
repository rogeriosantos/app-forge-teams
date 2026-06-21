---
name: forge-build-frontend
description: Build the Next.js frontend using a coordinated agent team. Spawns build-team-lead who orchestrates parallel frontend-builder agents plus a live code-reviewer and a final arch-reviewer pass. Only runs when forge-state.json phase is "ready". Sets phase to "frontend-review" when complete.
allowed-tools: Read, Write, Bash, Agent, TeamCreate, TaskCreate, TaskUpdate, TaskList, SendMessage
---

# forge:build-frontend — Phase 1: Frontend Agent Team

Read `forge-state.json` using the Read tool. If it does not exist, tell the user to run `/forge:init` first.

If `phase` is not `"ready"`:

| Phase | Message |
|-------|---------|
| `frontend-review` | Frontend is already built. Review it in `./frontend`, then run `/forge:approve` when ready. |
| `approved` | Frontend was approved. Run `/forge:build-backend` to build the database and backend. |
| `integration-review` | Both phases are complete. Run `/forge:review` or `/forge:audit`. |
| `deployed` | Already deployed. Run `/forge:status` for a summary. |
| anything else | Show the phase value and list the valid phases above. |

Only continue if phase is `"ready"`.

---

## Step 1 — Scaffold the frontend (if not already done)

```bash
[ -d "frontend" ] && echo "exists" || echo "missing"
```

If `frontend/` does not exist:
```bash
npx create-next-app@latest frontend --typescript --tailwind --app --eslint --src-dir --import-alias "@/*" --no-git
cd frontend && npx shadcn@latest init -d
```

**Do NOT accept shadcn `baseColor: neutral` as the final palette.** That's a scaffolding default. Step 1.5 will replace it with a real brand palette.

---

## Step 1.5 — Foundation phase (BLOCKING — MANDATORY)

**Resume check (interrupted builds):** if `frontend/DESIGN.md` already exists, the foundation completed on a prior run — skip this step and go straight to Step 2. Re-dispatch is naturally avoided because Step 2 queries `--state open`: any issue a builder already finished was **closed**, so it drops out of the query. (Note: builders close issues but do not remove the `status:agent-todo` label — it is the closure, not a relabel, that excludes them.) This makes re-running `/forge:build-frontend` after an interruption safe: it resumes from the still-open issues instead of rebuilding everything.

Otherwise, spawn the `frontend-foundation-builder` agent FIRST, BEFORE any feature builders. This agent picks the brand palette, applies it to `globals.css`, builds the app shell, configures locale resolution (NEVER in URL — see user's `~/.claude/rules/i18n.md`), and lays down a visual baseline smoke test.

**Without this step, every feature builder accepts shadcn `neutral` defaults and the compounded result is wireframe-grade output regardless of code cleanliness.** This is the exact failure that cost 12 hours on the Aconchego project (2026-05-27). The agent exists specifically to prevent that.

Use the Agent tool:
- `subagent_type`: `"app-forge-teams:frontend-foundation-builder"`
- `name`: `"frontend-foundation-builder"`
- `prompt`: Pass the path to `forge-prd.md`, the app name + tagline from `forge-state.json`, and the repo name. Tell it: "You run FIRST. Pick a brand palette intentionally (not neutral), apply it to globals.css, build the app shell, configure locale resolution with `localePrefix: 'never'`, lay down a Playwright CLI visual baseline. Read your own screenshots before declaring done."

**Wait for `foundation_done` message** with `ready_for_feature_builders: true`. If `ready_for_feature_builders: false`, DO NOT proceed — surface the gaps to the user and ask whether to retry the foundation or escalate.

If foundation passes: proceed to Step 2. Every subsequent builder will read `frontend/DESIGN.md` and consume the tokens it writes.

---

## Step 2 — Fetch all frontend issues

Use the Read tool to read `forge-state.json` and extract the `repo` field into `$REPO`. Then:

```bash
gh issue list \
  --label "phase:frontend" \
  --label "status:agent-todo" \
  --state open \
  --json number,title,body,labels \
  --limit 200 \
  -R "$REPO"
```

If there are no open frontend issues, tell the user:
> No open frontend issues found with `status:agent-todo`. All frontend issues may already be implemented.
> Run `/forge:review` to review what was built, or `/forge:status` to check the project state.

---

## Step 3 — Create the frontend team

Use TeamCreate:
```
team_name: "forge-frontend"
description: "Phase 1 frontend build for [app_name from forge-state.json]"
```

---

## Step 4 — Spawn build-team-lead

Check the issue list from Step 2 for any auth-related issues (issues whose title contains "auth", "login", "register", "session", "JWT", "Clerk", "NextAuth"). If any exist, note them — pass them to build-team-lead with the instruction to implement auth issues FIRST, before any other frontend issues, since all authenticated pages depend on the auth scaffold being in place.

Use the Agent tool:
- `subagent_type`: `"app-forge-teams:build-team-lead"`
- `team_name`: `"forge-frontend"`
- `name`: `"build-team-lead"`
- `prompt`: Pass all of the following:
  - Full list of frontend GitHub issues (number, title, body, labels)
  - Repo name (`owner/repo`)
  - Path to `forge-prd.md`
  - Phase label: `phase:frontend` (pass this to the code-reviewer for issue labeling)
  - Sequencing note: if any issues are auth-related (auth scaffold, login, session setup), implement those FIRST before other features — other pages depend on auth being set up
  - Instruction: orchestrate the frontend build — spawn one `frontend-builder` per issue (max 4 parallel), spawn `code-reviewer` concurrently with phase label `phase:frontend`, run `test-runner` after all builders complete, then report back

---

## Step 5 — Wait for build-team-lead completion

The build-team-lead Agent tool call returns when Phase 1 is done. Capture the result — it contains:
```json
{
  "phase_complete": true,
  "issues_built": [...],
  "review_issues_created": [...],
  "regression_report": { "status": "pass|fail", "regressions_found": N },
  "summary": "..."
}
```

Store `review_issues_created` count and `regression_report` for the Step 7 report.

---

## Step 5.5 — Architecture review

Spawn the arch-reviewer for a final structural pass on the built frontend. This is a separate Agent tool call that runs after build-team-lead completes:

Use the Agent tool:
- `subagent_type`: `"app-forge-teams:arch-reviewer"`
- `team_name`: `"forge-frontend"`
- `name`: `"arch-reviewer"`
- `prompt`: Review the frontend codebase in `./frontend/` for architectural issues.
  Scope: frontend only (Next.js App Router structure, component boundaries, data flow, state management patterns).
  The code-reviewer has already reviewed line-level quality — focus on structural/architectural patterns.
  Create GitHub issues for any findings (labels: `type:review-finding`, `phase:frontend`, `status:agent-todo`).
  **Do NOT SendMessage to build-team-lead** — it is no longer running. Simply complete your review and return.

When the Agent tool returns, extract `issues_created` from the arch-reviewer's completion output for the Step 7 report.

---

## Step 5.7 — Visual quality gate (MANDATORY before declaring phase complete)

Engineering metrics (lint 0/0, types clean, build pass, smoke routes 200) are NECESSARY but NOT SUFFICIENT. Run a visual readback pass before declaring `frontend-review`:

```bash
cd frontend
# Playwright CLI must already be installed by the foundation builder
node tests/visual/baseline.spec.ts  # or however the foundation builder wired it
# OR run a ad-hoc screenshot script over 8-10 representative routes
```

For each screenshot taken, use the **Read tool** on the PNG file. Don't trust filenames or sizes — read the actual pixels. For each, answer honestly:

> **"Would I be willing to demo this page to a paying customer tomorrow?"**

If any answer is NO, the phase is NOT complete. Surface the gap to the user with the specific failing screenshot path. Common failure patterns:
- Pages look wireframe-grade (no brand color, no app shell, no iconography)
- Safety-critical workflows have no visual urgency states (e.g. a med list where late doses look identical to done doses)
- The product's emotional positioning is absent from the visual ("Aconchego" = warm welcome but the page is sterile gray)

If everything passes the visual gate, continue to Step 6.

---

## Step 6 — Update state and log phase change

Update `forge-state.json` → `"phase": "frontend-review"`.

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-build-frontend phase_change \
  from=ready to=frontend-review issues=$ISSUES_BUILT
```

---

## Step 7 — Report to user

> **Frontend build complete.**
>
> Built [N] issues. Code reviewer created [N] findings. Arch reviewer created [N] architectural findings.
> Regression tests: [passed / N issues found — see findings above].
>
> Next steps:
> 1. Review the frontend: `cd frontend && npm run dev`
> 2. Run `/forge:review` for an additional review pass (optional)
> 3. Run `/forge:implement` to fix any open findings (optional)
> 4. Run `/forge:approve` when the frontend is ready for the backend build
