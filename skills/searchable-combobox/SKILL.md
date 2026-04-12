---
name: searchable-combobox
description: Upgrades every select/dropdown/combobox in a Next.js + shadcn/ui application to a searchable combobox with diacritics-insensitive, multi-term AND search. Reads EVERY source file without skipping, creates a single reusable SearchableCombobox component, then replaces all instances. Use this skill whenever the user says "make dropdowns searchable", "add search to selects", "upgrade comboboxes", "apply searchable combobox", or wants to standardize dropdown/select UX across the app.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Searchable Combobox — Apply to Entire Application

Transform every non-searchable select/dropdown/combobox in the codebase into a
single reusable `SearchableCombobox` component with diacritics-insensitive,
case-insensitive, multi-term AND search.

**Critical rule: you must read EVERY file. Never skip a file because it looks
unrelated — comboboxes appear in unexpected places.**

---

## Phase 1 — Full codebase enumeration

### 1a. Discover all source files

```bash
# Get every TypeScript/TSX/JS/JSX file in the project
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  | grep -v node_modules \
  | grep -v ".next" \
  | grep -v "dist" \
  | grep -v ".git" \
  | sort
```

Read every file in this list. Do not filter based on directory name or file name
before reading — a component named `user-selector.tsx` or `picker.tsx` may
contain a `<Select>` just as likely as one named `combobox.tsx`.

### 1b. Pattern-search for known select/combobox indicators

Run these searches across the entire codebase to build a hit list:

```bash
# shadcn/ui Select
grep -rn "from.*@/components/ui/select\|from.*components/ui/select" . \
  --include="*.tsx" --include="*.ts" | grep -v node_modules

# shadcn/ui Command / Combobox pattern
grep -rn "from.*@/components/ui/command\|from.*components/ui/command" . \
  --include="*.tsx" --include="*.ts" | grep -v node_modules

# Radix Select
grep -rn "from.*@radix-ui/react-select" . \
  --include="*.tsx" --include="*.ts" | grep -v node_modules

# Native HTML select
grep -rn "<select\b" . \
  --include="*.tsx" --include="*.jsx" | grep -v node_modules

# react-select
grep -rn "from.*react-select\b" . \
  --include="*.tsx" --include="*.ts" | grep -v node_modules

# Headless UI Listbox / Combobox
grep -rn "from.*@headlessui/react" . \
  --include="*.tsx" --include="*.ts" | grep -v node_modules
```

Build a deduplicated inventory table (file path + pattern found + component used).
This is your transform list.

---

## Phase 2 — Create the reusable infrastructure

### 2a. Create `lib/search.ts` (shared search utilities)

Copy the canonical search template from the plugin's shared templates directory:
`skills/shared/templates/search.ts` → project's `lib/search.ts`

If `lib/search.ts` already exists and has a `normalize` function with the NFD implementation, skip this step.

The file provides: `normalize()`, `matchesSearch()`, `matchesComboboxSearch()`, `rowMatchesSearch()`.

Then create `lib/combobox-search.ts` as a thin re-export for backwards compatibility:

```typescript
// lib/combobox-search.ts — re-exports from canonical search.ts
export { normalize, matchesComboboxSearch } from './search';
```

### 2b. Create `components/ui/searchable-combobox.tsx`

```typescript
'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { matchesComboboxSearch } from '@/lib/combobox-search';
import { useDebounce } from '@/lib/use-debounce'; // see 2c

export interface ComboboxOption {
  value: string;
  label: string;
  [key: string]: unknown; // allow extra searchable fields
}

export interface SearchableComboboxProps {
  /** All available options */
  options: ComboboxOption[];
  /** Currently selected value */
  value?: string;
  /** Called with the new value when the user selects an option */
  onChange: (value: string) => void;
  /** Placeholder shown when nothing is selected */
  placeholder?: string;
  /** Placeholder inside the search input */
  searchPlaceholder?: string;
  /** Which fields to search. Default: ["label"] */
  searchFields?: string[];
  /** Disable the control */
  disabled?: boolean;
  /** Additional className on the trigger button */
  className?: string;
  /** Message when no options match the search */
  emptyMessage?: string;
}

export function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  searchFields = ['label'],
  disabled = false,
  className,
  emptyMessage = 'No results found.',
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebounce(query, 175);

  const filtered = React.useMemo(
    () =>
      options.filter((opt) =>
        matchesComboboxSearch(opt, debouncedQuery, searchFields),
      ),
    [options, debouncedQuery, searchFields],
  );

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedLabel ?? (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filtered.length === 0 ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={(selected) => {
                      onChange(selected === value ? '' : selected);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === opt.value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### 2c. Create `lib/use-debounce.ts` (if it doesn't already exist)

Copy the canonical template from `skills/shared/templates/use-debounce.ts` → project's `lib/use-debounce.ts`.

### 2d. Install dependencies (if missing)

```bash
cd frontend

# Ensure Command and Popover are installed (shadcn/ui)
npx shadcn@latest add command 2>/dev/null || true
npx shadcn@latest add popover 2>/dev/null || true

