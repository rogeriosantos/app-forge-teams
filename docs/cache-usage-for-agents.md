# Cache Usage Guide for Audit Agents

This document explains how audit agents should use the `.forge-cache/` directory to minimize token usage.

## Why the cache exists

Before you (an audit agent) were spawned, the team lead ran `scripts/build-codebase-cache.py` which scanned the entire codebase ONCE. Instead of every agent re-running `grep -rn "TODO"`, `find -name "page.tsx"`, etc., the results are in `.forge-cache/`.

**Your job: READ the cache first. Only run your own grep/find commands when the cache doesn't contain what you need.**

## What's in the cache

Every cache file under `.forge-cache/` has the format: `path:line:content` (grep-style).

### Metadata files

| File | Content |
|---|---|
| `index.json` | JSON with counts, framework detection, timestamp |
| `summary.md` | Human-readable summary with counts table |

### File inventories

| File | Content |
|---|---|
| `files.txt` | All source files, one per line |
| `pages.txt` | Next.js page files (App + Pages Router) |
| `api-routes.txt` | Next.js API routes + FastAPI endpoints |
| `error-boundaries.txt` | error.tsx, 404.tsx, not-found.tsx |
| `loading-files.txt` | loading.tsx files |
| `db-models.txt` | ORM model file paths |
| `migrations.txt` | Migration file paths |

### Pattern scans (grep output, `path:line:content` format)

| File | Content |
|---|---|
| `todos.txt` | TODO/FIXME/HACK/XXX/KLUDGE/BUG comments |
| `imports.txt` | All `import` statements |
| `exports.txt` | All `export function/const/class/interface/type/default` |
| `buttons.txt` | All `<Button>` and `<button>` and `<IconButton>` elements |
| `empty-handlers.txt` | `onClick={}`, `onClick={undefined}`, onClick with TODO |
| `forms.txt` | All `<form>`, `<Form>`, `onSubmit`, `handleSubmit` |
| `api-calls.txt` | `fetch()`, `axios`, `useMutation`, `useQuery`, `useSWR` |
| `state-hooks.txt` | `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`, etc. |
| `auth-usage.txt` | `getServerSession`, `withAuth`, `currentUser`, `isAdmin`, etc. |
| `dialogs.txt` | `<Dialog>`, `<Modal>`, `<Sheet>`, `<Drawer>`, `<AlertDialog>`, `<Popover>` |
| `feedback.txt` | `toast`, `sonner`, `notification` calls |
| `navigation.txt` | `href=`, `router.push`, `router.replace`, `redirect()`, `navigate()` |
| `secrets-scan.txt` | Potential hardcoded secrets (api_key, password, token, etc.) |

## How to use the cache

### Step 1: Start with the index

```bash
cat .forge-cache/index.json
cat .forge-cache/summary.md
```

This gives you total counts and framework info.

### Step 2: Read the files relevant to YOUR audit category

Only read what you need. Example for different auditors:

**dead-code-hunter:**
```bash
cat .forge-cache/exports.txt    # what exists
cat .forge-cache/imports.txt    # what's used
# Then cross-reference to find unused exports
```

**missing-impl-auditor:**
```bash
cat .forge-cache/todos.txt            # all TODOs
cat .forge-cache/empty-handlers.txt   # empty onClick
cat .forge-cache/api-routes.txt       # routes to check for handlers
```

**ux-interaction-auditor:**
```bash
cat .forge-cache/buttons.txt          # all buttons
cat .forge-cache/empty-handlers.txt   # non-functional ones
cat .forge-cache/forms.txt            # all forms
cat .forge-cache/api-calls.txt        # see if handlers actually call APIs
```

**ux-state-auditor:**
```bash
cat .forge-cache/loading-files.txt    # loading.tsx coverage
cat .forge-cache/error-boundaries.txt # error.tsx coverage
cat .forge-cache/feedback.txt         # toast/notification usage
cat .forge-cache/api-calls.txt        # mutations that may lack feedback
```

**ux-flow-auditor:**
```bash
cat .forge-cache/pages.txt            # all routes that exist
cat .forge-cache/navigation.txt       # all links/router.push calls
# Cross-reference: links pointing to pages that don't exist
```

**workflow-completeness-auditor:**
```bash
cat .forge-cache/pages.txt            # frontend features
cat .forge-cache/api-routes.txt       # backend features
cat .forge-cache/db-models.txt        # data layer
# Check against the PRD
```

**workflow-logic-auditor:**
```bash
cat .forge-cache/auth-usage.txt       # where auth is checked
cat .forge-cache/api-routes.txt       # routes that need checks
```

**security-auditor:**
```bash
cat .forge-cache/secrets-scan.txt     # potential hardcoded secrets
cat .forge-cache/auth-usage.txt       # auth check coverage
cat .forge-cache/api-routes.txt       # routes that need auth
```

**data-integrity-auditor:**
```bash
cat .forge-cache/db-models.txt        # schema files
cat .forge-cache/migrations.txt       # migration files
```

**saas-pages-auditor:**
```bash
cat .forge-cache/pages.txt            # all existing pages
# Then check against the SaaS pages checklist
```

**consistency-auditor:**
```bash
cat .forge-cache/imports.txt          # naming patterns
cat .forge-cache/exports.txt          # export styles
```

**workflow-edge-case-auditor:**
```bash
cat .forge-cache/api-calls.txt        # mutations
cat .forge-cache/forms.txt            # forms
cat .forge-cache/state-hooks.txt      # state that could race
```

### Step 3: Grep the cache (not the codebase)

If you need to filter, use `grep` on the cache files, not the entire codebase:

```bash
# WRONG (expensive): scans entire codebase
grep -rn "onClick={}" . --include="*.tsx"

# RIGHT (cheap): filter the pre-scanned cache
grep "onClick={}" .forge-cache/empty-handlers.txt
```

### Step 4: Only scan source when cache doesn't have what you need

For deep analysis that the cache can't cover (e.g., reading a specific handler's body to check if it calls an API), you still need to `Read` the source file. That's fine — but don't re-scan the codebase looking for files to read. Use the cache to find the file paths, then read individual files.

## Rules

1. **Always read `.forge-cache/summary.md` and `.forge-cache/index.json` first.**
2. **Only read cache files relevant to your audit category.** Don't read all of them.
3. **Grep the cache, not the codebase.** If you need to filter results, filter the cache file.
4. **Read source files only when needed.** Use the cache to find WHERE to read, then Read only those specific files.
5. **Never run `find` or `grep -rn` on the whole codebase if the cache has what you need.**

## When to ignore the cache

Only ignore the cache if:
- The cache doesn't exist (fallback to normal scanning)
- You find a finding that requires deep semantic analysis not in the cache
- You need the actual file content, not just paths/line numbers

In those cases, use the cache to narrow your target, THEN Read the specific files.
