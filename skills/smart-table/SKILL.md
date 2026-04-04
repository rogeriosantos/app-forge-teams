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

### 2a. Create `lib/smart-table-utils.ts`

```typescript
// lib/smart-table-utils.ts

/** Strip diacritics + lowercase: "José" → "jose", "Açúcar" → "acucar" */
export function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Test whether a row matches a query.
 * "+" splits into AND-terms; each term must appear in at least one visible field.
 * Empty query → always matches.
 */
export function rowMatchesSearch(
  row: Record<string, unknown>,
  query: string,
  visibleKeys: string[],
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const terms = trimmed.split('+').map(normalize).filter(Boolean);
  const cells = visibleKeys.map((k) => normalize(String(row[k] ?? '')));
  return terms.every((term) => cells.some((c) => c.includes(term)));
}

/** Locale-aware, type-smart comparator. Nulls always last. */
export function compareValues(a: unknown, b: unknown, dir: 'asc' | 'desc'): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  // ISO date strings
  if (typeof a === 'string' && typeof b === 'string') {
    const da = Date.parse(a), db = Date.parse(b);
    if (!isNaN(da) && !isNaN(db)) return dir === 'asc' ? da - db : db - da;
  }
  if (typeof a === 'number' && typeof b === 'number')
    return dir === 'asc' ? a - b : b - a;
  const cmp = String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
  return dir === 'asc' ? cmp : -cmp;
}

/** "created_at" → "Created At", "firstName" → "First Name" */
export function keyToLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Load / save per-table preferences in localStorage */
export interface TablePrefs {
  columnOrder: string[];
  hiddenColumns: string[];
  columnWidths: Record<string, number>;
  sortKey: string | null;
  sortDir: 'asc' | 'desc' | null;
  pageSize: number;
}

export function loadPrefs(tableId: string): Partial<TablePrefs> {
  try {
    const raw = localStorage.getItem(`table_prefs_${tableId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function savePrefs(tableId: string, prefs: Partial<TablePrefs>): void {
  try {
    const existing = loadPrefs(tableId);
    localStorage.setItem(`table_prefs_${tableId}`, JSON.stringify({ ...existing, ...prefs }));
  } catch {}
}

export function clearPrefs(tableId: string): void {
  try { localStorage.removeItem(`table_prefs_${tableId}`); } catch {}
}
```

### 2b. Create `lib/use-debounce.ts` (if missing)

```typescript
import { useState, useEffect } from 'react';
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
```

### 2c. Create `components/ui/smart-table.tsx`

This is the full SmartTable component. Generate it completely — no placeholder comments.

```typescript
// SmartTable: sortable headers, global search (+ for AND, diacritic-insensitive),
// auto-detected column filters, show/hide via right-click, resize, drag-to-reorder,
// pagination [10,25,50,75,100], localStorage persistence per table, gear reset
'use client';

import * as React from 'react';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, X, Search, Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  normalize, rowMatchesSearch, compareValues, keyToLabel,
  loadPrefs, savePrefs, clearPrefs, TablePrefs,
} from '@/lib/smart-table-utils';
import { useDebounce } from '@/lib/use-debounce';

export interface ColumnDef<T> {
  key: keyof T & string;
  header?: string;
  sortable?: boolean;          // default: true
  filterable?: boolean;        // default: auto-detect (≤20 distinct values)
  defaultWidth?: number;       // px, default: 160
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface SmartTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns?: ColumnDef<T>[];
  tableId: string;             // unique key for localStorage persistence
  defaultPageSize?: number;
  defaultSortKey?: keyof T & string;
  defaultSortDir?: 'asc' | 'desc';
  isLoading?: boolean;
  className?: string;
}

const PAGE_SIZES = [10, 25, 50, 75, 100];
const MIN_COL_WIDTH = 60;
const FILTER_THRESHOLD = 20;

