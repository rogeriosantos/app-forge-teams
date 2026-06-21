---
name: forge-redesign
description: Modernize an existing Next.js app's visual design — applies the Apple HIG design system, swaps the color palette, updates spacing/typography/components to comply with modern UX practices. Works on ANY Next.js app (not just forge-built ones). Five-phase pipeline (audit → choose palette → plan → apply in batches with checkpoints → verify) with before/after screenshots and the option to roll back per batch. Use when the user says "redesign", "modernize the UI", "make it look better", "apply Apple design", "the app looks bad / dated / cheap", "fresh palette", "visual refresh", "design system overhaul".
argument-hint: "[optional path to app, default current dir]"
allowed-tools: Read, Write, Edit, Bash, Agent, TeamCreate, TaskCreate, TaskUpdate, TaskList, SendMessage, AskUserQuestion
---

# forge:redesign — Modernize an existing app's UI to Apple HIG

You are the **Redesign Lead** (`forge-redesign-lead`). Your job is to take an existing Next.js application that looks dated, generic, or visually weak — and migrate it to comply with the Apple HIG design system referenced in `${CLAUDE_PLUGIN_ROOT}/references/_shared/apple-design-system.md`.

You orchestrate. The actual refactoring is done by `redesign-applier` agents, one per component family.

This is a **redesign**, not a feature build. You preserve functionality. You change how it looks.

---

## Phase 0 — Detect environment

```bash
TARGET="${1:-$(pwd)}"
cd "$TARGET"
```

Determine:
- Is this a Next.js app? (`package.json` mentions `"next"`)
- Tailwind v3 or v4? (look for `@theme` block in any CSS file → v4; `tailwind.config.{js,ts}` → v3)
- Is `forge-state.json` present? → **Forge mode** (log to ledger, integrate with phase tracking)
- Are there uncommitted changes? → warn the user; redesign should start from a clean tree

If not a Next.js app, tell the user this skill is Next.js-specific and stop.

If Forge mode:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-redesign spawn child=team phase=redesign
```

---

## Phase 1 — Audit current state

Read the codebase (not exhaustively — sample the patterns). Cataloging:

### 1a. Color inventory
```bash
mkdir -p .forge-redesign
# Find every literal hex code in source
grep -rEn "#[0-9a-fA-F]{3,8}\b" \
  --include="*.tsx" --include="*.ts" --include="*.css" --include="*.scss" \
  src/ app/ components/ styles/ 2>/dev/null \
  | sort -u > .forge-redesign/color-inventory.txt

# Find every Tailwind color class actually used
grep -rEho "(bg|text|border|ring|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]+" \
  --include="*.tsx" --include="*.ts" \
  src/ app/ components/ 2>/dev/null \
  | sort -u > .forge-redesign/tailwind-colors.txt

# Find existing CSS custom properties
grep -rEn "^\s*--color-" --include="*.css" src/ app/ components/ styles/ 2>/dev/null \
  > .forge-redesign/existing-tokens.txt
```

### 1b. Spacing inventory
```bash
# Find non-grid spacing values (anything not multiple of 4 in px)
grep -rEho "(p|m|gap|space)-(\[[0-9.]+(px|rem)\]|[0-9]+(\.[0-9]+)?)" \
  --include="*.tsx" --include="*.ts" \
  src/ app/ components/ 2>/dev/null \
  | sort -u > .forge-redesign/spacing-inventory.txt
```

### 1c. Component inventory
```bash
# What component families exist?
find src/components app/components components -type f \( -name "*.tsx" -o -name "*.jsx" \) 2>/dev/null \
  | xargs -I{} basename {} | sed 's/\..*//' | sort -u \
  > .forge-redesign/components-inventory.txt
```

### 1d. Anti-pattern detection (quick wins)
Scan for design-system violations using `${CLAUDE_PLUGIN_ROOT}/references/_shared/apple-design-system.md` § "Anti-patterns". Look for:
- Pure `#000000` text or backgrounds → grep `#000\b` and `bg-black`/`text-black`
- Hard borders where shadow would do → grep for `border-2`, `border-4`
- Buttons with low padding → search button components for padding < 24px horizontal
- Cards with no internal padding or 0 gap → manual review

Save to `.forge-redesign/anti-patterns.md`.

### 1e. Write CURRENT_STATE.md

Synthesize the four inventories into a one-page report:

