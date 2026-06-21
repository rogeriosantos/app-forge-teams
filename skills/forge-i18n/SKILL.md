---
name: forge-i18n
description: Internationalize an existing Next.js app — scans every source file for hardcoded user-facing strings, sets up next-intl with cookie-based locale detection (NO `/en` `/de` URL prefixes), extracts strings into a message catalog, generates AI translations for chosen target languages, and adds a Language switcher to /settings or /profile (creates a stub if neither exists). Locale persists via user profile (if backend), cookie (for SSR), and localStorage (for instant UI). Six-phase pipeline with checkpoints. Works on ANY Next.js app, not just forge-built. Use when the user says "internationalize", "add i18n", "translate the app", "add translations", "support multiple languages", "set up next-intl", "make the app multilingual", or "extract hardcoded strings to translation files".
argument-hint: "[optional path to app, default current dir]"
allowed-tools: Read, Write, Edit, Bash, Agent, TeamCreate, TaskCreate, TaskUpdate, TaskList, SendMessage, AskUserQuestion
---

# forge:i18n — Internationalize an existing Next.js app

You are the **i18n Lead** (`forge-i18n-lead`). Your job is to take an existing Next.js application that has hardcoded English strings everywhere and migrate it to a working `next-intl` setup with **cookie-based locale detection (no URL prefix)** and a Language switcher in the user's profile/settings.

You orchestrate. Per-file extraction is done by `i18n-extractor` agents (one per namespace batch).

---

## Phase 0 — Detect environment

```bash
TARGET="${1:-$(pwd)}"
cd "$TARGET"
```

Determine:
- Is this a Next.js app? (`package.json` mentions `"next"`)
- Is `next-intl` already installed? (`grep "next-intl" package.json`)
- If installed, is it routing-based or routing-less? (`ls src/app/[locale]` exists → routing-based)
- Is there an existing `/settings` or `/profile` route? (`find src/app app -type d -name settings -o -name profile`)
- Is `forge-state.json` present? → Forge mode (log to ledger)
- Are there uncommitted changes? → warn, stop unless `--force`

If not a Next.js app, tell the user this skill is Next.js-specific and stop.

If forge mode:
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-i18n spawn child=team phase=i18n
```

---

## Phase 1 — Audit hardcoded strings

```bash
mkdir -p .forge-i18n
```

### 1a. Scan for JSX text strings (likely candidates)
```bash
# Strings between JSX tags, not in className/id/etc.
grep -rEn '>[^<>{}\n]{3,}<' \
  --include="*.tsx" --include="*.jsx" --include="*.mdx" \
  src/ app/ components/ 2>/dev/null \
  | grep -v "test\.tsx" | grep -v "spec\.tsx" \
  > .forge-i18n/jsx-text-candidates.txt
```

### 1b. Scan for translatable JSX attributes
```bash
grep -rEn '(title|placeholder|aria-label|aria-describedby|alt|label)="[^"]+"' \
  --include="*.tsx" --include="*.jsx" \
  src/ app/ components/ 2>/dev/null \
  | grep -v "test\.tsx" | grep -v "spec\.tsx" \
  > .forge-i18n/jsx-attr-candidates.txt
```

### 1c. Scan for toast/error messages
```bash
grep -rEn '(toast|setError|setMessage|Alert|notify)\.(success|error|warning|info|message)\(.{1,3}["`]' \
  --include="*.tsx" --include="*.ts" \
  src/ app/ components/ 2>/dev/null \
  > .forge-i18n/toast-candidates.txt

grep -rEn '\b(setError|setMessage|setNotification)\(\s*["`][^"`]+' \
  --include="*.tsx" --include="*.ts" \
  src/ app/ components/ 2>/dev/null \
  >> .forge-i18n/toast-candidates.txt
```

### 1d. Existing t() usage (already-i18n'd parts to skip)
```bash
grep -rEn "t\\(['\"][a-z][a-z._]+['\"]" \
  --include="*.tsx" --include="*.ts" \
  src/ app/ components/ 2>/dev/null \
  > .forge-i18n/existing-t-calls.txt
```

### 1e. Detect interpolations and plurals (need user attention)
```bash
# Template literals or JSX with embedded expressions
grep -rEn '>{[^}]+\$\{|>{`[^`]+\$\{|>{[^}]+\?\s*' \
  --include="*.tsx" --include="*.jsx" \
  src/ app/ components/ 2>/dev/null \
  > .forge-i18n/interpolations-flagged.txt

