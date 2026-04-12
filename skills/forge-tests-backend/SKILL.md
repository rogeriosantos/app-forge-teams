---
name: forge-tests-backend
description: Generate, run, and fix pytest smoke and integration tests for a FastAPI backend. Scans all routes, detects coverage gaps, writes tests (including NULL field edge cases), runs them, and iterates until green. Use when the user wants to create backend tests, improve test coverage, or validate a schema or endpoint change.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# forge-tests-backend — Backend Test Generator

Spawn the `forge-tests-backend` agent to scan, write, run, and fix backend tests.

## Step 1 — Identify project root

```bash
pwd
find . -name "pyproject.toml" | head -3
find . -name "main.py" -path "*/backend/*" | head -3
```

Determine the backend root path (usually `./backend` or `.`).

## Step 2 — Spawn the agent

Use the Agent tool with:
- `subagent_type`: `app-forge-teams:forge-tests-backend`
- `description`: "Generate and run backend pytest tests"
- `prompt`: Pass the following context:

```
Project root: [absolute path from pwd]
Backend path: [backend root, e.g. ./backend]
Tech stack: Python 3.12, FastAPI, UV, SQLAlchemy 2.0, Pydantic v2, pytest

Your mission:
1. Scan all FastAPI routes and identify endpoints
2. Check tests/smoke/ for coverage gaps
3. Set up conftest.py with TestClient if missing
4. Write smoke tests for every uncovered endpoint (happy path, 422, 404, NULL fields)
5. Write integration tests for create→read→update→delete sequences
6. Run: uv run pytest tests/smoke/ -v
7. Fix all failures — iterate until exit code 0
8. Report final coverage summary

Do NOT stop while tests are failing.
```

## Step 3 — Report to user

When the agent completes, summarise:
- How many endpoints were found
- How many tests were written
- Final pytest result (pass/fail counts)
- Any coverage gaps that couldn't be automated (e.g., require real DB or external services)
