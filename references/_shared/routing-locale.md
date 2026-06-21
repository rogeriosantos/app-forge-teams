# Routing + Locale — Forge Reference

> **You are reading this because you are about to build or modify a route, layout, or locale-aware surface.**
> The rules below override any default scaffolding behavior and any contradictory guidance you may carry from training data.

This reference mirrors the user's global rule at `~/.claude/rules/i18n.md`. Both must agree.

---

## Rule 1 — Locale is NEVER in the URL

The user's language preference belongs in their profile / localStorage / cookie. **It does NOT belong in the URL path.**

### Wrong

```
/pt-BR/dashboard       ❌
/en/residents          ❌
/es/family/feed        ❌
```

### Right

```
/dashboard             ✅
/residents             ✅
/family/feed           ✅
```

### Why

- Forge apps are **auth-gated** — no SEO benefit to locale-prefixed URLs because no search engine sees them.
- Shareable links should be **one canonical URL per resource**. A Brazilian user sending `/pt-BR/dashboard` to an English-speaking colleague is jarring; the recipient's profile decides the language.
- Switching language is a **personal setting**, not a navigation state. Switching language should NOT change the URL.
- `next-intl` supports this directly via `localePrefix: "never"`.

---

## Implementation pattern (next-intl)

### `src/i18n/routing.ts`

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt-BR", "en", "es"],
  defaultLocale: "pt-BR",
  localePrefix: "never",          // ⚠️ MANDATORY
});
```

### `src/i18n/request.ts`

```ts
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { routing } from "./routing";

export default getRequestConfig(async () => {
  // 1. Authenticated user's profile (preferred)
  //    The session lib (e.g. @/lib/auth) exposes the locale set on the user record.
  const session = await tryGetSession();
  if (session?.locale && routing.locales.includes(session.locale)) {
    return { locale: session.locale, messages: await loadMessages(session.locale) };
  }

  // 2. Anonymous user's cookie (set by LocaleSwitcher when they pick)
  const cookieLocale = (await cookies()).get("locale")?.value;
  if (cookieLocale && routing.locales.includes(cookieLocale)) {
    return { locale: cookieLocale, messages: await loadMessages(cookieLocale) };
  }

  // 3. Accept-Language header negotiation
  const accept = (await headers()).get("accept-language") ?? "";
  const negotiated = pickLocale(accept, routing.locales) ?? routing.defaultLocale;
  return { locale: negotiated, messages: await loadMessages(negotiated) };
});
```

### `<LocaleSwitcher>` component

When a user picks a different language:
1. If authenticated → PATCH `/api/me { locale: "en" }` to update the profile (server-side source of truth).
2. Always also `document.cookie = "locale=en; max-age=31536000; path=/"` (so anonymous → returning visit retains the choice).
3. `localStorage.locale = "en"` (for client-side preference hydration).
4. `router.refresh()` to re-render with the new locale.
5. **Do NOT modify the URL** — no `router.push("/en/...")` etc.

### Layout structure

There is **no `[locale]` segment** in the App Router tree. The layout reads the locale from `useLocale()` (client) or `getLocale()` (server) and sets `<html lang>` accordingly:

```tsx
// src/app/layout.tsx
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

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

### Linking

Use the standard `next/link` (or `Link` from `@/i18n/navigation` if you wrap it for type safety). Hrefs do NOT include a locale prefix.

```tsx
// ✅ CORRECT
<Link href="/residents/123">View resident</Link>

// ❌ WRONG
<Link href="/pt-BR/residents/123">View resident</Link>
<Link href={`/${locale}/residents/123`}>View resident</Link>
```

---

## Rule 2 — Translation keys

All user-facing strings via `next-intl`. No hardcoded strings in components.

- pt-BR is canonical; en + es mirror the key tree.
- Keys are dot-notation: `domain.page.element.property`.
- Code identifiers stay English regardless of UI language.

---

## Rule 3 — Existing-project remediation

If you inherit a project that uses `[locale]` segments, schedule a migration:

1. Flip `localePrefix` from `"as-needed"` / `"always"` → `"never"` in `routing.ts`.
2. Move pages out of `src/app/[locale]/...` to `src/app/...` (flatten the tree by one level).
3. Add server-side locale resolution as shown above.
4. Add 301 redirects from old `/[locale]/...` paths to the unprefixed paths (for any bookmarks / external links).
5. Update the `<LocaleSwitcher>` to write profile/cookie + `router.refresh()` — remove any `router.push` that changed the URL.

---

## Exceptions (rare — confirm before assuming)

The ONLY legitimate reason to keep locale in the URL is **public marketing pages with SEO ranking targets** (e.g. a landing page that needs to rank in `google.com.br` vs `google.com`). If you encounter that requirement:

- The marketing pages MAY use `/pt-BR/...` / `/en/...` URLs.
- The app surface (auth-gated) MUST still use unprefixed URLs.
- Raise the requirement explicitly with the user — do NOT assume it.

---

## Verification

Before declaring any frontend feature complete:

- [ ] `routing.ts` has `localePrefix: "never"`
- [ ] No `src/app/[locale]/...` directory exists (or if it does, it's flagged for migration)
- [ ] No `<Link href={\`/${locale}/...\`}>` patterns anywhere in `src/`
- [ ] `<LocaleSwitcher>` updates profile/cookie + refreshes — does not change URL
- [ ] `<html lang={...}>` is set from the resolved locale, not the URL segment