# Likely plural patterns: {count} item, {n} result, etc.
grep -rEn '>\{[a-zA-Z]+\}\s+(item|result|message|notification|user|file|task|comment|view|like|follower)s?<' \
  --include="*.tsx" --include="*.jsx" \
  src/ app/ components/ 2>/dev/null \
  > .forge-i18n/plurals-flagged.txt
```

### 1f. Write I18N_AUDIT.md

```markdown
# i18n Audit — [app name]

**Date:** [today]
**Files scanned:** [N]

## Counts
- JSX text candidates: [N]
- JSX attribute candidates: [N]
- Toast/error message candidates: [N]
- Existing t() calls: [N]  (already i18n'd, will be left alone)
- Flagged interpolations: [N]  (need user review)
- Flagged plurals: [N]  (need user review)

## Suggested namespaces (based on directory structure)
- `auth` (src/app/(auth)/* — N strings)
- `dashboard` (src/app/dashboard/* — N strings)
- `common` (src/components/* — N strings)
- ...

## Existing i18n state
- next-intl installed: [yes/no]
- Routing mode: [none / [locale] segment]
- Existing message catalog: [path or "none"]
- Existing translations: [list of locales found]

## Settings/profile route
- /settings exists: [yes/no, path]
- /profile exists: [yes/no, path]
- Recommendation: add Language switcher to [chosen route, or "create stub /settings"]

## Recommendation
Estimated effort: [N] namespace batches, ~[N] strings total.
Top 3 namespaces to extract first: [list]
```

Show this to the user.

---

## Phase 2 — Setup infrastructure

### 2a. Detect existing next-intl mode

If `next-intl` is **already installed AND in routing-less mode** (no `[locale]` segment), skip to Phase 3.

If `next-intl` is **already installed AND in routing-based mode** (has `[locale]` segment), tell the user:
> Your app currently uses URL-based locales (`/en/...`). Migrating to cookie-based requires removing the `[locale]` segment and re-routing all pages. This is a significant refactor — recommend doing it in a separate PR before running this skill.
>
> Continue anyway (will leave routing-based intact, but the cookie-based switcher won't work as you expected)? (yes/no)

If user says no → stop.

### 2b. Install next-intl (if not installed)
```bash
npm install next-intl
```

### 2c. Create message catalog scaffold
```bash
mkdir -p messages
[ ! -f messages/en.json ] && echo '{}' > messages/en.json
```

### 2d. Create the i18n request config

Write `src/i18n/request.ts` (or `i18n.ts` at root, depending on project structure):

```typescript
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

const SUPPORTED_LOCALES = [/* filled in Phase 3 */];
const DEFAULT_LOCALE = 'en';
const COOKIE_NAME = 'NEXT_LOCALE';

async function detectLocale(): Promise<string> {
  // 1. Cookie wins
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(COOKIE_NAME)?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) return cookieLocale;

  // 2. Accept-Language header
  const acceptLanguage = (await headers()).get('accept-language') ?? '';
  const preferred = acceptLanguage
    .split(',')
    .map(s => s.split(';')[0].trim().toLowerCase().split('-')[0])
    .find(l => SUPPORTED_LOCALES.includes(l));
  if (preferred) return preferred;

  // 3. Fallback
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await detectLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

### 2e. Wire `NextIntlClientProvider` into the root layout

Edit `src/app/layout.tsx` (or `app/layout.tsx`):

```typescript
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Preserve any existing layout content; only add the provider wrapping `{children}`.

### 2f. Update `next.config.{js,ts}` to wire next-intl plugin

```javascript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = { /* existing config */ };

export default withNextIntl(nextConfig);
```

### 2g. Create the locale-switcher action (server action)

Write `src/lib/i18n/set-locale.ts`:

```typescript
'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function setLocale(locale: string) {
  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  });
  revalidatePath('/');
}
```

### 2h. (Forge mode only) Add `preferred_language` to user model

If `forge-state.json` exists AND `backend/` exists:

- Add `preferred_language` (varchar(10), default 'en') column to the `users` table
- Generate Alembic migration
- Add to `UserResponse` schema
- Add `PATCH /users/me/preferred-language` endpoint

Spawn a `backend-builder` for this if it's a non-trivial change. Otherwise do it inline.

### 2i. Log progress
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-i18n task_started phase=setup
```

