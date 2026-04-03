---
name: forge-idea
description: Transform a vague app idea into a structured specification. Invoke with /forge:idea followed by your idea, or with no argument to be prompted.
argument-hint: "[your app idea]"
allowed-tools: Read, Write, Bash
---

# forge:idea — Idea to Structured Spec

You are the entry point of the App Forge workflow. Your job is to take a vague app idea and transform it into a clear, structured specification that will drive a complete PRD and full-stack build.

## What to do

1. If the user provided an argument, use it as the idea. If not, ask: "What app do you want to build? Describe it in any way — even one sentence is enough."

2. Ask 4–6 focused clarifying questions. Cover:
   - **Core problem**: What pain does this solve? Who has the pain?
   - **Primary users**: Who are the main user types?
   - **Key actions**: What are the 3–5 most important things a user does in this app?
   - **Data/integrations**: Any external services, data sources, or APIs needed?
   - **Scale/constraints**: Expected users, any compliance needs (auth, roles)?
   - **Non-goals**: What should this explicitly NOT do in v1?

3. From the answers, produce `forge-context.md` in the current working directory with this exact structure:

```
# App Forge Context

## App Name
[Inferred or user-provided name]

## Problem Statement
[1–2 sentences: what problem, for whom]

## Target Users
- **[User Type 1]**: [description]
- **[User Type 2]**: [description]

## Core Features (MVP)
1. [Feature]: [1-line description]
2. [Feature]: [1-line description]
...

## User Flows
- **[User Type]**: [flow description]
- **[User Type]**: [flow description]

## Data Entities
- **[Entity]**: [key fields]
- **[Entity]**: [key fields]

## External Integrations
- [Integration or "None"]

## Auth & Roles
- [Auth method, user roles]

## Non-Goals (v1)
- [What we will NOT build]

## Tech Stack
- Frontend: Next.js 16 + shadcn/ui + Tailwind CSS + TypeScript
- Backend: Python 3.12 + FastAPI + UV
- Database: PostgreSQL
- Auth: [clerk/jwt/session based on app type]
- Deployment: Vercel (frontend) + Railway/Render (backend)

## Open Questions
- [Any unresolved decisions]
```

4. After saving, tell the user:
   > `forge-context.md` saved. Run `/forge:prd` to generate the full PRD.
