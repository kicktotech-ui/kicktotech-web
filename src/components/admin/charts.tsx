"use client";

import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn, formatINR } from "@/lib/utils";
import { Card } from "./ui";

/* Lightweight, dependency-free SVG data-viz for the admin console. */

export function Sparkline({ data, color = "#0057ff", className }: { data: number[]; color?: string; className?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${30 - ((v - min) / range) * 28 - 1}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={cn("h-8 w-full", className)} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function StatCard({
  label, value, format = "number", changePct, trend, accent = "#0057ff",
}: {
  label: string; value: number; format?: "number" | "currency" | "percent"; changePct?: number; trend?: number[]; accent?: string;
}) {
  const display = format === "currency" ? formatINR(value) : format === "percent" ? `${value}%` : value.toLocaleString("en-IN");
  const up = (changePct ?? 0) >= 0;
  // Only show a trend when there is a real, non-zero comparison — never fake "↗ 0%".
  const showTrend = typeof changePct === "number" && changePct !== 0;
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-adm-muted">{label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight text-adm-fg">{display}</span>
        {showTrend && (
          <span className={cn("mb-1 inline-flex items-center gap-0.5 text-xs font-semibold", up ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(changePct)}%
          </span>
        )}
      </div>
      {trend && <div className="mt-3"><Sparkline data={trend} color={accent} /></div>}
    </Card>
  );
}

export function LineChart({ data, color = "#0057ff", height = 180 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  const max = Math.max(...data.map((d) => d.value)) || 1;
  const w = 100, h = 100;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.value / max) * (h - 8) - 2}`).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height }} className="w-full" aria-hidden>
        <polygon points={area} fill={color} opacity="0.08" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-adm-muted">
        {data.map((d) => <span key={d.label}>{d.label}</span>)}
      </div>
    </div>
  );
}

export function BarList({ items }: { items: { label: string; value: number; accent: string; suffix?: string }[] }) {
  const max = Math.max(...items.map((i) => i.value)) || 1;
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-adm-fg">{it.label}</span>
            <span className="font-semibold text-adm-fg">{it.value.toLocaleString("en-IN")}{it.suffix}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-adm-surface2">
            <div className="h-full rounded-full" style={{ width: `${(it.value / max) * 100}%`, backgroundColor: it.accent }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const max = steps[0]?.value || 1;
  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => {
        const pct = Math.round((s.value / max) * 100);
        return (
          <div key={s.label} className="flex items-center gap-3">
            <span className="w-24 flex-shrink-0 text-xs font-medium text-adm-fg">{s.label}</span>
            <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-adm-surface2">
              <div className="flex h-full items-center rounded-md px-2 text-[11px] font-bold text-white" style={{ width: `${pct}%`, backgroundColor: i === steps.length - 1 ? "#16a34a" : "#0057ff", opacity: 1 - i * 0.09 }}>
                {s.value}
              </div>
            </div>
            <span className="w-9 flex-shrink-0 text-right text-[11px] font-semibold text-adm-muted">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

export function ChartCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-adm-fg">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-adm-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
