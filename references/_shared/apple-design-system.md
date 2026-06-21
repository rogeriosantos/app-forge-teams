# Apple HIG Design System — Forge Reference

> **You are reading this because you are about to build or modify a UI surface.**
> Read it once, work from it, and verify your output against the checklist at the end before committing.

---

## Why these rules exist

The forge produces apps that should feel **inevitable** — as if no other design was ever possible. That feeling comes from a small set of disciplines, applied without compromise:

1. **Restraint over decoration.** Every removed pixel makes the remaining pixels louder. Most "polish" requests are actually requests to remove things.
2. **Type carries the interface, not chrome.** Borders, dividers, gradients, and color blocks are crutches. Use them sparingly; let typography and spacing do the work.
3. **The 8px grid is a contract.** It's not a style preference — it's the substrate that makes layouts feel unified. Breaking it produces "broken, unprofessional" UI even when individual elements look fine.
4. **Color is expressive, not decorative.** Color signals state and creates warmth. Using all your accent colors at once is the visual equivalent of yelling.
5. **Spacing communicates relationships.** Related items cluster; unrelated items separate. The ratio matters more than the absolute values.

When a rule below feels arbitrary, it isn't — it's enforcing one of these five disciplines. If you find yourself wanting to deviate, **the deviation needs a written justification in the commit message**.

---

## Color palette — pick ONCE per app

> **At app scaffold time, choose ONE primary/secondary pair from the table below.**
> The same pair must be used everywhere across the app. Do not introduce additional accents per page.
> Document the choice in `frontend/DESIGN.md` so reviewers and future builders see it.

| Style  | Primary              | Secondary         | Vibe                         |
| ------ | -------------------- | ----------------- | ---------------------------- |
| Ocean  | `#007AFF` (blue)     | `#5AC8FA` (sky)   | Trust, clarity, professional |
| Coral  | `#FF6B6B` (coral)    | `#FF9F43` (amber) | Warm, energetic, creative    |
| Forest | `#34C759` (green)    | `#30D158` (mint)  | Growth, health, natural      |
| Violet | `#AF52DE` (purple)   | `#5E5CE6` (indigo)| Premium, creative, modern    |
| Sunset | `#FF5733` (red-orange)| `#FFC300` (gold) | Bold, dynamic, attention     |
| Teal   | `#00C7BE` (teal)     | `#64D2FF` (cyan)  | Fresh, modern, tech          |
| Rose   | `#FF2D55` (pink)     | `#BF5AF2` (magenta)| Playful, bold, lifestyle    |

Semantic colors are fixed across all apps:
- **Success**: `#34C759` (green)
- **Warning**: `#FF9F0A` (amber)
- **Destructive**: `#FF3B30` (red)
- **Info**: `#007AFF` (blue)

---

## 1. Radical simplicity

- Remove until it breaks, then add back ONE thing.
- Every element earns its pixels — if it doesn't serve the user's immediate goal, delete it.
- Progressive disclosure: show what's needed NOW, reveal complexity on demand.
- One primary action per screen. Everything else is secondary or tertiary.
- When in doubt, remove it.

## 2. Typography as UI

- Type IS the interface — it carries hierarchy, not decorative elements.
- Single font family (SF Pro, Inter, or system font stack).
- Hierarchy by weight and size, NOT color or decoration.
- **Maximum 3 font sizes per view** (title, body, caption).
- Line height: 1.4–1.6 for body, 1.1–1.2 for headings.
- Letter-spacing: slightly tight for headings (`-0.02em`), default for body.

## 3. Spacing & layout — HARD MINIMUMS

All spacing is multiples of 8px: `8, 16, 24, 32, 48, 64, 80`. **No 5px, 10px, 15px. Ever.**

### Containers
| Where | Minimum | Preferred |
|---|---|---|
| Page padding (mobile) | 24px | — |
| Page padding (desktop) | 32px | — |
| Content max-width (reading) | — | 680px |
| Content max-width (dashboard) | — | 1200px |
| Between major sections | 48px | 64px |
| Between section heading and content | — | 24px |

### Cards
| Where | Minimum | Preferred |
|---|---|---|
| Gap between cards in grid/list | **16px** | 24px |
| Internal padding | **20px** | 24px |
| Between card title and body | 8px | — |
| Between card body and footer | — | 16px |

> **Cards with 0 gap or 0 internal padding are unacceptable.** Content must NEVER touch card edges.

### Forms
| Where | Minimum |
|---|---|
| Label → input | 8px |
| Input → input (stacked) | 24px |
| Button group (horizontal) | 12px between buttons |
| Button group (stacked) | 16px between buttons |
| Icon → adjacent text | 8px |
| Below h1/h2 | 24px |
| Below h3/h4 | 16px |

