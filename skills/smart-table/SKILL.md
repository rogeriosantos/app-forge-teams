---
name: smart-table
description: Scans EVERY file in an already-built Next.js app and upgrades all existing tables to SmartTable — adds sortable headers, global diacritics-insensitive search (+ AND), auto-detected column filters, column show/hide via right-click, column resizing, column drag-to-reorder, pagination, localStorage persistence per table, and a reset-to-defaults gear icon. Reads every source file without skipping. Use when the user says "upgrade all tables", "make tables sortable", "add column filters", "add search to tables", "apply smart table", or wants to standardize table UX across an existing application.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# SmartTable — Upgrade All Tables in an Existing Application

Scan the entire codebase, find every table, and upgrade it to a SmartTable with:
- Sortable headers (3-state: asc → desc → none)
- Global search bar with `+` AND operator, diacritics-insensitive
- Auto-detected column filters (dropdown per column with ≤ 20 distinct values)
- Column show/hide via right-click context menu
- Column resizing (drag right edge of header)
- Column drag-to-reorder (HTML5 drag-and-drop)
- Pagination — default 10, options [10, 25, 50, 75, 100]
- localStorage persistence per table (sort, widths, visibility, order, page size)
- Gear icon → reset to defaults with confirmation dialog
- Empty state, loading state, responsive horizontal scroll

**Critical rule: read EVERY file. Never filter files before reading them — tables
appear in pages, components, modals, sidebars, and dialogs alike.**

---

## Phase 1 — Full codebase enumeration

### 1a. List all source files

```bash
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  | grep -v node_modules \
  | grep -v ".next" \
  | grep -v "dist" \
  | grep -v ".git" \
  | sort
```

Read every file in this list. Do not skip files based on name or directory.

### 1b. Pattern-search for existing tables

```bash
# HTML/JSX table elements
grep -rn "<table\b\|<Table\b" . --include="*.tsx" --include="*.jsx" | grep -v node_modules

# shadcn/ui Table component
grep -rn "from.*@/components/ui/table\|from.*components/ui/table" . --include="*.tsx" | grep -v node_modules

# TanStack Table (if already in use)
grep -rn "from.*@tanstack/react-table\|useReactTable" . --include="*.tsx" --include="*.ts" | grep -v node_modules

# DataTable patterns
grep -rn "<DataTable\b\|<SmartTable\b" . --include="*.tsx" | grep -v node_modules
```

Build an inventory: file path, line number, table type found, approximate column count.
This is your transform list.

---

## Phase 2 — Create shared infrastructure

### 2a. Create `lib/search.ts` (shared search utilities)

Copy the canonical search template from the plugin's shared templates directory:
`skills/shared/templates/search.ts` → project's `lib/search.ts`

If `lib/search.ts` already exists and has a `normalize` function with the NFD implementation, skip this step.

### 2b-pre. Create `lib/smart-table-utils.ts`

Copy the canonical table utilities template from the plugin's shared templates directory:
`skills/shared/templates/smart-table-utils.ts` → project's `lib/smart-table-utils.ts`

This file re-exports `normalize` and `rowMatchesSearch` from `lib/search.ts` and adds table-specific utilities: `compareValues`, `keyToLabel`, `TablePrefs`, `loadPrefs`, `savePrefs`, `clearPrefs`.

### 2b. Create `lib/use-debounce.ts` (if missing)

Copy the canonical template from `skills/shared/templates/use-debounce.ts` → project's `lib/use-debounce.ts`.

### 2c. Create `components/ui/smart-table.tsx`

Copy the canonical SmartTable component template from the plugin's shared templates directory:
`skills/shared/templates/smart-table.tsx` → project's `components/ui/smart-table.tsx`

Read the template file, then write it to the project. The component includes:
- Sortable headers (3-state: asc → desc → none)
- Global search with `+` AND operator, diacritics-insensitive
- Auto-detected column filters (dropdown per column with ≤20 distinct values)
- Column show/hide via right-click context menu
- Column resizing (drag right edge)
- Column drag-to-reorder (HTML5 DnD)
- Pagination [10, 25, 50, 75, 100]
- localStorage persistence per table
- Gear icon → reset to defaults
- Loading skeleton and empty state

### Install required shadcn/ui components

