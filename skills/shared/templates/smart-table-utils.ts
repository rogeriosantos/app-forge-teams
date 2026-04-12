// lib/smart-table-utils.ts — Table-specific utilities for smart-table skill
// Search functions (normalize, rowMatchesSearch) live in lib/search.ts
// This file handles: sorting, column labels, localStorage persistence

// Re-export search functions so existing imports don't break
export { normalize, rowMatchesSearch } from './search';

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