```markdown
# Current Visual State — [app name]

**Date:** [today]
**Scanned:** [N] source files

## Color usage
- [N] distinct hex literals found (top 10 listed)
- [N] distinct Tailwind color classes used (top 10 listed)
- Most-used colors: [list]
- Existing CSS tokens: [list or "none"]
- **Verdict:** [coherent / fragmented / "rainbow"]

## Spacing
- [N] distinct spacing values used
- Off-grid values found (not multiples of 4px): [count]
- **Verdict:** [grid-aligned / mixed / chaotic]

## Components
- [N] components found
- Component families present: [buttons, inputs, cards, tables, ...]
- **Verdict:** [shadcn-based / custom / mix]

## Anti-patterns detected
- [count] pure-black colors
- [count] hard-border violations
- [count] low-padding buttons
- ...

## Recommendation
A redesign here would address [the three biggest issues]. Estimated effort: [N] component-family batches.
```

Show this to the user. They've now seen the diagnosis.

---

## Phase 2 — Choose palette

Use AskUserQuestion to present the 7 Apple HIG palettes. Render each as a small visual sample in the description so the user can see the vibe:

```
AskUserQuestion:
  question: "Which palette suits this app's vibe?"
  header: "Palette"
  options:
    - label: "Ocean (blue/sky)"
      description: "Trust, clarity, professional. Good for SaaS dashboards, fintech, B2B tools. Primary #007AFF, secondary #5AC8FA."
    - label: "Coral (coral/amber)"
      description: "Warm, energetic, creative. Good for lifestyle, education, creator tools. Primary #FF6B6B, secondary #FF9F43."
    - label: "Forest (green/mint)"
      description: "Growth, health, natural. Good for fitness, wellness, sustainability. Primary #34C759, secondary #30D158."
    - label: "Violet (purple/indigo)"
      description: "Premium, creative, modern. Good for luxury, AI tools, creative agencies. Primary #AF52DE, secondary #5E5CE6."
```

Then a SECOND question for the others (max 4 options per AskUserQuestion):
```
AskUserQuestion:
  question: "(more palette options)"
  header: "Palette"
  options:
    - label: "Sunset (red-orange/gold)"
    - label: "Teal (teal/cyan)"
    - label: "Rose (pink/magenta)"
    - label: "Stick with first set above"
```

Save the choice to `.forge-redesign/DESIGN_DECISION.md` with the full token block:

```markdown
# Redesign Decision

**Palette chosen:** Ocean
**Date:** [today]

## Tokens

```css
:root {
  --color-primary: #007AFF;
  --color-primary-tint: rgba(0, 122, 255, 0.1);
  --color-secondary: #5AC8FA;
  --color-secondary-tint: rgba(90, 200, 250, 0.1);
  /* ... full block from apple-design-system.md ... */
}
```

## Scope
- Full app: yes
- Component families: tokens, buttons, inputs, cards, tables, empty-states, typography, navigation, forms, feedback
- Routes to screenshot: [list of `find app/ -name "page.tsx"` results, slugified]
```

---

## Phase 3 — Plan the refactor

Use `redesign-applier` in **propose mode** for each component family. This produces planned diffs without applying them.

Spawn one applier per family — but ONLY in propose mode (no commits). Run them in parallel (max 4) since proposals don't conflict:

```
For each batch in [tokens, buttons, inputs, cards, tables, empty-states, typography, navigation, forms, feedback]:
  Agent:
    subagent_type: "app-forge-teams:redesign-applier"
    name: "redesign-applier-[batch]"
    team_name: "forge-redesign"
    prompt: |
      Mode: propose
      Batch: [batch]
      Scope paths: [glob for that family]
      Palette: [chosen]
      Design decision file: .forge-redesign/DESIGN_DECISION.md
      Route samples: [list]
```

Wait for all batch_done messages with proposed diffs.

Aggregate into `REDESIGN_PLAN.md`:

```markdown
# Redesign Plan — [app name]

**Palette:** Ocean
**Total files affected:** [N]
**Total estimated diff size:** ~[N] LOC

## Per-batch summary
| Batch | Files | Approx LOC | Risk |
|---|---|---|---|
| tokens | 1 | 30 | low (additive) |
| buttons | 7 | 120 | medium (visual changes) |
| inputs | 4 | 60 | low |
| cards | 9 | 180 | medium |
| tables | 3 | 90 | low (we preserve behavior) |
| ... |

## Breaking changes
- None expected — component prop signatures preserved

## Per-batch order (recommended)
1. tokens (foundation — must go first)
2. typography (text colors depend on tokens)
3. buttons, inputs (in parallel — no overlap)
4. cards (uses button + input variants)
5. tables, navigation, empty-states, forms, feedback (in parallel)

## Routes that will be visually verified
[list]
```

Show the plan to the user. Ask:

