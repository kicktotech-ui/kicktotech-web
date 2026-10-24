"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge, Button, statusTone } from "@/components/admin/ui";
import { StatCard } from "@/components/admin/charts";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useToast } from "@/components/admin/toast";
import { certificateService } from "@/services/admin";
import { domainLabel } from "@/data/admin";
import type { Certificate } from "@/lib/admin/types";
import { FileBadge, ShieldCheck, Eye, Mail } from "lucide-react";
import { CertificatePreviewModal } from "@/components/certificates/CertificatePreviewModal";

export default function CertificationPage() {
  const toast = useToast();
  const [stats, setStats] = useState({ eligible: 0, pending: 0, generated: 0, issued: 0, failed: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewId, setViewId] = useState<string | null>(null);

  useEffect(() => {
    certificateService.all().then((all) => setStats({
      eligible: all.filter((c) => c.status === "ELIGIBLE").length,
      pending: all.filter((c) => c.status === "PENDING").length,
      generated: all.filter((c) => c.status === "GENERATED").length,
      issued: all.filter((c) => c.status === "ISSUED").length,
      failed: all.filter((c) => c.status === "FAILED").length,
    }));
  }, [refreshKey]);

  const columns: Column<Certificate>[] = [
    { key: "internName", header: "Intern", sortable: true, render: (r) => <div><p className="font-medium text-adm-fg">{r.internName}</p><p className="font-mono text-[11px] text-adm-muted">{r.internRef}</p></div> },
    { key: "domainId", header: "Domain", render: (r) => <span className="text-xs text-adm-fg">{(r.domainId && domainLabel[r.domainId]?.split(" ")[0]) || r.domainId || "General"}</span> },
    { key: "grade", header: "Grade", render: (r) => <span className="font-bold text-adm-fg">{r.grade}</span> },
    { key: "certificateId", header: "Certificate ID", render: (r) => <span className="font-mono text-xs text-adm-muted">{r.certificateId || "—"}</span> },
    { key: "status", header: "Status", render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
    {
      key: "actions", header: "Actions", className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="secondary" onClick={() => setViewId(r.certificateId)} disabled={!r.certificateId}><Eye className="h-4 w-4" /> View</Button>
          <Button size="sm" variant="primary" onClick={() => toast.info("Issue new certificates from the Certificate studio (Templates).")}>Issue</Button>
          <Button
            size="sm"
            variant="secondary"
            title={r.internEmail ? `Email ${r.internEmail}` : "Email not available"}
            disabled={!r.internEmail}
            onClick={() => { if (r.internEmail) window.location.href = `mailto:${r.internEmail}`; }}
          >
            <Mail className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Certification" subtitle="Generate, issue, and manage internship certificates."
        actions={<><Button variant="secondary" href="/admin/certificate-templates"><FileBadge className="h-4 w-4" /> Templates</Button><Button variant="secondary" href="/admin/verify"><ShieldCheck className="h-4 w-4" /> Verify</Button></>} />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Eligible" value={stats.eligible} accent="#f5c400" />
        <StatCard label="Pending" value={stats.pending} accent="#0057ff" />
        <StatCard label="Generated" value={stats.generated} accent="#7c3aed" />
        <StatCard label="Issued" value={stats.issued} accent="#16a34a" />
        <StatCard label="Failed" value={stats.failed} accent="#dc2626" />
      </div>
      <DataTable
        columns={columns}
        fetcher={(p) => certificateService.query(p)}
        searchPlaceholder="Search by intern or certificate ID..."
        refreshKey={refreshKey}
        filters={[{ key: "status", label: "All statuses", options: ["ELIGIBLE", "PENDING", "GENERATED", "ISSUED", "FAILED", "REVOKED"].map((s) => ({ value: s, label: s })) }]}
        emptyTitle="No certificates in the queue"
      />
      <CertificatePreviewModal open={viewId !== null} certificateId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}
