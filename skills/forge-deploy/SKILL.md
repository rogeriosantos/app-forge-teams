---
name: forge-deploy
description: Deploy the application to production. Deploys the Next.js frontend to Vercel and the FastAPI backend to Railway or Render, sets up production environment variables, runs a post-deploy smoke test with Playwright, and updates forge-state.json to phase "deployed".
allowed-tools: Read, Write, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_console_messages, mcp__playwright__browser_wait_for
---

# forge:deploy — Deploy to Production

Read `forge-state.json`. If phase is not `integration-review` or `deployed`, tell the user:
> Run `/forge:build` and `/forge:approve` first to complete both build phases before deploying.

---

## Step 1 — Confirm environment variables are documented

Check that both example files exist:
```bash
[ -f frontend/.env.local.example ] && echo "✅ frontend .env.local.example" || echo "❌ missing"
[ -f backend/.env.example ]        && echo "✅ backend .env.example"        || echo "❌ missing"
```

Show the user the list of required env vars from both files and ask:
> These environment variables need to be set in your deployment platforms. Have you configured them? (yes/no)

Do not proceed until confirmed.

---

## Step 2 — Deploy frontend to Vercel

Check if the Vercel CLI is available:
```bash
vercel --version 2>/dev/null || echo "not installed"
```

**If Vercel CLI is available:**
```bash
cd frontend && vercel --prod --yes 2>&1
```
Capture the deployment URL from the output (format: `https://[app].vercel.app`).

**If not available:**
```bash
# Check if vercel is in package.json devDependencies
grep -i vercel frontend/package.json 2>/dev/null || true
```

If no Vercel CLI and no vercel in package.json, tell the user:
> Install the Vercel CLI with `npm i -g vercel` and run `vercel login`, then re-run `/forge:deploy`.

Store the frontend URL for Step 4.

---

## Step 3 — Deploy backend

Read `forge-context.md` to find the backend deployment target (Railway or Render).

**Railway:**
```bash
railway --version 2>/dev/null && railway up 2>&1 || echo "Railway CLI not found"
```

**Render:**
```bash
# Render deploys via GitHub push — verify the remote is configured
git remote -v | grep render || echo "No Render remote configured"
```

If neither CLI is available, tell the user:
> Backend deployment requires either the Railway CLI (`npm i -g @railway/cli`) or a Render service connected to your GitHub repo. Configure one and re-run.

Store the backend URL for Step 4.

---

## Step 4 — Post-deploy smoke test with Playwright

Wait 30 seconds for deployments to stabilize:
```bash
sleep 30
```

**Frontend smoke test:**
1. `mcp__playwright__browser_navigate` → the Vercel deployment URL
2. `mcp__playwright__browser_wait_for` → wait for page to fully load
3. `mcp__playwright__browser_take_screenshot` — capture initial state
4. `mcp__playwright__browser_console_messages` — check for errors

**Backend health check:**
```bash
curl -s --max-time 10 "[backend-url]/health" | python3 -m json.tool 2>/dev/null || echo "health check failed"
```

If the frontend has console errors or the backend health check fails:
> ⚠️ Deployment issues detected:
> [list issues]
> The app is deployed but may not be fully functional. Check the logs on your deployment platform.

---

## Step 5 — Update state and report

Update `forge-state.json`:
```json
{
  "phase": "deployed",
  "deployment": {
    "frontend_url": "[vercel url]",
    "backend_url": "[railway/render url]",
    "deployed_at": "[ISO timestamp]"
  }
}
```

Tell the user:
> **Deployed.**
>
> Frontend: [vercel URL]
> Backend:  [backend URL]
>
> Smoke test: [✅ passed / ⚠️ N issues found — see above]
>
> Next steps:
> - Set up a custom domain in your Vercel and Railway/Render dashboards
> - Configure production secrets (not just .env.example values)
> - Run `/forge:audit` on the live app if you want a final quality check
