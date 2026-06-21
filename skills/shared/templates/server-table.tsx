// components/ui/server-table.tsx — server-paginated table for LARGE / server-backed datasets.
// Sortable headers + pagination driven by URL params (page/size/sort/dir). The PAGE component
// reads those params, runs the server query that returns { rows, total }, and passes them here.
// Use this (NOT client SmartTable) whenever the dataset can exceed ~1–2k rows. Pair it with a
// server-side search/filter toolbar (also URL-param driven). See table-standard.md →
// "Large or server-backed tables".
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";

export type ServerCol<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  width?: number;
  render?: (row: T) => React.ReactNode;
};

export function ServerTable<T extends Record<string, unknown>>({
  columns,
  rows,
  total,
  page,
  size,
  sort,
  dir,
}: {
  columns: ServerCol<T>[];
  rows: T[];
  total: number;
  page: number;
  size: number;
  sort?: string;
  dir?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / size));

  function setParams(updates: Record<string, string | number | undefined>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "") sp.delete(k);
      else sp.set(k, String(v));
    }
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  function toggleSort(key: string) {
    if (sort !== key) setParams({ sort: key, dir: "asc", page: 1 });
    else if (dir === "asc") setParams({ sort: key, dir: "desc", page: 1 });
    else setParams({ sort: undefined, dir: undefined, page: 1 });
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((c) => {
                const sortable = c.sortable !== false;
                return (
                  <th
                    key={c.key}
                    style={{ width: c.width }}
                    onClick={sortable ? () => toggleSort(c.key) : undefined}
                    className={cn(
                      "select-none px-3 py-3 text-left font-medium text-muted-foreground",
                      sortable && "cursor-pointer hover:text-foreground",
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.header}
                      {sortable &&
                        (sort === c.key ? (
                          dir === "asc" ? <ChevronUp className="size-3 text-primary" /> : <ChevronDown className="size-3 text-primary" />
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-30" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-muted-foreground">No records found</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-t even:bg-muted/10 hover:bg-muted/30">
                  {columns.map((c) => (
                    <td key={c.key} className="truncate px-3 py-2.5">{c.render ? c.render(r) : String(r[c.key] ?? "")}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        size={size}
        onPage={(p) => setParams({ page: p })}
        onSize={(s) => setParams({ size: s, page: 1 })}
      />
    </div>
  );
}
