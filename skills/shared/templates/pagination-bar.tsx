// components/ui/pagination-bar.tsx — shared pagination control.
// Grouped (never split left/right): "{total} records · Rows [size] · « ‹ [page] of N › »".
// Icon buttons (not words) + an editable page field. Used by SmartTable AND ServerTable.
"use client";

import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAGE_SIZES = [10, 25, 50, 75, 100];
const field = "h-8 rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring";

export function PaginationBar({
  page,
  totalPages,
  total,
  size,
  onPage,
  onSize,
  extra,
}: {
  page: number;
  totalPages: number;
  total: number;
  size: number;
  onPage: (p: number) => void;
  onSize: (s: number) => void;
  extra?: React.ReactNode; // e.g. the SmartTable reset gear
}) {
  const go = (p: number) => onPage(Math.min(totalPages, Math.max(1, p || 1)));

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-muted-foreground">
      <span className="tabular-nums">{total.toLocaleString()} records</span>

      <div className="flex items-center gap-1.5">
        <span>Rows</span>
        <select value={size} onChange={(e) => onSize(Number(e.target.value))} className={field}>
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="size-8" onClick={() => go(1)} disabled={page <= 1} aria-label="First page">
          <ChevronsLeft className="size-4" />
        </Button>
        <Button variant="outline" size="icon" className="size-8" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="flex items-center gap-1.5 px-1.5">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={page}
            onChange={(e) => go(Number(e.target.value))}
            className={`${field} w-14 text-center tabular-nums`}
            aria-label="Page"
          />
          of <span className="tabular-nums">{totalPages.toLocaleString()}</span>
        </span>
        <Button variant="outline" size="icon" className="size-8" onClick={() => go(page + 1)} disabled={page >= totalPages} aria-label="Next page">
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="outline" size="icon" className="size-8" onClick={() => go(totalPages)} disabled={page >= totalPages} aria-label="Last page">
          <ChevronsRight className="size-4" />
        </Button>
      </div>

      {extra}
    </div>
  );
}
