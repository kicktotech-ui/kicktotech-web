"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import type { Paginated, QueryParams } from "@/lib/admin/types";
import { Skeleton, EmptyState, Input, Select } from "./ui";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  fetcher: (params: QueryParams) => Promise<Paginated<T>>;
  searchPlaceholder?: string;
  filters?: FilterDef[];
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  toolbarActions?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  refreshKey?: number;
}

export function DataTable<T extends { id: string }>({
  columns, fetcher, searchPlaceholder = "Search...", filters = [], onRowClick,
  selectable, bulkActions, toolbarActions, emptyTitle = "Nothing here yet", emptyDescription,
  pageSize = 10, refreshKey = 0,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterValues, setFilterValues] = useState<Record<string, string | undefined>>({});
  const [data, setData] = useState<Paginated<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher({ search: debounced, page, pageSize, sortBy, sortDir, filters: filterValues });
      setData(res);
    } catch (e) {
      console.error("[DataTable] fetch error:", e);
      setError(e instanceof Error ? e.message : "Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [fetcher, debounced, page, pageSize, sortBy, sortDir, filterValues]);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { setPage(1); }, [debounced, filterValues, sortBy, sortDir]);

  const toggleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
  };

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.id)), [rows, selected]);
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const clearSelection = () => setSelected(new Set());
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
  const toggleRow = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-adm-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-9 bg-adm-surface focus:ring-2 focus:ring-[#0057ff]/20"
            />
          </div>
          {filters.map((f) => (
            <Select
              key={f.key}
              value={filterValues[f.key] ?? ""}
              onChange={(e) => setFilterValues((v) => ({ ...v, [f.key]: e.target.value || undefined }))}
              className="h-9 bg-adm-surface"
            >
              <option value="">{f.label}</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          ))}
        </div>
        {toolbarActions && <div className="flex flex-wrap items-center gap-2">{toolbarActions}</div>}
      </div>

      {/* Bulk action bar */}
      {selectable && selectedRows.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-[#0057ff]/30 bg-blue-500/10 px-4 py-2">
          <span className="text-sm font-medium text-[#0057ff]">{selectedRows.length} selected</span>
          <div className="flex items-center gap-2">{bulkActions?.(selectedRows, clearSelection)}</div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-adm-border bg-adm-surface">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-adm-border bg-adm-surface2 text-left">
              {selectable && (
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" className="h-4 w-4 rounded border-adm-border accent-[#0057ff]" />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-adm-muted", c.className)}>
                  {c.sortable ? (
                    <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-adm-fg">
                      {c.header}
                      {sortBy === c.key ? (sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />}
                    </button>
                  ) : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-adm-border">
                  {selectable && <td className="px-3 py-3"><Skeleton className="h-4 w-4" /></td>}
                  {columns.map((c) => <td key={c.key} className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>)}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-6">
                  <div className="flex flex-col items-center justify-center space-y-2 text-center text-adm-muted">
                    <span className="text-red-400">Error loading data</span>
                    <span className="text-xs">{error}</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-6">
                  <EmptyState title={emptyTitle} description={emptyDescription} icon={<Inbox className="h-5 w-5" />} />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={cn("border-b border-adm-border last:border-0 transition-colors", onRowClick && "cursor-pointer hover:bg-adm-surface2", selected.has(row.id) && "bg-blue-500/10")}
                >
                  {selectable && (
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} aria-label="Select row" className="h-4 w-4 rounded border-adm-border accent-[#0057ff]" />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-4 py-3 text-adm-fg", c.className)}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm text-adm-muted">
        <span>{total === 0 ? "0 results" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}</span>
        <div className="flex items-center gap-1">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-adm-border bg-adm-surface px-2.5 text-adm-fg disabled:opacity-40 hover:bg-adm-surface2">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs font-medium text-adm-muted">Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-adm-border bg-adm-surface px-2.5 text-adm-fg disabled:opacity-40 hover:bg-adm-surface2">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