### Proximity rule
- Related items: 8–16px gaps.
- Unrelated items: 32px+ gaps.
- Ratio between "related gap" and "unrelated gap" must be **at least 1:2**.

## 4. Color usage rules

- **Primary accent appears in MAX 3 places per screen**: primary CTA, active nav item, one highlight (toggle, progress bar, selected state).
- **Secondary accent** is for differentiation: category pills, tags, secondary buttons, chart series, avatars.
- **Tinted backgrounds** (accent at 5–8% opacity) for selected rows, active cards, highlighted sections — never a hard colored block.
- **Gradients** only on hero sections, headers, illustrations — never on standard buttons. Two adjacent palette colors at 135°, or accent fading to transparent.
- **Semantic meanings are fixed**: blue = interactive, green = success, amber = warning, red = destructive. Do not override.
- **Text colors**: primary `#1D1D1F`, secondary `#6E6E73`, tertiary `#86868B`. Never pure `#000000`.
- **Surfaces**: base `#FFFFFF`, grouped `#F5F5F7`, elevated `#FBFBFD`. Dividers `#E5E5EA`.

### Dark mode
- Reduce saturation by 10–15%.
- Base bg `#1C1C1E`, elevated `#2C2C2E`, tertiary surface `#3A3A3C`.
- Accents stay vibrant, slightly desaturated if they look harsh.

### Accessibility (non-negotiable)
- WCAG 2.1 AA contrast minimum: 4.5:1 body, 3:1 large text.
- Never rely on color alone — pair with icons, labels, or shape.
- Colored interactive elements need distinct hover/focus/active states beyond color.

## 5. Interaction & motion

- Every interactive element has visible hover, active, and focus states.
- Transitions: 200–300ms ease-out for micro-interactions, 400–500ms for layout shifts.
- Spring animations for entering/leaving (slight overshoot, natural deceleration).
- Touch targets: **minimum 44×44px**. No exceptions.
- No animation without purpose. Movement guides attention, confirms action, or shows relationship.
- Color transitions: 200ms on state changes — never snap.

## 6. Component specs (NON-NEGOTIABLE values)

### Buttons
```
padding: 12px 24px;
min-height: 44px;
border-radius: 10px;
font-size: 15px;     /* 16px preferred */
font-weight: 600;
```
- Horizontal padding NEVER less than 24px.
- Visual hierarchy:
  - **Filled** (primary accent bg, white text) → the ONE primary action
  - **Tinted** (accent at 12% opacity bg, accent text) → secondary actions
  - **Plain** (accent text, no bg) → tertiary actions
  - **Destructive** variant: red filled or tinted, only for irreversible actions

### Cards
```
padding: 24px;       /* 20px minimum */
border-radius: 12px; /* 12–16px */
box-shadow: 0 2px 8px rgba(0,0,0,0.08);
```
- No visible borders — use shadow + background to define edges.
- Feature/highlight cards: thin 3px top-border in accent color.

### Inputs
```
height: 48px;
padding: 0 16px;
border-radius: 10px;
border: 1px solid var(--color-divider);
```
- Labels ABOVE the input (never placeholder-only).
- Focus ring: primary accent, 2px solid + 4px offset glow.

### Tags / badges
```
padding: 4px 12px;
border-radius: 9999px;  /* full pill */
background: accent at 10–15% opacity;
color: accent;
```

### Lists
- Row height: 60px+
- Separators: `1px solid var(--color-divider)`
- Row padding: 16px
- Selected rows: tinted accent background
- Item gap: 0 (with separators) or 8px (card-style)

### Avatars
- Minimum size: 40px
- Vibrant background from palette + white initials when no image

### Modals
- Use sparingly — prefer inline expansion or slide-over panels
- Internal padding: 24px minimum

### Empty states
- Illustrated with accent colors
- Encouraging copy
- Clear primary CTA
- 48px top padding within the empty area

### Navigation
- Never more than 5 top-level items
- Active state: primary accent (filled icon + label, or underline indicator)
- Nav item padding: `12px 16px` minimum

### Progress / charts
- Multi-series order: Primary → Secondary → Success → Info → Warning

## 7. Content & microcopy

- **Headlines**: short, declarative, benefit-oriented.
  ✅ "Your photos, organized" ❌ "Photo Management System"
- **Body**: conversational, human, concise — 8th grade level.
- **Buttons**: verb-first, specific.
  ✅ "Add to Cart" ❌ "Submit"   ✅ "Continue" ❌ "Next"