---

## Phase 3 — Choose locales

Use AskUserQuestion to confirm the source locale and target locales:

```
AskUserQuestion:
  question: "Which target languages should we add? (English is always the source.)"
  header: "Languages"
  multiSelect: true
  options:
    - label: "Spanish (es)"
      description: "~500M speakers worldwide; covers Latin America + Spain"
    - label: "Portuguese (pt)"
      description: "~250M speakers; Brazil + Portugal. Add 'pt-BR' separately if needed"
    - label: "French (fr)"
      description: "~280M speakers; France + francophone Africa + Canada"
    - label: "German (de)"
      description: "~95M speakers; DACH region"
```

```
AskUserQuestion:
  question: "Any additional languages?"
  header: "More languages"
  multiSelect: true
  options:
    - label: "Italian (it)"
    - label: "Japanese (ja)"
    - label: "Korean (ko)"
    - label: "None — keep just the ones above"
```

For each chosen locale, create an empty `messages/[locale].json`:
```bash
for L in es pt fr de; do
  [ ! -f "messages/$L.json" ] && echo '{}' > "messages/$L.json"
done
```

Update `SUPPORTED_LOCALES` in `src/i18n/request.ts` with the chosen set.

Save `.forge-i18n/I18N_DECISION.md` with the chosen locales + total target string count.

---

## Phase 4 — Plan (proposals)

Spawn `i18n-extractor` in **propose mode** for each namespace batch from the audit. Run in parallel (max 4):

```
For each namespace in [auth, dashboard, common, settings, ...]:
  Agent:
    subagent_type: "app-forge-teams:i18n-extractor"
    name: "i18n-extractor-[namespace]"
    team_name: "forge-i18n"
    prompt: |
      Mode: propose
      Scope paths: [glob for that namespace]
      Namespace: [namespace]
      Messages path: messages/en.json
      Source locale: en
```

Aggregate proposed changes into `I18N_PLAN.md`. Show the user. Ask:

```
AskUserQuestion:
  question: "Proceed with extraction?"
  header: "Approve"
  options:
    - label: "Yes — extract all namespaces with checkpoints (Recommended)"
    - label: "Yes — extract all namespaces, no checkpoints (faster)"
    - label: "Skip specific namespaces"
    - label: "Cancel"
```

---

## Phase 5 — Extract & translate (in batches)

### 5a. Per namespace, in apply mode

For each approved namespace, spawn `i18n-extractor` in apply mode. Wait for `batch_done`.

If checkpoints mode:
```
AskUserQuestion:
  question: "Continue with the next namespace?"
  header: "Checkpoint"
  options:
    - label: "Continue"
    - label: "Pause to review messages/en.json before continuing"
    - label: "Roll back this namespace"
    - label: "Stop here"
```

### 5b. After all namespaces done, generate translations

Read `messages/en.json` — that's now populated with every extracted English string.

For each target locale, generate translations using the LLM. Be efficient: batch keys per call (~50 keys at a time). The prompt to the LLM:

> Translate the following English UI strings to [locale]. Preserve any `{variable}` placeholders exactly. Preserve any HTML tags. Keep the same JSON structure. Output ONLY valid JSON, nothing else.
>
> ```json
> [the en.json subtree]
> ```

Validate the output is valid JSON, write to `messages/[locale].json`.

For every translated string, also add a sibling metadata key `_ai_translated: true` so the user knows which strings need professional review:

```json
{
  "_meta": {
    "ai_translated": true,
    "translated_at": "2026-05-09T12:34:56Z",
    "review_needed": true
  },
  "auth": {
    "login": {
      "welcome": "Bienvenido de vuelta",
      ...
    }
  }
}
```

### 5c. Log per-batch
```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-i18n task_done \
  phase=extract namespace=$NS strings=$N flagged=$FLAGGED
```

---

## Phase 6 — Wire the language switcher

### 6a. Determine where the switcher goes

Priority order:
1. If `/profile` route exists → add to `src/app/profile/page.tsx`
2. Else if `/settings` route exists → add to `src/app/settings/page.tsx`
3. Else → create `src/app/settings/page.tsx` as a stub

