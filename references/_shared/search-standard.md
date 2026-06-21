# Universal Search Standard — Forge Reference

> **You are reading this because you are about to build, modify, or touch a search bar, filter input, or query field.**
> Every search input across the app must follow the rules below. No per-page exceptions.
>
> For the visual styling of the input itself, see
> [`apple-design-system.md`](./apple-design-system.md) section "Component specs → Inputs".

---

## Why one search standard, everywhere

Users searching "joão" should find "Joao" in any field on any page. Users searching `"micro+75"` should get results that contain both "micro" AND "75" — anywhere. Inconsistent search across pages destroys trust: if /users finds matches but /invoices doesn't, the app feels broken even when both work.

A reusable utility lives at `frontend/lib/search.ts`. **Import from there. Do not re-implement.** If `lib/search.ts` doesn't exist yet (you're early in a build), create it with the reference implementation below.

The canonical template the forge installs is at `skills/shared/templates/search.ts` in this plugin — when in doubt, copy from there. The implementation below is functionally equivalent and slightly more permissive on non-Latin diacritics.

---

## Behavior checklist (every search input)

### 1. Multi-field search
- [ ] Searches ALL visible columns/fields in the table or list
- [ ] Not just `name` or `title` — every field shown to the user
- [ ] Partial match (substring), case-insensitive

### 2. Diacritics-insensitive matching
- [ ] Both query and target are normalized: `NFD` + strip combining marks + lowercase + trim
- [ ] `"joao"` matches `"João"`, `"jose"` matches `"José"`, `"sao paulo"` matches `"São Paulo"`

### 3. Multi-term `+` operator (AND logic)
- [ ] Query `"micro+75"` is split on `+` into terms `["micro", "75"]`
- [ ] ALL terms must match (each can match in any field)
- [ ] Each term applies diacritics-insensitive matching independently

### 4. Edge-case behaviour
- [ ] Empty query → show all results
- [ ] Whitespace trimmed from leading/trailing query and around `+`
- [ ] `+` is reserved as the AND operator only — not searchable as literal
- [ ] Query updates filter the list immediately (debounced ~150–250ms for large lists)

---

## Reference implementation — `frontend/lib/search.ts`

If this file doesn't exist yet, create it as your first step:

```typescript
// lib/search.ts
//
// Universal search utility for forge-built apps.
// All search bars across the application must use these helpers.
// See references/_shared/search-standard.md for the spec.

export function normalize(str: string): string {
  return str
    .normalize('NFD')                  // decompose accents
    .replace(/\p{Diacritic}/gu, '')    // strip combining marks (Unicode property escape)
    .toLowerCase()
    .trim();
}

/**
 * Returns true if `item` matches the search `query`.
 * Query supports the `+` AND operator: "micro+75" requires both terms.
 * Matching is diacritics-insensitive, case-insensitive, partial.
 */
export function matchesSearch(item: Record<string, unknown>, query: string): boolean {
  if (!query.trim()) return true;
  const terms = query.split('+').map(normalize).filter(Boolean);
  const fields = Object.values(item).map((v) => normalize(String(v ?? '')));
  return terms.every((term) => fields.some((field) => field.includes(term)));
}
```

---

## Usage pattern

```tsx
import { matchesSearch } from '@/lib/search';

const [query, setQuery] = useState('');
const filtered = useMemo(
  () => items.filter((item) => matchesSearch(item, query)),
  [items, query]
);

return (
  <>
    <input
      className="h-12 px-4 rounded-[10px] border border-[var(--color-divider)]
                 focus:ring-2 focus:ring-[var(--color-primary)]"
      placeholder="Search…"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
    <SmartTable data={filtered} ... />
  </>
);
```

For large datasets (>500 items), debounce the query state:
```tsx
const debouncedQuery = useDebounce(query, 200);
const filtered = useMemo(() => items.filter(item => matchesSearch(item, debouncedQuery)), [items, debouncedQuery]);
```

---

## Server-side search

If the data is fetched from the backend (large datasets, server-side pagination), the SAME rules apply but enforced server-side:

- Backend implements the same `normalize()` (Python: `unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower().strip()`)
- API accepts a `q` query parameter
- API splits on `+` for AND logic
- Database query uses `unaccent()` (PostgreSQL) or equivalent for diacritics-insensitive matching
- Indexes on commonly searched columns

The frontend search bar UI is identical — only the filtering layer changes. The user shouldn't be able to tell whether filtering is client- or server-side.

---

## Verification before commit

When your issue involves a search input:

1. Did you import from `@/lib/search` (or create it if missing)?
2. Does the search match diacritics? (Test: type "joao" against a "João" record)
3. Does the `+` operator work? (Test: `"micro+75"` against a record with both substrings in different fields)
4. Does empty query show all results?
5. Did you check with playwright that the input actually filters the visible list?
6. If the input is part of a table, does the table reset to page 1 when the filter changes?

Reviewer will check all of the above.
