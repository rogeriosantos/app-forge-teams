// lib/search.ts — Canonical search utilities for all forge-teams skills
// Used by: searchable-combobox, smart-table, universal-search
// DO NOT duplicate this logic — import from here

/**
 * Strips diacritics and lowercases a string.
 *   "José"    → "jose"
 *   "Açúcar"  → "acucar"
 *   "Máquina" → "maquina"
 */
export function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Tests whether an item matches a search query.
 *
 * Rules:
 *  - Empty / whitespace-only query → always matches (show everything)
 *  - "+" splits the query into independent AND-terms (all must match)
 *  - Each term is matched diacritics-insensitively as a substring
 *  - ALL terms must match (each against ANY field), not each against its own field
 *  - If `fields` is omitted, ALL string and number properties are searched
 *  - "+" is reserved — it cannot be searched as a literal character
 *
 * @example
 * matchesSearch({ name: "José Silva", city: "Lisboa" }, "jose")           // true
 * matchesSearch({ name: "José Silva", city: "Lisboa" }, "jose+lisboa")    // true
 * matchesSearch({ name: "José Silva", city: "Porto"  }, "jose+lisboa")    // false
 */
export function matchesSearch<T extends Record<string, unknown>>(
  item: T,
  query: string,
  fields?: (keyof T)[],
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const terms = trimmed.split('+').map(normalize).filter(Boolean);

  const keys: (keyof T)[] =
    fields ??
    (Object.keys(item) as (keyof T)[]).filter(
      (k) => typeof item[k] === 'string' || typeof item[k] === 'number',
    );

  const haystack = keys.map((k) => normalize(String(item[k] ?? '')));

  return terms.every((term) => haystack.some((field) => field.includes(term)));
}

/**
 * Combobox-specific search — same logic but defaults to searching the "label" field.
 *
 * @example
 * matchesComboboxSearch({ value: "PT", label: "Portugal" }, "port")       // true
 * matchesComboboxSearch({ value: "PT", label: "Portugal" }, "port+PT")    // true
 */
export function matchesComboboxSearch<T extends Record<string, unknown>>(
  option: T,
  query: string,
  searchFields: (keyof T)[] = ['label' as keyof T],
): boolean {
  return matchesSearch(option, query, searchFields);
}

/**
 * Table-row-specific search — takes visible column keys as the field list.
 */
export function rowMatchesSearch(
  row: Record<string, unknown>,
  query: string,
  visibleKeys: string[],
): boolean {
  return matchesSearch(row, query, visibleKeys);
}
