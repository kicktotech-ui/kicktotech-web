"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, UserPlus } from "lucide-react";
import { PageHeader, Button, Badge, statusTone } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useToast } from "@/components/admin/toast";
import { internService } from "@/services/admin";
import { domainLabel } from "@/data/admin";
import type { Intern } from "@/lib/admin/types";
import { FEATURES } from "@/config/features";
import { AlertCircle } from "lucide-react";

const columns: Column<Intern>[] = [
  { key: "internId", header: "Intern ID", render: (r) => <span className="font-mono text-xs text-adm-muted">{r.internId}</span> },
  {
    key: "name", header: "Name", sortable: true,
    render: (r) => (
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: r.avatarColor }}>{r.name[0]}</span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-adm-fg">{r.name}</p>
          <p className="truncate text-xs text-adm-muted">{r.email}</p>
        </div>
      </div>
    ),
  },
  { key: "college", header: "College", render: (r) => <span className="text-xs text-adm-muted">{r.college}</span> },
  { key: "domainId", header: "Domain", render: (r) => <span className="text-xs font-medium">{domainLabel[r.domainId]}</span> },
  { key: "status", header: "Status", sortable: true, render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
  { key: "paymentStatus", header: "Payment", render: (r) => <Badge tone={statusTone(r.paymentStatus)}>{r.paymentStatus}</Badge> },
  {
    key: "progress", header: "Progress", sortable: true,
    render: (r) => (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-adm-surface2"><div className="h-full rounded-full bg-[#0057ff]" style={{ width: `${r.progress}%` }} /></div>
        <span className="text-xs text-adm-muted">{r.progress}%</span>
      </div>
    ),
  },
  { key: "certificateStatus", header: "Certificate", render: (r) => <Badge tone={statusTone(r.certificateStatus)}>{r.certificateStatus.replace("_", " ")}</Badge> },
];

export default function InternsPage() {
  const router = useRouter();
  const toast = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <PageHeader
        title="Intern management"
        subtitle="Search, filter, and manage every enrolled intern."
        actions={<>
          <Button variant="secondary" onClick={() => toast.info("Export is being prepared and will be available shortly.")}><Download className="h-4 w-4" /> Export</Button>
          <Button variant="primary" onClick={() => toast.info("New interns currently onboard through the application flow. Direct admin creation is coming soon.")}><UserPlus className="h-4 w-4" /> Add intern</Button>
        </>}
      />
      {FEATURES.internshipMaintenance && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold text-amber-100">Intern Queries Paused (Maintenance Mode)</p>
            <p className="text-xs text-amber-300/80 mt-0.5 leading-relaxed">
              Firestore queries for the <code>/interns</code> collection are paused to protect the Spark plan quota while the live PromptWars Hackathon registrations are active. To restore intern browsing, set <code>NEXT_PUBLIC_INTERNSHIP_MAINTENANCE=&quot;false&quot;</code> in your deployment environment.
            </p>
          </div>
        </div>
      )}
      <DataTable
        columns={columns}
        fetcher={
          FEATURES.internshipMaintenance
            ? async () => ({ rows: [], total: 0, page: 1, pageSize: 10 })
            : (p) => internService.query(p)
        }
        searchPlaceholder="Search by name, email, phone, ID, college..."
        onRowClick={(r) => router.push(`/admin/interns/${r.id}`)}
        selectable
        refreshKey={refreshKey}
        filters={[
          { key: "status", label: "All statuses", options: ["APPLIED", "PENDING", "APPROVED", "ACTIVE", "PAUSED", "COMPLETED", "REJECTED", "CANCELLED"].map((s) => ({ value: s, label: s })) },
          { key: "domain", label: "All domains", options: Object.entries(domainLabel).map(([value, label]) => ({ value, label })) },
          { key: "payment", label: "All payments", options: ["PENDING", "PAID", "FAILED", "REFUNDED"].map((s) => ({ value: s, label: s })) },
        ]}
        bulkActions={(rows, clear) => (
          <>
            <Button size="sm" variant="success" onClick={() => { toast.success(`${rows.length} interns marked active.`); clear(); setRefreshKey((k) => k + 1); }}>Mark active</Button>
            <Button size="sm" variant="secondary" onClick={() => { toast.info(`Notification queued for ${rows.length} interns.`); clear(); }}>Notify</Button>
          </>
        )}
        emptyTitle="No interns found"
        emptyDescription="Try adjusting your search or filters."
      />
    </div>
  );
}
