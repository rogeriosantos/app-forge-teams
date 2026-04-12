---
name: universal-search
description: Upgrades every search bar in a Next.js + shadcn/ui application to universal full-text search — multi-field, diacritics-insensitive (José matches "jose"), case-insensitive partial-match, with multi-term AND via "+". Reads EVERY source file without skipping, creates a single shared lib/search.ts utility, then replaces all naive .filter/.includes search predicates. Use this skill whenever the user says "make search bars smarter", "upgrade search", "add diacritics to search", "universal search", "apply universal-search", "search all fields", or wants consistent search behavior across all lists and tables in the app.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Universal Search — Apply to Entire Application

Transform every naive search implementation in the codebase into universal
full-text search: multi-field, diacritics-insensitive, case-insensitive
partial-match, with multi-term AND using the `+` operator.

The UI stays the same — `<Input>` elements, `onChange` handlers, and state
variables are untouched. Only the **filter predicate** changes.

**Critical rule: read EVERY file. Search logic appears in unexpected places —
a `useProducts` hook or a `utils/filter.ts` is just as likely to contain a
naive `.includes()` as a component named `search-bar.tsx`.**

---

## Phase 1 — Full codebase enumeration

### 1a. Discover all source files

```bash
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  | grep -v node_modules \
  | grep -v ".next" \
  | grep -v "dist" \
  | grep -v ".git" \
  | sort
```

Read every file in this list. Do not skip based on directory or filename.

### 1b. Pattern-search for search implementations

Run these to build your hit list:

```bash
# State variables for search (the most reliable signal)
grep -rn "useState.*[Ss]earch\|useState.*[Qq]uery\|useState.*[Ff]ilter" \
  --include="*.tsx" --include="*.ts" . | grep -v node_modules

# Naive filter predicates — the primary target to replace
grep -rn "\.filter.*\.includes\|\.filter.*\.toLowerCase\|\.filter.*\.toUpperCase" \
  --include="*.tsx" --include="*.ts" . | grep -v node_modules

# useMemo that filters on a search value
grep -rn "useMemo.*filter\|filtered.*useMemo" \
  --include="*.tsx" --include="*.ts" . | grep -v node_modules

# Search input UI elements (to confirm which files have search bars)
grep -rni 'placeholder.*search\|placeholder.*pesquisar\|placeholder.*buscar\|type="search"' \
  --include="*.tsx" --include="*.jsx" . | grep -v node_modules

# Custom per-field OR chains (multi-field manual patterns)
grep -rn "includes(search\|includes(query\|includes(filter\|includes(term" \
  --include="*.tsx" --include="*.ts" . | grep -v node_modules
```

Build a deduplicated inventory table (file + search variable + current filter pattern):

| File | Search state var | Current filter | Approx. fields covered |
|------|-----------------|----------------|------------------------|

This is your transform list.

---

## Phase 2 — Create the shared search utility

### 2a. Create `lib/search.ts` (shared search utilities)

Copy the canonical search template from the plugin's shared templates directory:
`skills/shared/templates/search.ts` → project's `lib/search.ts`

If `lib/search.ts` already exists and has `normalize` + `matchesSearch` with the NFD implementation, `+` operator, and auto-field-discovery, skip creation and go to Phase 3.

If `lib/combobox-search.ts` or `lib/smart-table-utils.ts` already export their own `normalize`, update them to import from `lib/search.ts` instead:
```typescript
// In lib/combobox-search.ts — replace local normalize with import
export { normalize, matchesComboboxSearch } from './search';

// In lib/smart-table-utils.ts — replace local normalize with import
export { normalize, rowMatchesSearch } from './search';
```

---

## Phase 3 — Replace every search implementation

Work through the inventory list from Phase 1, one file at a time.
**Read each file completely before editing it.**

### For each file in the hit list:

1. **Read the full file.** Understand the setup:
   - What is the search state variable? (`search`, `query`, `filter`, `searchTerm`…)
   - What is the data array being filtered? (`items`, `users`, `products`, `rows`…)
   - What does the current filter predicate look like, exactly?
   - Are there other conditions in the same `.filter()` call (status, date, role)?

2. **Identify all searchable fields.** Look at the TypeScript interface or the
   shape of the objects being filtered. Include all user-visible string and number
   fields; exclude opaque IDs, boolean flags, and Date objects:

   ```typescript
   interface Product {
     id: string;        // ❌ skip — internal UUID, not user-visible
     name: string;      // ✅ search
     sku: string;       // ✅ search
     category: string;  // ✅ search
     price: number;     // ✅ search (user types "75" to find price 75)
     isActive: boolean; // ❌ skip — boolean flags don't search as strings usefully
     createdAt: Date;   // ❌ skip — Date objects don't stringify in a user-friendly way
   }
   ```

   When in doubt about a field, include it — auto-discovery is the safe default
   that gives users the most power.