export function SmartTable<T extends Record<string, unknown>>({
  data,
  columns: colsProp,
  tableId,
  defaultPageSize = 10,
  defaultSortKey,
  defaultSortDir = 'asc',
  isLoading = false,
  className,
}: SmartTableProps<T>) {

  // ── Build base column definitions ─────────────────────────────────────────
  const baseCols = React.useMemo<ColumnDef<T>[]>(() => {
    if (colsProp) return colsProp;
    if (!data.length) return [];
    return Object.keys(data[0]).map((k) => ({ key: k as keyof T & string }));
  }, [colsProp, data]);

  // ── Load saved preferences ────────────────────────────────────────────────
  const prefs = React.useMemo(() => loadPrefs(tableId), [tableId]);

  // ── Column order (drag-to-reorder + persistence) ──────────────────────────
  const [colOrder, setColOrder] = React.useState<string[]>(() =>
    prefs.columnOrder?.length
      ? prefs.columnOrder
      : baseCols.map((c) => c.key),
  );

  // ── Column visibility (right-click show/hide) ─────────────────────────────
  const [hidden, setHidden] = React.useState<Set<string>>(
    () => new Set(prefs.hiddenColumns ?? []),
  );

  const toggleHidden = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); }
      else {
        // At least one column must stay visible
        const visible = colOrder.filter((k) => !next.has(k));
        if (visible.length <= 1) return prev;
        next.add(key);
      }
      savePrefs(tableId, { hiddenColumns: [...next] });
      return next;
    });
  };

  const showAll = () => {
    setHidden(new Set());
    savePrefs(tableId, { hiddenColumns: [] });
  };

  // ── Column widths (resize drag) ───────────────────────────────────────────
  const [widths, setWidths] = React.useState<Record<string, number>>(() => {
    const saved = prefs.columnWidths ?? {};
    const defaults: Record<string, number> = {};
    baseCols.forEach((c) => { defaults[c.key] = c.defaultWidth ?? 160; });
    return { ...defaults, ...saved };
  });

  const resizingRef = React.useRef<{ key: string; startX: number; startW: number } | null>(null);

  const onResizeMouseDown = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    resizingRef.current = { key, startX: e.clientX, startW: widths[key] ?? 160 };
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizingRef.current.startX;
      const newW = Math.max(MIN_COL_WIDTH, resizingRef.current.startW + delta);
      setWidths((prev) => {
        const next = { ...prev, [resizingRef.current!.key]: newW };
        savePrefs(tableId, { columnWidths: next });
        return next;
      });
    };
    const onUp = () => { resizingRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Sort state ────────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = React.useState<string | null>(() =>
    prefs.sortKey ?? defaultSortKey ?? null,
  );
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc' | null>(() =>
    prefs.sortDir ?? (defaultSortKey ? defaultSortDir : null),
  );

  const handleSort = (key: string) => {
    let nextKey = key, nextDir: 'asc' | 'desc' | null = 'asc';
    if (sortKey === key) {
      if (sortDir === 'asc') nextDir = 'desc';
      else { nextKey = null as unknown as string; nextDir = null; }
    }
    setSortKey(nextKey); setSortDir(nextDir);
    savePrefs(tableId, { sortKey: nextKey, sortDir: nextDir });
  };

  // ── Search ────────────────────────────────────────────────────────────────
  const [rawQuery, setRawQuery] = React.useState('');
  const query = useDebounce(rawQuery, 250);

  // ── Column filters (auto-detect filterable columns) ───────────────────────
  const visibleCols = React.useMemo(
    () => colOrder
      .map((k) => baseCols.find((c) => c.key === k))
      .filter((c): c is ColumnDef<T> => !!c && !hidden.has(c.key)),
    [colOrder, baseCols, hidden],
  );

  const allKeys = visibleCols.map((c) => c.key);

  const filterableCols = React.useMemo(() =>
    baseCols.filter((col) => {
      if (col.filterable === false) return false;
      if (col.filterable === true) return true;
      const distinct = new Set(data.map((r) => String(r[col.key] ?? '')));
      return distinct.size > 1 && distinct.size <= FILTER_THRESHOLD;
    }),
    [baseCols, data],
  );

  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});

  // ── Pagination ────────────────────────────────────────────────────────────
  const [pageSize, setPageSize] = React.useState(() => prefs.pageSize ?? defaultPageSize);
  const [page, setPage] = React.useState(1);

  // ── Data pipeline: filters → search → sort → paginate ────────────────────
  const processed = React.useMemo(() => {
    let rows = data.filter((row) =>
      filterableCols.every((col) => {
        const v = colFilters[col.key];
        return !v || v === '__all__' || String(row[col.key] ?? '') === v;
      }),
    );
    if (query.trim()) {
      rows = rows.filter((r) =>
        rowMatchesSearch(r as Record<string, unknown>, query, allKeys),
      );
    }
    if (sortKey && sortDir) {
      rows = [...rows].sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir));
    }
    return rows;
  }, [data, colFilters, query, sortKey, sortDir, allKeys, filterableCols]);

  React.useEffect(() => { setPage(1); }, [query, colFilters, pageSize]);

  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageSlice = processed.slice((safePage - 1) * pageSize, safePage * pageSize);

  // ── Drag-to-reorder columns ───────────────────────────────────────────────
  const dragCol = React.useRef<string | null>(null);

  const onDragStart = (key: string) => { dragCol.current = key; };
  const onDrop = (targetKey: string) => {
    if (!dragCol.current || dragCol.current === targetKey) return;
    setColOrder((prev) => {
      const arr = [...prev];
      const from = arr.indexOf(dragCol.current!);
      const to = arr.indexOf(targetKey);
      arr.splice(from, 1);
      arr.splice(to, 0, dragCol.current!);
      savePrefs(tableId, { columnOrder: arr });
      return arr;
    });
    dragCol.current = null;
  };

  // ── Reset to defaults ─────────────────────────────────────────────────────
  const handleReset = () => {
    if (!window.confirm('Reset table to default settings?')) return;
    clearPrefs(tableId);
    const defaultOrder = baseCols.map((c) => c.key);
    const defaultWidths: Record<string, number> = {};
    baseCols.forEach((c) => { defaultWidths[c.key] = c.defaultWidth ?? 160; });
    setColOrder(defaultOrder);
    setHidden(new Set());
    setWidths(defaultWidths);
    setSortKey(defaultSortKey ?? null);
    setSortDir(defaultSortKey ? defaultSortDir : null);
    setColFilters({});
    setPageSize(defaultPageSize);
    setPage(1);
    setRawQuery('');
  };

  // ── Context menu for column visibility ───────────────────────────────────
  const [ctxMenu, setCtxMenu] = React.useState<{ x: number; y: number } | null>(null);
  const ctxMenuRef = React.useRef<HTMLDivElement>(null);

  const onHeaderContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  React.useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const activeFilterCount = Object.values(colFilters).filter((v) => v && v !== '__all__').length;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={cn('w-full space-y-3 animate-pulse', className)}>
        <div className="h-9 w-full rounded-md bg-muted" />
        <div className="rounded-md border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-t px-4 py-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-4 flex-1 rounded bg-muted" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full space-y-3', className)}>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search table"
            placeholder="Search… (use + for AND)"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="shrink-0 text-sm text-muted-foreground whitespace-nowrap">
          Showing {processed.length} of {data.length} results
        </span>
        {(activeFilterCount > 0 || rawQuery) && (
          <Button
            variant="ghost" size="sm"
            onClick={() => { setColFilters({}); setRawQuery(''); }}
            className="gap-1"
          >
            <X className="h-3 w-3" /> Clear
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
        )}
      </div>

      {/* Column filter bar */}
      {filterableCols.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filterableCols.map((col) => {
            const opts = [...new Set(data.map((r) => String(r[col.key] ?? '')))].sort();
            return (
              <Select
                key={col.key}
                value={colFilters[col.key] ?? '__all__'}
                onValueChange={(v) => setColFilters((p) => ({ ...p, [col.key]: v }))}
              >
                <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
                  <SelectValue placeholder={col.header ?? keyToLabel(col.key)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All {col.header ?? keyToLabel(col.key)}</SelectItem>
                  {opts.map((v) => <SelectItem key={v} value={v}>{v || '(empty)'}</SelectItem>)}
                </SelectContent>
              </Select>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="relative rounded-md border overflow-x-auto">
        <table role="table" className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead className="bg-muted/50">
            <tr>
              {visibleCols.map((col) => {
                const isSortable = col.sortable !== false;
                const label = col.header ?? keyToLabel(col.key);
                const ariaSortVal =
                  sortKey === col.key
                    ? sortDir === 'asc' ? 'ascending' : 'descending'
                    : 'none';
                return (
                  <th
                    key={col.key}
                    aria-sort={ariaSortVal as React.AriaAttributes['aria-sort']}
                    draggable
                    onDragStart={() => onDragStart(col.key)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(col.key)}
                    onContextMenu={onHeaderContextMenu}
                    style={{ width: widths[col.key] ?? 160, position: 'relative' }}
                    className={cn(
                      'px-3 py-3 text-left font-medium text-muted-foreground select-none',
                      isSortable && 'cursor-pointer hover:text-foreground',
                    )}
                    onClick={isSortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1 truncate w-full">
                      {label}
                      {isSortable && (
                        sortKey === col.key
                          ? sortDir === 'asc'
                            ? <ChevronUp className="h-3 w-3 shrink-0 text-primary" />
                            : <ChevronDown className="h-3 w-3 shrink-0 text-primary" />
                          : <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-30" />
                      )}
                    </span>
                    {/* Resize handle */}
                    <span
                      onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(e, col.key); }}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/20"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageSlice.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleCols.length}
                  className="py-12 text-center text-muted-foreground"
                >
                  {data.length === 0 ? 'No data available' : 'No results match your search'}
                </td>
              </tr>
            ) : (
              pageSlice.map((row, i) => (
                <tr key={i} className="border-t transition-colors hover:bg-muted/30 even:bg-muted/10">
                  {visibleCols.map((col) => (
                    <td key={col.key} style={{ width: widths[col.key] ?? 160 }} className="px-3 py-3 truncate">
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination + gear (only when > 10 records) */}
      {data.length > 10 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Rows:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                const n = Number(v); setPageSize(n); setPage(1);
                savePrefs(tableId, { pageSize: n });
              }}
            >
              <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="whitespace-nowrap">
              Page {safePage} of {totalPages} — {processed.length} records
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={safePage === 1}>First</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>Prev</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Next</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>Last</Button>
            <Button variant="ghost" size="icon" onClick={handleReset} title="Reset table to defaults" className="h-7 w-7 ml-2 text-muted-foreground hover:text-foreground">
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Right-click column visibility context menu */}
      {ctxMenu && (
        <div
          ref={ctxMenuRef}
          className="fixed z-50 min-w-[180px] rounded-md border bg-popover p-1 shadow-md"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
        >
          <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Columns</p>
          {baseCols.map((col) => {
            const label = col.header ?? keyToLabel(col.key);
            const isVisible = !hidden.has(col.key);
            const isLast = colOrder.filter((k) => !hidden.has(k)).length === 1 && isVisible;
            return (
              <button
                key={col.key}
                disabled={isLast}
                onClick={() => toggleHidden(col.key)}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent',
                  isLast && 'opacity-40 cursor-not-allowed',
                )}
              >
                <span className={cn('h-3.5 w-3.5 rounded-sm border', isVisible && 'bg-primary border-primary')} />
                {label}
              </button>
            );
          })}
          <div className="my-1 border-t" />
          <button
            onClick={() => { showAll(); setCtxMenu(null); }}
            className="flex w-full items-center rounded px-2 py-1.5 text-sm hover:bg-accent"
          >
            Show All
          </button>
        </div>
      )}
    </div>
  );
}
```

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