### 6b. Create the LanguageSwitcher component

Write `src/components/language-switcher.tsx`:

```typescript
'use client';
import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { setLocale } from '@/lib/i18n/set-locale';
import { useRouter } from 'next/navigation';

const SUPPORTED = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  // ...filled by orchestrator with chosen locales
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('settings');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleChange = (newLocale: string) => {
    startTransition(async () => {
      // Persist for instant UI on next visit
      try { localStorage.setItem('NEXT_LOCALE', newLocale); } catch {}
      // Persist for SSR
      await setLocale(newLocale);
      // (forge mode) Sync to user profile
      try {
        await fetch('/api/users/me/preferred-language', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferred_language: newLocale }),
        });
      } catch {}
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t('language_label')}</label>
      <select
        value={locale}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        className="h-12 px-4 rounded-[10px] border border-[var(--color-divider)] focus:ring-2 focus:ring-[var(--color-primary)]"
      >
        {SUPPORTED.map(({ code, label }) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
    </div>
  );
}
```

### 6c. Add to the chosen page

Edit (or create) the target page to include `<LanguageSwitcher />` in a "Preferences" or "Account" section.

If creating a stub `/settings` page, follow `${CLAUDE_PLUGIN_ROOT}/references/_shared/apple-design-system.md` page-layout recipe.

### 6d. Add the strings used by the switcher

Add to `messages/en.json` under `settings`:
```json
{
  "settings": {
    "language_label": "Language",
    "language_changed": "Language updated"
  }
}
```

Translate to all chosen locales.

---

## Phase 7 — Verify

### 7a. Build check
```bash
cd "$TARGET" && npx tsc --noEmit && npm run build 2>&1 | tail -20
```

If build fails, roll back the most recent batch and stop.

### 7b. Playwright sweep — switch locales and confirm strings change

Pick 2 target locales (e.g. en + the first chosen target like es). For each route in `route_samples`:

1. Set cookie `NEXT_LOCALE=en`, navigate, screenshot
2. Set cookie `NEXT_LOCALE=es`, navigate to same route, screenshot
3. If the screenshots are visually identical (heuristic check), the i18n didn't take effect → flag as regression

### 7c. Final report

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/forge-log.sh forge-i18n task_done \
  locales=$LOCALES strings=$TOTAL flagged=$FLAGGED
```

Tell the user:
```
**i18n complete.**

Locales:        en (source) + [chosen targets]
Strings extracted: [N]
Files modified:    [N]
Translations:      [N] AI-generated, marked for review

Flagged for human review:
  - [N] interpolations  (search messages/*.json for `_review_interpolation_*`)
  - [N] plurals         (search for `_review_plural_*` — convert to ICU manually)
  - [N] formatting      (search for `_review_format_*`)
  - [N] AI translations (every non-en file marked `_ai_translated: true`)

Files added:
  - messages/en.json + [N other locale files]
  - src/i18n/request.ts
  - src/lib/i18n/set-locale.ts
  - src/components/language-switcher.tsx
  - src/app/settings/page.tsx  [if stub was created]

Next steps:
  1. Visit /settings (or /profile) and try the language switcher
  2. Review messages/[locale].json — fix _review_* markers and verify AI translations
  3. Commit messages/* to source control (translation work is project state)
  4. Optional: integrate with a translation management service (Crowdin, Lokalise, etc.) for ongoing updates
```

---

## When to STOP

- Not a Next.js app
- Tree has uncommitted changes (warn, ask for `--force`)
- Existing routing-based next-intl detected and user declines migration
- Build fails after a batch — roll back, stop
- User cancels at any AskUserQuestion checkpoint

## When forge:i18n is NOT the right tool

- App needs new features → `/forge:build-frontend`
- Just want to translate a few strings manually → edit `messages/[locale].json` directly
- Want URL-based routing (`/en/...`) → out of scope; this skill is opinionated to cookie-based
- App is React but not Next.js → not supported

## Hard rules

- **NEVER use URL-based routing** — this skill is opinionated to cookie-based locales
- **NEVER auto-translate to ICU plural syntax** — flag for user review
- **ALWAYS preserve `{variable}` interpolations exactly** in translations
- **ALWAYS mark AI translations** with `_ai_translated: true` and `review_needed: true`
- **NEVER overwrite a translator's existing translations** — only fill blanks
