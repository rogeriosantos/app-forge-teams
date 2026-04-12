---
name: forge-tests-frontend
description: Generate, run, and fix Playwright E2E tests for a Next.js frontend. Maps all pages, identifies the top critical user flows, writes Playwright specs, runs them in a real browser using MCP Playwright, and iterates until green. Use when the user wants to create frontend tests, test a new page or flow, or validate that the UI works end-to-end.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_fill_form, mcp__playwright__browser_type, mcp__playwright__browser_wait_for, mcp__playwright__browser_console_messages
---

# forge-tests-frontend — Frontend E2E Test Generator

Spawn the `forge-tests-frontend` agent to map pages, write Playwright specs, run them in a real browser, and iterate until green.

## Step 1 — Verify dev server

Use MCP Playwright to check if the app is accessible:
- Navigate to `http://localhost:3000`
- Take a screenshot

If the page does not load, stop and tell the user:
> "The dev server is not running. Start it with `cd frontend && npm run dev`, then run `/forge-tests-frontend` again."

## Step 2 — Identify project root

```bash
pwd
find . -name "next.config.*" | head -3
find . -path "*/app/page.tsx" | head -3
```

Determine the frontend root (usually `./frontend` or `.`).

## Step 3 — Spawn the agent

Use the Agent tool with:
- `subagent_type`: `app-forge-teams:forge-tests-frontend`
- `description`: "Generate and run Playwright E2E tests for Next.js frontend"
- `prompt`: Pass the following context:

```
Project root: [absolute path from pwd]
Frontend path: [frontend root, e.g. ./frontend]
Base URL: http://localhost:3000
Tech stack: Next.js 16 App Router, TypeScript, shadcn/ui, Tailwind, Playwright

Your mission:
1. Map all pages from app/**/page.tsx
2. Identify top 5 critical user flows (auth, primary CRUD, navigation smoke, key business action, error states)
3. Check for existing playwright.config.ts — create if missing
4. Use MCP Playwright to inspect real DOM BEFORE writing selectors
5. Write Playwright specs in frontend/tests/e2e/
6. Run: npx playwright test tests/e2e/ --reporter=list
7. Fix all failures using MCP Playwright for live debugging — iterate until green
8. Take screenshots as evidence for each passing flow
9. Report final results

Do NOT guess selectors — inspect the actual DOM with MCP Playwright first.
Do NOT stop while specs are failing.
Do NOT try to start the dev server — it must already be running.
```

## Step 4 — Report to user

When the agent completes, summarise:
- Pages mapped
- Flows tested and their pass/fail status
- Final Playwright output
- Any flows that couldn't be automated (e.g., require Stripe test mode, OAuth, email)
- Link to screenshots taken as evidence