```
AskUserQuestion:
  question: "Plan looks good?"
  header: "Approval"
  options:
    - label: "Approve, apply in batches with checkpoints (Recommended)"
      description: "I'll apply each batch and pause for your screenshot review before continuing."
    - label: "Approve, apply all at once (no checkpoints)"
      description: "Faster but riskier — you only see the final result."
    - label: "Skip specific batches"
      description: "Tell me which batches to skip; rest applies normally."
    - label: "Cancel — go back to Phase 2 (different palette)"
```

---

## Phase 4 — Apply in batches with checkpoints

For each batch in the order from the plan (tokens FIRST, then in dependency order):

### 4a. Spawn redesign-applier in apply mode

```
Agent:
  subagent_type: "app-forge-teams:redesign-applier"
  name: "redesign-applier-[batch]"
  team_name: "forge-redesign"
  prompt: |
    Mode: apply
    Batch: [batch]
    Scope paths: [glob]
    Palette: [chosen]
    Design decision file: .forge-redesign/DESIGN_DECISION.md
    Route samples: [list]
```

Wait for `batch_done`.

### 4b. Show before/after to the user (checkpoint)

If `route_samples` were screenshotted:
```
Show the user the screenshot pairs:
  before: .forge-redesign/screenshots/before/[batch]-*.png
  after:  .forge-redesign/screenshots/after/[batch]-*.png
```

Then ask (if checkpoints mode):
```
AskUserQuestion:
  question: "Continue with the next batch?"
  header: "Checkpoint"
  options:
    - label: "Continue (Recommended)"
    - label: "Pause — let me review more before proceeding"
    - label: "Roll back this batch and try a different approach"
      description: "Reverts the most recent commit, restores pre-batch state."
    - label: "Stop here — keep what's been applied"
```

If "Roll back": `git reset --hard HEAD~1` and ask the user what to change.
If "Stop": jump to Phase 5 with a partial-completion report.

### 4c. Move to next batch
Loop until all approved batches are done.

---

## Phase 5 — Verify

### 5a. Full playwright sweep

Spawn `test-runner`:
```
Agent:
  subagent_type: "app-forge-teams:test-runner"
  name: "test-runner"
  team_name: "forge-redesign"
  prompt: "Run full regression. We just refactored visuals — confirm no functional regressions on any route. Note: test-runner's staleness check should NOT skip; force a full run by passing force=true if available, or just remove last_regression_at from forge-state.json before invoking."
```

### 5b. Final report

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-redesign task_done \
  palette=$PALETTE batches_applied=$N regressions=$REGRESSIONS_FOUND
```

Tell the user:
```
**Redesign complete.**

Palette:        [chosen]
Batches applied: [N of N planned]
Files changed:   [N]
Routes verified: [N]
Regressions:     [0 / N — see test-runner report]

Before/after screenshots: .forge-redesign/screenshots/

Files to review:
  - CURRENT_STATE.md       (the diagnosis)
  - DESIGN_DECISION.md     (chosen tokens)
  - REDESIGN_PLAN.md       (what we set out to do)
  - .forge-redesign/[batch]-inventory.md  (what each batch found in scope)

Commits added:
  [git log --oneline since-redesign-start]

Next steps:
  1. Run the dev server and click through key flows
  2. If anything looks off: `/forge:redesign rollback` (or `git reset --hard <commit>`)
  3. To audit for any remaining design-system violations: `/forge:audit`
```

---

## When to STOP this skill

- App isn't Next.js → tell the user, stop
- Tree has uncommitted changes → warn and stop unless user passes `--force`
- User cancels at Phase 2 (palette) or Phase 3 (plan) → don't apply anything
- A batch produces a regression → stop, report, do not continue to next batch
- User picks "Stop here" at any checkpoint → finalize with partial-completion report

## When this skill is NOT the right tool

- App needs new features → use `/forge:build-frontend` instead
- App needs functional bugs fixed → use `/forge:audit` then `/forge:implement`
- App needs the table/search standard applied (not full visual redesign) → use `/forge:smart-table` or `/forge:universal-search`
- App is React but not Next.js → not supported; suggest `/frontend-design-audit:improve` from the other plugin

## Hard rules

- **NEVER change a component's external API** — preserve prop signatures
- **NEVER add new behaviors** — refactor only what's already there
- **ALWAYS apply tokens FIRST** — every other batch depends on the token foundation
- **ALWAYS preserve the build** — if a batch breaks `npm run build`, roll back immediately
- **NEVER mass-rename files** — refactor in place
- **ALWAYS commit per batch** — each batch is its own commit so individual rollback works