- **Empty states**: helpful, encouraging, with a clear action.
  ✅ "No projects yet. Create your first one."
- **Errors**: say what happened, why, and what to do — never blame the user.

## 8. Responsive behavior

- Design **mobile-first**, then expand. Never desktop-first then compress.
- Breakpoints: 390px (mobile) · 768px (tablet) · 1024px (desktop) · 1440px (large).
- Touch-first interaction model even on desktop — large targets, clear affordances.
- Stack vertically on mobile; grid on desktop.
- Navigation: bottom tab bar (mobile) → sidebar / top nav (desktop).

## 9. CSS custom properties — the starting point

Every implementation begins with these tokens. Do not invent new ones; extend this set if you must.

```css
:root {
  /* Accent — set per-app from the palette table above */
  --color-primary: #007AFF;
  --color-primary-tint: rgba(0, 122, 255, 0.1);
  --color-secondary: #5AC8FA;
  --color-secondary-tint: rgba(90, 200, 250, 0.1);

  /* Semantic — fixed across all apps */
  --color-success: #34C759;       --color-success-tint: rgba(52, 199, 89, 0.1);
  --color-warning: #FF9F0A;       --color-warning-tint: rgba(255, 159, 10, 0.1);
  --color-destructive: #FF3B30;   --color-destructive-tint: rgba(255, 59, 48, 0.1);
  --color-info: #007AFF;

  /* Text */
  --color-text-primary: #1D1D1F;
  --color-text-secondary: #6E6E73;
  --color-text-tertiary: #86868B;

  /* Surfaces */
  --color-bg-base: #FFFFFF;
  --color-bg-grouped: #F5F5F7;
  --color-bg-elevated: #FBFBFD;
  --color-divider: #E5E5EA;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.10);

  /* Spacing — 8px grid */
  --space-1: 8px;  --space-2: 16px; --space-3: 24px; --space-4: 32px;
  --space-6: 48px; --space-8: 64px; --space-10: 80px;

  /* Radii */
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-full: 9999px;

  /* Motion */
  --ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text-primary: #F5F5F7;
    --color-text-secondary: #98989D;
    --color-text-tertiary: #6E6E73;
    --color-bg-base: #1C1C1E;
    --color-bg-grouped: #2C2C2E;
    --color-bg-elevated: #3A3A3C;
    --color-divider: #38383A;
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.20);
    --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.25);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.30);
  }
}
```

---

## Recipes — copy these for common patterns

These are known-good compositions. Don't rederive them from rules; copy and adapt.

### Form recipe
```tsx
<form className="space-y-6 max-w-md">                {/* 24px between fields */}
  <div className="space-y-2">                        {/* 8px label → input */}
    <label className="text-sm font-medium">Email</label>
    <input className="h-12 px-4 rounded-[10px] border border-[var(--color-divider)]
                      focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1" />
  </div>
  <div className="space-y-2">…</div>
  <div className="flex gap-3 pt-2">                  {/* 12px button gap */}
    <button className="px-6 py-3 min-h-11 rounded-[10px] bg-[var(--color-primary)]
                       text-white font-semibold">
      Continue
    </button>
    <button className="px-6 py-3 min-h-11 rounded-[10px] text-[var(--color-primary)]
                       font-semibold">
      Cancel
    </button>
  </div>
</form>
```

### Card grid recipe
```tsx
<div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* gap-4 = 16px, gap-6 = 24px on desktop */}
  {items.map(item => (
    <article className="p-6 rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]
                        space-y-2">                  {/* 24px padding, 8px between elements */}
      <h3 className="text-lg font-semibold">{item.title}</h3>
      <p className="text-[var(--color-text-secondary)]">{item.description}</p>
    </article>
  ))}
</div>
```

### Empty state recipe
```tsx
<div className="flex flex-col items-center text-center pt-12 pb-8 space-y-4">
  {/* 48px top padding, 16px between elements */}
  <Icon className="w-16 h-16 text-[var(--color-primary)] opacity-60" />
  <h2 className="text-xl font-semibold">No projects yet</h2>
  <p className="text-[var(--color-text-secondary)] max-w-sm">
    Create your first project to start tracking work.
  </p>
  <button className="px-6 py-3 min-h-11 rounded-[10px] bg-[var(--color-primary)]
                     text-white font-semibold mt-2">
    Create project
  </button>
</div>
```

### Page layout recipe
```tsx
<main className="px-6 md:px-8 max-w-[1200px] mx-auto">     {/* page padding + max width */}
  <header className="space-y-2 pt-12 pb-12">               {/* 48px+ before content */}
    <h1 className="text-3xl font-semibold tracking-tight">Page title</h1>
    <p className="text-[var(--color-text-secondary)]">Subtitle that explains the page</p>
  </header>
  <section className="space-y-6 pb-16">                    {/* 64px between sections */}
    <h2 className="text-xl font-semibold">Section heading</h2>
    <div className="space-y-6">…</div>
  </section>
</main>
```

