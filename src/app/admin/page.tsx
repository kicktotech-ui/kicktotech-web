"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, CalendarPlus, Megaphone, Award, BarChart3, Activity as ActivityIcon, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { Button, Card, Badge, Skeleton, EmptyState, statusTone } from "@/components/admin/ui";
import { StatCard, ChartCard, BarList } from "@/components/admin/charts";
import { analyticsService, activityService } from "@/services/admin";
import type { DashboardData, ActivityLog } from "@/lib/admin/types";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { formatDate } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

type ConnState = "loading" | "live" | "degraded" | "offline";
interface ActionItem { label: string; count: number; href: string; tone: "yellow" | "red" | "blue" }

export default function AdminDashboardPage() {
  const router = useRouter();
  const { admin } = useAdminAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [conn, setConn] = useState<ConnState>("loading");
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setConn("loading");
    (async () => {
      // Quota-lean: only the cheap analytics (count aggregations) + activity.
      // The previous per-mount filtered list queries forced full-collection
      // scans (esp. certificates status=PENDING) and were the main 429 cause.
      const [dash, act] = await Promise.all([
        analyticsService.dashboard(),
        activityService.query({ pageSize: 6, sortBy: "timestamp", sortDir: "desc" }),
      ]);
      if (!active) return;
      setDashboard(dash.data);
      setConn(dash.state === "live" ? "live" : dash.state);
      setActions([]); // no cheap pending-status source; avoid full-scan probes
      setLogs(act.rows);
    })();
    return () => { active = false; };
  }, [reloadKey]);

  const pendingActions = actions.filter((a) => a.count > 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0057ff]">Kick To Tech Operations</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-adm-fg">{greeting()}, {admin?.name}.</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-adm-muted">
            {conn === "loading" && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 animate-pulse rounded-full bg-[#f5c400]" /> Connecting to Database…</span>}
            {conn === "live" && <span className="inline-flex items-center gap-1.5 font-medium text-[#16a34a]"><span className="h-2 w-2 rounded-full bg-[#16a34a]" /> Live</span>}
            {conn === "degraded" && <span className="inline-flex items-center gap-1.5 font-medium text-[#d97706]"><span className="h-2 w-2 rounded-full bg-[#d97706]" /> Degraded · data service rate-limited</span>}
            {conn === "offline" && <span className="inline-flex items-center gap-1.5 font-medium text-[#dc2626]"><span className="h-2 w-2 rounded-full bg-[#dc2626]" /> Offline</span>}
            <span className="text-adm-muted">·</span>
            {formatDate(new Date())}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => router.push("/admin/interns")}><UserPlus className="h-4 w-4" /> Add Intern</Button>
          <Button variant="secondary" onClick={() => router.push("/admin/sessions")}><CalendarPlus className="h-4 w-4" /> Schedule</Button>
          <Button variant="secondary" onClick={() => router.push("/admin/announcements")}><Megaphone className="h-4 w-4" /> Announce</Button>
          <Button variant="secondary" onClick={() => router.push("/admin/certification")}><Award className="h-4 w-4" /> Certificates</Button>
        </div>
      </div>

      {/* Metrics + charts */}
      {conn === "loading" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : conn === "degraded" ? (
        <Card className="p-4">
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title="Live data temporarily unavailable"
            description="Firestore's daily read limit has been reached. Your data is safe and the connection is fine — metrics will return once the quota resets (or on the Blaze plan). Retry when the data service is available."
            action={<Button variant="secondary" onClick={() => setReloadKey((k) => k + 1)}><RefreshCw className="h-4 w-4" /> Retry</Button>}
          />
        </Card>
      ) : conn === "offline" || !dashboard ? (
        <Card className="p-4">
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title="Unable to load live data"
            description="The dashboard could not reach the backend. Check the connection and retry."
            action={<Button variant="secondary" onClick={() => setReloadKey((k) => k + 1)}><RefreshCw className="h-4 w-4" /> Retry</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {dashboard.metrics.map((m) => (
              <StatCard key={m.key} label={m.label} value={m.value} format={m.format} changePct={m.changePct} trend={m.trend} />
            ))}
          </div>
          <div className="mt-4">
            <ChartCard title="Certificates by domain" subtitle="Live from Firestore">
              <BarList items={dashboard.domainDistribution.map((d) => ({ label: d.label, value: d.value, accent: "#0057ff" }))} />
            </ChartCard>
          </div>
        </>
      )}

      {/* Action required + activity */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex items-center gap-2 border-b border-adm-border px-5 py-4">
            <ActivityIcon className="h-4 w-4 text-[#f5c400]" />
            <h3 className="text-sm font-bold text-adm-fg">Action required</h3>
          </div>
          {pendingActions.length === 0 ? (
            <div className="p-4"><EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="Nothing pending" description="Actionable items will appear here as data flows in." /></div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {pendingActions.map((a) => (
                <li key={a.label}>
                  <button onClick={() => router.push(a.href)} className="flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-adm-surface2">
                    <span className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${a.tone === "red" ? "bg-red-50 text-red-600" : a.tone === "yellow" ? "bg-yellow-50 text-yellow-700" : "bg-blue-50 text-[#0057ff]"}`}>{a.count}</span>
                      <span className="text-sm text-adm-fg">{a.label}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-adm-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-adm-border px-5 py-4">
            <h3 className="text-sm font-bold text-adm-fg">Recent activity</h3>
            <Button variant="ghost" size="sm" href="/admin/activity">View all</Button>
          </div>
          {logs.length === 0 ? (
            <div className="p-4"><EmptyState icon={<ActivityIcon className="h-5 w-5" />} title="No activity recorded yet" description="Admin actions are logged here as they happen." /></div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                  <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${l.status === "SUCCESS" ? "text-[#16a34a]" : "text-[#dc2626]"}`} />
                  <span className="flex-1 text-sm text-adm-fg"><span className="font-medium text-adm-fg">{l.action}</span> {l.entity} <span className="text-adm-muted">{l.entityId}</span></span>
                  <Badge tone={statusTone(l.status)}>{l.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