# lucide-react (already a shadcn/ui dependency, but verify)
grep -q '"lucide-react"' package.json || npm install lucide-react
```

---

## Phase 3 — Replace every instance

Work through the inventory list from Phase 1 one file at a time.
**Read each file completely before editing it.**

### For each file in the hit list:

1. **Read the full file.** Understand how the current select/combobox is used:
   - What drives `value` (state variable, form field, prop)?
   - What are the options (static array, derived from data, mapped from API)?
   - Are there multiple selects in the same file?

2. **Map options to `ComboboxOption[]`**. The existing options may look like:
   ```tsx
   // shadcn Select
   <SelectItem value="pt">Portugal</SelectItem>
   
   // Array map
   {countries.map(c => <SelectItem value={c.code}>{c.name}</SelectItem>)}
   
   // native select
   <option value="pt">Portugal</option>
   ```
   
   Convert each to:
   ```typescript
   const options: ComboboxOption[] = [
     { value: 'pt', label: 'Portugal' },
     // or: countries.map(c => ({ value: c.code, label: c.name }))
   ];
   ```

3. **Identify searchFields.** If the option has meaningful extra fields (e.g. a
   product code AND a name), expose them:
   ```typescript
   const options = products.map(p => ({
     value: p.id,
     label: p.name,
     code: p.sku,   // will be searchable if searchFields={['label','code']}
   }));
   ```

4. **Replace the component.** Remove the old import(s) and add:
   ```tsx
   import { SearchableCombobox } from '@/components/ui/searchable-combobox';
   ```
   
   Replace the JSX:
   ```tsx
   <SearchableCombobox
     options={options}
     value={value}
     onChange={setValue}
     placeholder="Select a country…"
     searchPlaceholder="Search countries…"
     searchFields={['label']}          // add more keys if useful
   />
   ```

5. **Handle react-hook-form.** If the select is inside a `<FormField>` / `Controller`:
   ```tsx
   <FormField
     control={form.control}
     name="country"
     render={({ field }) => (
       <FormItem>
         <FormLabel>Country</FormLabel>
         <FormControl>
           <SearchableCombobox
             options={countryOptions}
             value={field.value}
             onChange={field.onChange}
           />
         </FormControl>
         <FormMessage />
       </FormItem>
     )}
   />
   ```

6. **Remove orphaned imports.** After replacing, remove any leftover imports from
   `@/components/ui/select`, `@radix-ui/react-select`, `react-select`, etc. that
   are no longer referenced in the file.

### After all files are processed, also check:

- `components/ui/select.tsx` — if it exists and is now unused across the entire
  app, note it (do not delete it — it may be used by shadcn/ui internals)
- Any barrel `index.ts` files that re-export old Select components — update them
  if the original is no longer used

---

## Phase 4 — Verify

```bash
# 1. TypeScript: zero errors
cd frontend && npx tsc --noEmit 2>&1 | head -50

# 2. Build: must succeed
npm run build 2>&1 | tail -30

# 3. Residual raw selects (should be zero hits outside of node_modules)
grep -rn "<Select\b\|<SelectContent\|<SelectItem\|<select\b" \
  --include="*.tsx" --include="*.jsx" . \
  | grep -v node_modules | grep -v "searchable-combobox.tsx"
```

If the build fails or TypeScript errors remain, fix them before reporting done.
If residual `<Select>` hits remain, check whether they are intentional
(e.g. a custom component that wraps SearchableCombobox) or missed instances.

---

## Phase 5 — Report

After completing, report:

```
Searchable combobox upgrade complete.

Files scanned: N
Files modified: N
Comboboxes upgraded: N

New files created:
  ✅ lib/combobox-search.ts
  ✅ lib/use-debounce.ts      (or: already existed)
  ✅ components/ui/searchable-combobox.tsx

Modified files:
  ✅ app/settings/page.tsx         (1 Select → SearchableCombobox)
  ✅ components/forms/user-form.tsx (2 Selects → SearchableCombobox)
  ...

Build: ✅ pass
TypeScript: ✅ 0 errors
Residual raw <select>: ✅ 0
```

---

## Edge cases

- **Multi-select** — If you find a multi-select (multiple values), do NOT replace
  it with the single-select `SearchableCombobox`. Note it in the report as
  "requires custom multi-select combobox — skipped".

- **Async options** — If options are loaded asynchronously (e.g. from an API on
  open), keep the existing loading logic but wrap the resolved options array with
  the same `SearchableCombobox`. Add a `loading` prop display if needed.

- **Grouped options** — If a select has `<SelectGroup>` / `<optgroup>`, flatten
  to a single options array (labels remain descriptive) or extend `ComboboxOption`
  with a `group` field and render `<CommandGroup>` per group.

- **Trigger width** — The popover uses `w-[--radix-popover-trigger-width]` to
  match the button width. If an existing select has a fixed pixel width, preserve
  that width on the trigger button via the `className` prop.
