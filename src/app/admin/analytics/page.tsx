"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { PageHeader, Card, Skeleton, EmptyState, Button } from "@/components/admin/ui";
import { StatCard, ChartCard, LineChart, BarList, Funnel } from "@/components/admin/charts";
import { analyticsService } from "@/services/admin";
import type { DashboardData } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

const RANGES = ["7 days", "30 days", "90 days", "All time"];

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-adm-border text-center">
      <BarChart3 className="h-6 w-6 text-adm-muted" />
      <p className="mt-2 max-w-xs text-sm text-adm-muted">{message}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30 days");

  useEffect(() => {
    analyticsService.dashboard().then((d) => { setData(d.data); setLoading(false); });
  }, []);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Enrollment, revenue, domains, and conversion insights."
        actions={
          <div className="flex rounded-lg border border-adm-border bg-adm-surface p-0.5">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setRange(r)} className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors", range === r ? "bg-adm-fg text-adm-bg" : "text-adm-muted hover:text-adm-fg")}>{r}</button>
            ))}
          </div>
        } />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : !data ? (
        <Card className="p-4">
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title="No analytics data available yet"
            description="Charts and metrics will populate automatically once the backend API is connected and real enrollment, revenue, and certification data starts flowing."
            action={<Button variant="secondary" href="/admin/system">View system status</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {data.metrics.slice(0, 4).map((m) => <StatCard key={m.key} label={m.label} value={m.value} format={m.format} changePct={m.changePct} trend={m.trend} />)}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard title="Enrollment over time" subtitle={range}>
              {data.enrollmentTrend.length > 1
                ? <LineChart data={data.enrollmentTrend} color="#0057ff" />
                : <ChartEmpty message="No enrollment activity in this period." />}
            </ChartCard>
            <ChartCard title="Revenue over time" subtitle={range}>
              {data.revenueTrend.length > 1
                ? <LineChart data={data.revenueTrend} color="#16a34a" />
                : <ChartEmpty message="No revenue data available for this period." />}
            </ChartCard>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard title="Domain popularity" subtitle="Interns per track"><BarList items={data.domainDistribution.map((d) => ({ label: d.label, value: d.value, accent: "#0057ff" }))} /></ChartCard>
            <ChartCard title="Conversion funnel" subtitle="Application → Certified"><Funnel steps={data.funnel} /></ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
