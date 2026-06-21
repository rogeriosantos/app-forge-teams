---
name: forge-tests-frontend
description: Generate, run, and fix Playwright E2E tests for a Next.js frontend. Maps all pages, identifies the top critical user flows, writes Playwright specs, runs them in a real browser using MCP Playwright, and iterates until green. Use when the user wants to create frontend tests, test a new page or flow, or validate that the UI works end-to-end.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# forge-tests-frontend — Frontend E2E Test Generator

Spawn the `forge-tests-frontend` agent to map pages, write Playwright specs, run them in a real browser, and iterate until green.

## Step 1 — Verify dev server

Check the app is accessible (Playwright CLI / curl, not MCP):
```bash
curl -sf http://localhost:3000 >/dev/null 2>&1 && echo "up" || echo "down"
```

If it prints `down`, stop and tell the user:
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
4. Prefer semantic locators (getByRole/getByLabel/getByText); when you must inspect the DOM, use `npx playwright codegen <url>` or a one-off Playwright CLI script — never MCP
5. Write Playwright specs in frontend/tests/e2e/
6. Run: npx playwright test tests/e2e/ --reporter=list
7. Fix all failures using the Playwright CLI (`npx playwright test --trace on`, then `npx playwright show-trace`) — iterate until green
8. Take screenshots as evidence for each passing flow
9. Report final results

Do NOT guess selectors — prefer semantic locators, or inspect the DOM with the Playwright CLI (codegen/trace), never MCP.
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
