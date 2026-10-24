"use client";

import { useMemo, useState } from "react";
import { Search, Download, Database } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { eventService, contentService } from "@/services";
import { DashboardHeader, StatCard } from "@/components/dashboard/primitives";
import { Card } from "@/components/ui";
import { Input } from "@/components/forms/fields";
import { EmptyState } from "@/components/feedback/states";
import { Users, CalendarDays, Handshake, Award } from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "overview" | "events" | "partners" | "team" | "users" | "interns" | "certificates";

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "events", label: "Events" },
  { key: "partners", label: "Partners" },
  { key: "team", label: "Team" },
  { key: "users", label: "Users" },
  { key: "interns", label: "Interns" },
  { key: "certificates", label: "Certificates" },
];

export function AdminConsole() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [query, setQuery] = useState("");

  const events = useAsync(() => eventService.getEvents(), []);
  const partners = useAsync(() => contentService.getPartners(), []);
  const team = useAsync(() => contentService.getTeam(), []);

  return (
    <>
      <DashboardHeader
        title="Admin console"
        subtitle="Manage content and review submissions."
      />
      <p className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
        Admin visibility here is UX only. Real authorization + data are enforced by the backend and Firestore rules in a later phase.
      </p>

      {/* Tabs */}
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto border-b border-line pb-px">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "border-accent text-accent" : "border-transparent text-muted hover:text-primary-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Users" value="—" hint="Backend" />
          <StatCard icon={CalendarDays} label="Events" value={events.data?.length ?? "—"} />
          <StatCard icon={Handshake} label="Partners" value={partners.data?.length ?? "—"} />
          <StatCard icon={Award} label="Certificates" value="—" hint="Backend" />
        </div>
      )}

      {tab === "events" && <DataTable columns={["Title", "Status", "Date"]} rows={(events.data ?? []).map((e) => [e.title, e.status, e.date])} query={query} setQuery={setQuery} />}
      {tab === "partners" && <DataTable columns={["Name", "Category"]} rows={(partners.data ?? []).map((p) => [p.name, p.category])} query={query} setQuery={setQuery} />}
      {tab === "team" && <DataTable columns={["Name", "Role", "Domain"]} rows={(team.data ?? []).map((m) => [m.name, m.role, m.domain ?? "—"])} query={query} setQuery={setQuery} />}

      {(tab === "users" || tab === "interns" || tab === "certificates") && (
        <Card>
          <EmptyState
            title={`${tabs.find((t) => t.key === tab)?.label} are backend-driven`}
            icon={<Database className="h-7 w-7" />}
            description="This collection will populate once the service layer is connected to the database. The table UI, search, pagination, and export are ready."
          />
        </Card>
      )}
    </>
  );
}

function DataTable({
  columns,
  rows,
  query,
  setQuery,
}: {
  columns: string[];
  rows: (string | number)[][];
  query: string;
  setQuery: (v: string) => void;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 8;

  const filtered = useMemo(
    () => rows.filter((r) => r.some((c) => String(c).toLowerCase().includes(query.toLowerCase()))),
    [rows, query],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <Card className="p-0">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Search" className="pl-9" aria-label="Search records" />
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-accent" title="Export (backend later)">
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      {view.length === 0 ? (
        <div className="p-6"><EmptyState title="No records" description="Nothing matches your search." /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
                {columns.map((c) => (
                  <th key={c} className="px-4 py-3 font-semibold">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.map((row, i) => (
                <tr key={i} className="border-b border-line/60 last:border-0 hover:bg-white/[0.02]">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-3 capitalize">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between p-4 text-sm text-muted">
        <span>{filtered.length} records</span>
        <div className="flex items-center gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">Prev</button>
          <span>{page + 1} / {pages}</span>
          <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      </div>
    </Card>
  );
}