### Selected / active state recipe
```tsx
{/* Tinted background — never a hard colored block */}
<button className={cn(
  "px-4 py-3 rounded-[10px] transition-colors duration-200",
  isActive
    ? "bg-[var(--color-primary-tint)] text-[var(--color-primary)] font-semibold"
    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-grouped)]"
)}>
  {label}
</button>
```

---

## Anti-patterns — never do these

### Spacing
- ❌ Cards with 0 gap between them — always `gap: 16px+`
- ❌ Cards without internal padding — content NEVER touches card edges
- ❌ Buttons with less than 24px horizontal padding — they look broken
- ❌ Any content flush against its container edge
- ❌ `margin: 0` or `gap: 0` between repeating elements
- ❌ Spacing values not on the 8px grid

### Color
- ❌ Pure black (`#000000`) text or backgrounds
- ❌ Rainbow vomit — using ALL accent colors on a single screen
- ❌ Colored text on colored backgrounds without contrast checking
- ❌ Color as the ONLY differentiator (always pair with shape/icon/label)
- ❌ Neon or oversaturated colors — Apple vibrancy, not nightclub vibrancy
- ❌ Gradients on standard buttons (reserve for hero sections only)
- ❌ Drop shadows heavier than `rgba(0,0,0,0.12)` in light mode

### Typography
- ❌ More than one typeface
- ❌ More than 3 font sizes per view
- ❌ Centered body text longer than 2 lines
- ❌ "Click here" or "Learn more" as link text

### Components
- ❌ Hard borders where spacing/shadow/tinted backgrounds would suffice
- ❌ Icons without labels on primary navigation
- ❌ Skeleton loaders that don't match actual content layout
- ❌ Hamburger menus when there are 4 or fewer top-level nav items
- ❌ Carousel/slider as primary content display
- ❌ Auto-playing anything
- ❌ Disabled buttons without explanation — hide them or explain why

---

## Verification checklist — run this before EVERY commit

Before staging UI code, mentally walk through these. If any answer is "no", fix before commit.

**Spacing**
- [ ] All values on the 8px grid? (no 5/10/15)
- [ ] Cards have ≥16px gap and ≥20px internal padding?
- [ ] Buttons have ≥24px horizontal padding and ≥44px height?
- [ ] Inputs are ≥48px tall with 16px horizontal padding?
- [ ] Major sections separated by ≥48px?
- [ ] Related items grouped (8–16px), unrelated items separated (32px+)?
- [ ] No content touching its container edge?

**Color**
- [ ] Using ONLY the chosen primary/secondary pair plus semantic colors?
- [ ] Primary accent appears in ≤3 places per screen?
- [ ] Selected/active states use tinted backgrounds, not hard color blocks?
- [ ] No pure `#000000` anywhere?
- [ ] Contrast verified at WCAG AA (4.5:1 body, 3:1 large)?

**Typography**
- [ ] Single font family used?
- [ ] ≤3 font sizes on this view?
- [ ] Hierarchy by weight/size, not color/decoration?

**Interaction**
- [ ] Every interactive element has visible hover, focus, active states?
- [ ] All touch targets ≥44×44px?
- [ ] Transitions 200–300ms ease-out for micro-interactions?

**States**
- [ ] Loading state implemented (skeleton matching content shape)?
- [ ] Empty state implemented (illustration + copy + CTA, 48px top padding)?
- [ ] Error state implemented (`error.tsx` for the route)?
- [ ] Disabled buttons either hidden or have explanation?

**Content**
- [ ] No "Click here" / "Learn more" / "Submit"?
- [ ] Buttons are verb-first and specific?
- [ ] Errors say what happened + why + what to do?

**Responsive**
- [ ] Mobile layout works at 390px without horizontal scroll?
- [ ] Tested at 200% zoom — nothing breaks?

If you skip this checklist, the reviewer WILL find the violations. Better to catch them yourself.

---

## When you may deviate

The rules above are minimums and norms. Real apps occasionally need to break them. When you do:

1. **State the reason in your commit message** — "Reduced card gap to 12px because three-card layout in a 320px container can't fit otherwise."
2. **Confine the deviation** — don't propagate it across the codebase.
3. **Tell `code-reviewer`** via SendMessage so they don't flag it as a violation.

Deviations without justification are bugs. Deviations with clear reasoning are engineering trade-offs.
