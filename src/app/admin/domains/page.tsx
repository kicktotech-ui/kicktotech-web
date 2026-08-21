"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Badge, Button, Skeleton, Input, Field } from "@/components/admin/ui";
import { Drawer } from "@/components/admin/overlays";
import { useToast } from "@/components/admin/toast";
import { domainService } from "@/services/admin";
import type { Domain } from "@/lib/admin/types";
import { Pencil, Users, GraduationCap, GripVertical, Plus } from "lucide-react";
import { formatINR } from "@/lib/utils";

const KIND_TONE = { week: "blue", project: "yellow", assessment: "purple", certification: "green" } as const;

export default function DomainsPage() {
  const toast = useToast();
  const [domains, setDomains] = useState<Domain[] | null>(null);
  const [active, setActive] = useState<Domain | null>(null);

  useEffect(() => { domainService.all().then(setDomains); }, []);

  return (
    <div>
      <PageHeader title="Domains & roadmaps" subtitle="Manage content, roadmap, and pricing for the four official domains." />
      <div className="grid gap-4 sm:grid-cols-2">
        {domains === null
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)
          : domains.map((d) => (
              <Card key={d.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.accent }} />
                      <h3 className="text-base font-bold text-adm-fg">{d.title}</h3>
                    </div>
                    <p className="font-mono text-xs text-adm-muted">{d.slug}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-adm-muted line-through">{formatINR(d.originalPriceRupees)}</span>
                    <span className="ml-1.5 rounded bg-[#f5c400] px-2 py-0.5 text-sm font-bold text-black">{formatINR(d.priceRupees)}</span>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-adm-muted">{d.description}</p>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-adm-muted"><Users className="h-4 w-4 text-adm-muted" /> {d.enrolled} enrolled</span>
                  <span className="inline-flex items-center gap-1.5 text-adm-muted"><GraduationCap className="h-4 w-4 text-adm-muted" /> {d.completionRate}% complete</span>
                </div>
                <Button variant="secondary" className="mt-4 w-full" onClick={() => setActive(d)}><Pencil className="h-4 w-4" /> Edit content</Button>
              </Card>
            ))}
      </div>

      <Drawer open={!!active} onClose={() => setActive(null)} title={active ? active.title : ""}
        footer={<><Button variant="secondary" onClick={() => setActive(null)}>Close</Button><Button variant="primary" onClick={() => { toast.success("Domain content saved."); setActive(null); }}>Save changes</Button></>}>
        {active && (
          <div className="space-y-6">
            <section>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-adm-muted">Pricing</h4>
              <div className="flex gap-3">
                <Field className="flex-1" label="Price (₹)"><Input defaultValue={active.priceRupees} type="number" /></Field>
                <Field className="flex-1" label="Original (₹)"><Input defaultValue={active.originalPriceRupees} type="number" /></Field>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-adm-muted">Roadmap</h4>
                <Button size="sm" variant="ghost" onClick={() => toast.info("Add module.")}><Plus className="h-3.5 w-3.5" /> Add module</Button>
              </div>
              <ul className="space-y-2">
                {active.roadmap.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-lg border border-adm-border bg-adm-surface px-3 py-2.5">
                    <GripVertical className="h-4 w-4 flex-shrink-0 text-adm-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-adm-fg">{m.title}</p>
                      <p className="truncate text-xs text-adm-muted">{m.summary}</p>
                    </div>
                    <Badge tone={KIND_TONE[m.kind]}>{m.durationLabel}</Badge>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-adm-muted">Resources</h4>
              <ul className="space-y-1.5">
                {active.resources.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg bg-adm-surface2 px-3 py-2 text-sm">
                    <span className="text-adm-fg">{r.title}</span><Badge tone="neutral">{r.type}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}
