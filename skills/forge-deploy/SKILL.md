---
name: forge-deploy
description: Deploy the application to production. Deploys the Next.js frontend to Vercel and the FastAPI backend to Railway or Render, sets up production environment variables, runs a post-deploy smoke test with Playwright, and updates forge-state.json to phase "deployed".
allowed-tools: Read, Write, Bash
---

# forge:deploy — Deploy to Production

Read `forge-state.json`. If phase is not `integration-review` or `deployed`, tell the user:
> Run `/forge:build-frontend`, `/forge:approve`, and `/forge:build-backend` first to complete both build phases before deploying.

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

**Frontend smoke test (Playwright CLI, not MCP):** write a one-off Node script and run it:
```bash
cd frontend && npm install --no-save -D playwright >/dev/null 2>&1 && npx playwright install chromium >/dev/null 2>&1
cat > /tmp/forge-smoke.mjs <<'EOF'
import { chromium } from 'playwright';
const url = process.argv[2];
const errors = [];
const b = await chromium.launch();
const p = await b.newPage();
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await p.screenshot({ path: '/tmp/forge-deploy-smoke.png', fullPage: true });
await b.close();
console.log(JSON.stringify({ errors: errors.filter(e => !e.includes('favicon')) }));
EOF
node /tmp/forge-smoke.mjs "[vercel deployment URL]"
```
Then use the **Read tool** on `/tmp/forge-deploy-smoke.png` to confirm the page rendered, and inspect the printed `errors` array.

**Backend health check:**
```bash
HEALTH=$(curl -s --max-time 10 "[backend-url]/health")
if [ -n "$HEALTH" ]; then echo "$HEALTH" | (jq . 2>/dev/null || cat); else echo "health check failed"; fi
```

If the frontend has console errors or the backend health check fails:
> ⚠️ Deployment issues detected:
> [list issues]
> The app is deployed but may not be fully functional. Check the logs on your deployment platform.

---

## Step 5 — Update state, log, and report

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

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-deploy phase_change \
  from=integration-review to=deployed \
  frontend_url=[url] backend_url=[url]
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
