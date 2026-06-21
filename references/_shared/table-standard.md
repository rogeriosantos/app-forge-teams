# Table Behavior Standard — Forge Reference

> **You are reading this because you are about to build, modify, or touch a table, list, or tabular data display.**
> Every table in a forge-built app must implement ALL of the behaviors in the checklist below. No exceptions.
>
> For visual styling (row height, padding, separators, selected state), see
> [`apple-design-system.md`](./apple-design-system.md) section "Component specs → Lists".

---

## Why every table follows this standard

Inconsistent tables are the #1 source of UX complaints in dashboard apps. If one page sorts on click and another sorts via a dropdown, users feel the app is "buggy" even when both work. The standard below is what `code-reviewer` and `ux-consistency-auditor` will check — getting it right once means you don't pay the cost on every page.

A reusable `<SmartTable>` component already exists in `frontend/components/`. **Use it.** Only re-implement table mechanics from scratch if there's a documented reason the shared component can't be used.

---

## Behavior checklist (every table — verify before commit)

### 1. Column sorting
- [ ] Every column header is clickable
- [ ] Click cycle: ascending (▲) → descending (▼) → no sort
- [ ] Single-column sort (one active sort at a time)
- [ ] Default sort: primary/natural order (id or `created_at`)

### 2. Column visibility (right-click context menu)
- [ ] Right-click on any column header opens a context menu
- [ ] Menu lists ALL columns with checkboxes
- [ ] Checked = visible, unchecked = hidden
- [ ] At least one column always remains visible (cannot hide all)
- [ ] Menu includes a "Show All" option

### 3. Column resizing
- [ ] Every column resizable by dragging its right edge
- [ ] `col-resize` cursor on hover over the drag handle
- [ ] Minimum column width: 60px
- [ ] Horizontal scrollbar appears if total width exceeds container

### 4. Column reordering (drag & drop)
- [ ] Header is draggable to a new position
- [ ] Drop-line indicator shows during drag
- [ ] Sort, visibility, and width references all update to follow the new order

### 5. Pagination
- [ ] Default page size: 10
- [ ] Page size selector: `[10, 25, 50, 75, 100]`
- [ ] Pagination bar text: `"Page {current} of {totalPages} — {totalRecords} records"`
- [ ] Navigation buttons: First, Previous, Next, Last
- [ ] Changing page size resets to page 1
- [ ] If current page exceeds total pages after a filter change, reset to page 1

### 6. Persistence (localStorage, keyed per table)
- [ ] Key format: `table_prefs_{tableId}` (use a stable, descriptive `tableId`)
- [ ] Saves: column order, visibility, widths, sort column + direction, page size
- [ ] Auto-saves on every change (no save button)
- [ ] Loads saved prefs on mount; falls back to defaults if missing

### 7. Reset to defaults
- [ ] ⚙ icon at the bottom-right of the table (after the pagination bar)
- [ ] On click: confirmation dialog "Reset table to default settings?"
- [ ] On confirm: clears `localStorage` entry for that table, reloads with defaults
- [ ] Defaults: page size 10, all columns visible, default sort, default widths

### 8. Empty / loading / error states
- [ ] **Empty state**: centered "No records found" message, pagination hidden
- [ ] **Loading state**: skeleton loader matching the actual content layout (rows + columns)
- [ ] **Error state**: error message with retry button — never a blank table

### 9. Responsive
- [ ] Horizontal scroll on mobile if columns don't fit
- [ ] Pagination bar always visible
- [ ] Touch-friendly tap targets on every interactive header

---

## tableId conventions

The `tableId` you choose determines whether two tables share preferences or are isolated. Rules:

- **Per-route + per-purpose**: `users-list`, `projects-grid`, `audit-findings`
- **Don't reuse** an id between routes — users expect their /users column choices to differ from /projects
- **Don't include user id, dates, or filters in the id** — preferences are per-table-purpose, not per-data-slice

Examples:
✅ `tableId="invoices-list"`
✅ `tableId="customer-orders-detail"`
❌ `tableId="table-1"` (uninformative)
❌ `tableId={`invoices-${userId}`}` (per-user, not per-table — defeats persistence)

---

## When NOT to use a table

Tables are for **structured, scannable, comparable data with multiple attributes per row**. Not every list of items needs a table.

Use a card grid instead when:
- Each item has visual content (image, avatar, large icon)
- The user is browsing rather than comparing attributes
- There are fewer than 8 items typical

Use a simple list (not a table) when:
- Each item has 1–2 fields and no comparison is needed
- The user picks one item to act on (file picker, contact list)

If you're unsure, ask `arch-reviewer` via SendMessage before implementing — switching from table to card grid mid-build is expensive.

---

## Verification before commit

When the issue you implemented involves a table, run through this list:

1. Did you use the shared `<SmartTable>` component? If not, why not?
2. Does every behavior in the checklist above work?
3. Does the table's `tableId` follow the convention?
4. Are loading / empty / error states all visible and tested with playwright?
5. Did you persist preferences across a page reload (manual test)?
6. Does the styling follow `apple-design-system.md` Component specs → Lists?

If any answer is "no" or "not yet", fix before commit. Reviewer will catch it otherwise.