```bash
cd frontend
npx shadcn@latest add select 2>/dev/null || true
npx shadcn@latest add badge 2>/dev/null || true
npx shadcn@latest add dropdown-menu 2>/dev/null || true
```

---

## Phase 3 — Replace every table in the inventory

Work through the inventory from Phase 1 one file at a time.
**Read each file completely before editing.**

### For each file:

1. **Read the full file.** Identify:
   - What data drives the table (state, prop, query hook)
   - Existing column definitions (including any `render` logic to preserve)
   - Whether it's inside a form or modal
   - Any existing sort/filter/pagination logic (will be removed — SmartTable handles it)

2. **Choose a unique `tableId`** for localStorage. Convention:
   `page-name-entity` — e.g., `users-list`, `orders-admin`, `products-catalog`

3. **Convert column definitions** to `ColumnDef<T>[]`:
   ```tsx
   const columns: ColumnDef<User>[] = [
     { key: 'name' },
     { key: 'email' },
     { key: 'role', filterable: true },
     { key: 'status', filterable: true,
       render: (v) => <Badge>{String(v)}</Badge> },
     { key: 'created_at', header: 'Joined',
       render: (v) => new Date(String(v)).toLocaleDateString() },
   ];
   ```

4. **Replace the JSX** with SmartTable:
   ```tsx
   import { SmartTable } from '@/components/ui/smart-table';
   
   <SmartTable
     tableId="users-list"
     data={users}
     columns={columns}
     defaultSortKey="created_at"
     defaultSortDir="desc"  // newest first
     isLoading={isLoading}
   />
   ```

5. **Remove orphaned code** — delete any existing sort functions, filter state,
   pagination state, and their JSX that is now handled inside SmartTable.

6. **Update imports** — remove old table component imports that are no longer used.

---

## Phase 4 — Verify

```bash
# TypeScript
cd frontend && npx tsc --noEmit 2>&1 | head -60

# Build
npm run build 2>&1 | tail -30

# Residual plain tables (should be zero)
grep -rn "<table\b\|<Table\b" . \
  --include="*.tsx" --include="*.jsx" \
  | grep -v node_modules \
  | grep -v "smart-table.tsx"
```

Fix all TypeScript errors and build failures before reporting done.

---

## Phase 5 — Report

```
SmartTable upgrade complete.

Files scanned:       N
Files modified:      N
Tables upgraded:     N

New files created:
  ✅ lib/smart-table-utils.ts
  ✅ lib/use-debounce.ts          (or: already existed)
  ✅ components/ui/smart-table.tsx

Modified files:
  ✅ app/users/page.tsx           tableId="users-list"   (1 table)
  ✅ app/orders/page.tsx          tableId="orders-admin" (1 table)
  ✅ components/dashboard/...     tableId="..."          (1 table)
  ...

Features applied to every table:
  ✅ Sortable headers (3-state: asc → desc → none)
  ✅ Global search (+ AND, diacritics-insensitive)
  ✅ Auto column filters (dropdown per column ≤ 20 distinct values)
  ✅ Column show/hide (right-click context menu)
  ✅ Column resizing (drag right edge)
  ✅ Column drag-to-reorder
  ✅ Pagination [10, 25, 50, 75, 100] with "Page X of Y — Z records"
  ✅ localStorage persistence per table
  ✅ Gear icon → reset to defaults (with confirm dialog)
  ✅ Empty state, loading skeleton, responsive scroll

Build:      ✅ pass
TypeScript: ✅ 0 errors
Residual plain <table>: ✅ 0
```

---

## Edge cases

**Dataset > 500 rows** — add this comment above the SmartTable usage:
```tsx
{/* ⚠️ Dataset exceeds 500 rows — consider adding @tanstack/react-virtual
    for virtualized tbody rendering to maintain scroll performance. */}
```

**Multi-table page** — each table on the same page gets a distinct `tableId`.

**Server-side data** — if data is paginated on the server (cursor-based or offset), do NOT use SmartTable's client-side pagination. Note this in the report and leave the existing pagination logic in place; only add the search, sort column headers, and column management features from SmartTable as individual pieces.

**Non-React stacks** — if the app uses Vue or plain HTML, generate equivalent implementations following the same data pipeline order: column filters → search → sort → paginate.