3. **Replace the filter predicate.** Common patterns and their replacements:

   **Single-field naive:**
   ```tsx
   // Before
   const filtered = items.filter(item =>
     item.name.toLowerCase().includes(search.toLowerCase())
   );

   // After — matchesSearch auto-discovers all string/number fields
   const filtered = items.filter(item => matchesSearch(item, search));
   ```

   **Multi-field manual OR chain:**
   ```tsx
   // Before
   const filtered = items.filter(item =>
     item.name.toLowerCase().includes(search.toLowerCase()) ||
     item.email.toLowerCase().includes(search.toLowerCase()) ||
     item.phone.includes(search)
   );

   // After
   const filtered = items.filter(item => matchesSearch(item, search));
   ```

   **Combined search + other filters — preserve non-search conditions:**
   ```tsx
   // Before
   const filtered = items.filter(item =>
     (item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase())) &&
     (statusFilter === 'all' || item.status === statusFilter)
   );

   // After — matchesSearch replaces only the search part
   const filtered = items.filter(item =>
     matchesSearch(item, search) &&
     (statusFilter === 'all' || item.status === statusFilter)
   );
   ```

   **useMemo pattern:**
   ```tsx
   // Before
   const filtered = useMemo(
     () => data.filter(row => row.title.toLowerCase().includes(query.toLowerCase())),
     [data, query]
   );

   // After
   const filtered = useMemo(
     () => data.filter(row => matchesSearch(row, query)),
     [data, query]
   );
   ```

   **Explicit field list (use when you need to exclude internal fields):**
   ```tsx
   // When the object has fields that shouldn't be searched
   const filtered = items.filter(item =>
     matchesSearch(item, search, ['name', 'email', 'department', 'role'])
   );
   ```

4. **Add the import, remove old inline logic.** At the top of the file:
   ```tsx
   import { matchesSearch } from '@/lib/search';
   ```
   Remove any leftover inline normalize helpers, manual `.toLowerCase()` chains,
   or imports from `lodash` / other search libraries that are no longer referenced.

5. **Do not touch the Input component.** The `<Input>` element, its `placeholder`,
   its `onChange`, and the `setSearch` / `setQuery` state setter are untouched.
   Only the data filter predicate changes.

### After all files are processed:

If `lib/combobox-search.ts` exists and its `normalize` is now a duplicate,
update it to import from `lib/search`:

```typescript
// lib/combobox-search.ts — update top of file
import { normalize } from './search';
// Remove the local normalize function definition
```

This keeps a single source of truth for normalization without touching any
other file.

---

## Phase 4 — Verify

```bash
# 1. TypeScript: zero errors
cd frontend && npx tsc --noEmit 2>&1 | head -50

# 2. Build: must succeed
npm run build 2>&1 | tail -30

# 3. Residual naive patterns in filter predicates (should be zero)
grep -rn "\.toLowerCase()\.includes\|\.toUpperCase()\.includes" \
  --include="*.tsx" --include="*.ts" . \
  | grep -v node_modules \
  | grep -v "lib/search.ts" \
  | grep -v "lib/smart-table"
```

If residual `.toLowerCase().includes` hits remain, check each one:
- Inside a `.filter()` on a data array → **must be upgraded** (missed instance)
- Inside something else (highlight rendering, autocomplete suggestion, validation
  logic, test fixture) → acceptable, note in report

---

## Phase 5 — Report

```
Universal search upgrade complete.

Files scanned: N
Files modified: N
Search bars upgraded: N

New files created:
  ✅ lib/search.ts

Modified files:
  ✅ app/products/page.tsx          (1 search — auto-discovers name+sku+category+price)
  ✅ app/users/page.tsx             (1 search — name+email+role; preserved status filter)
  ✅ components/order-list.tsx      (1 search — auto-discovers all fields)
  ✅ hooks/use-filtered-data.ts     (1 search — shared hook, now uses matchesSearch)
  ...

Deduplication update:
  ✅ lib/combobox-search.ts         (normalize now imported from lib/search)

Build: ✅ pass
TypeScript: ✅ 0 errors
Residual naive .toLowerCase().includes (in filter predicates): ✅ 0
```

---

## Edge cases

- **Server-side search** — If the search bar calls an API to fetch filtered results
  (e.g. `useEffect` + fetch, React Query with `search` as a query param, SWR with
  `search` in the key), do NOT replace it with client-side `matchesSearch`. The
  filtering happens on the server. Note it in the report as
  `"server-side search — skipped"`.

- **Debounced search** — If the file already uses `useDebounce` / `setTimeout` on
  the search value, keep the debounce intact. Only the filter predicate changes.

- **Smart-table pipeline** — If the file uses a `<SmartTable>` or a data pipeline
  (columnFilters → search → sort → paginate), do not duplicate search logic there.
  `SmartTable` manages search internally via `rowMatchesSearch` from
  `lib/smart-table-utils`. Only upgrade standalone `.filter()` calls outside of
  SmartTable.

- **Fuse.js / other fuzzy search libraries** — If the file uses a fuzzy search
  library, replace it with `matchesSearch`. Fuzzy search creates false positives
  ("micro" matching "mario") that this spec explicitly avoids by requiring substring
  match only.

- **Global / context-level search** — If search state is lifted into a React Context
  or Zustand store and the filter runs in a provider, find the `.filter()` in the
  provider/selector and upgrade it there. All consumers automatically get the
  upgraded behavior without further changes.

- **No fields found on object** — If `matchesSearch` is called without `fields` and
  the object has no string or number properties (unusual), it returns `true` (show
  everything). This is the safe default. Pass explicit `fields` if needed.
