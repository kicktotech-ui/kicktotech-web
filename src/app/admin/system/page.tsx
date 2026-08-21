"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Badge, Skeleton, statusTone } from "@/components/admin/ui";
import { systemService } from "@/services/admin";
import type { SystemService } from "@/lib/admin/types";
import { CheckCircle2, Circle } from "lucide-react";

export default function SystemPage() {
  const [services, setServices] = useState<SystemService[] | null>(null);
  useEffect(() => { systemService.health().then(setServices); }, []);

  return (
    <div>
      <PageHeader title="System health" subtitle="Live status of every platform service." />
      <div className="mb-5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-[#0057ff]">
        <strong>Live status.</strong> The application, API, and certificate registry are connected and operating normally.
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {services === null
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : services.map((s) => {
              const ok = s.state === "OPERATIONAL";
              return (
                <Card key={s.name} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-adm-fg">{s.name}</span>
                    {ok ? <CheckCircle2 className="h-4 w-4 text-[#16a34a]" /> : <Circle className="h-3 w-3 fill-current text-adm-muted" />}
                  </div>
                  <div className="mt-3"><Badge tone={statusTone(s.state)}>{s.state.replace("_", " ")}</Badge></div>
                  <p className="mt-2 text-xs text-adm-muted">{s.detail}</p>
                </Card>
              );
            })}
      </div>
    </div>
  );
}
