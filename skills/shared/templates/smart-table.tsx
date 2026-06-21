// components/ui/smart-table.tsx — SmartTable component template
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
import { PaginationBar } from '@/components/ui/pagination-bar';

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

      {/* Pagination + gear */}
      {data.length > 10 && (
        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          total={processed.length}
          size={pageSize}
          onPage={(p) => setPage(p)}
          onSize={(n) => { setPageSize(n); setPage(1); savePrefs(tableId, { pageSize: n }); }}
          extra={
            <Button variant="ghost" size="icon" onClick={handleReset} title="Reset table to defaults" className="size-8 text-muted-foreground hover:text-foreground">
              <Settings2 className="h-4 w-4" />
            </Button>
          }
        />
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
