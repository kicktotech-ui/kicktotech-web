"use client";

import { PageHeader, Badge, Button, statusTone } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useToast } from "@/components/admin/toast";
import { certificateService } from "@/services/admin";
import { domainLabel } from "@/data/admin";
import type { Certificate } from "@/lib/admin/types";
import { formatDate } from "@/lib/utils";

const columns: Column<Certificate>[] = [
  { key: "certificateId", header: "Certificate ID", render: (r) => <span className="font-mono text-xs text-adm-muted">{r.certificateId}</span> },
  { key: "internName", header: "Intern", sortable: true, render: (r) => <div><p className="font-medium text-adm-fg">{r.internName}</p><p className="font-mono text-[11px] text-adm-muted">{r.internRef}</p></div> },
  { key: "program", header: "Program", render: (r) => <span className="text-xs text-adm-muted">{r.program}</span> },
  { key: "grade", header: "Grade", sortable: true, render: (r) => <span className="font-bold">{r.grade}</span> },
  { key: "status", header: "Status", render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
  { key: "issuedAt", header: "Issued", render: (r) => <span className="text-xs text-adm-muted">{r.issuedAt ? formatDate(r.issuedAt) : "—"}</span> },
];

export default function CertificatesPage() {
  const toast = useToast();
  return (
    <div>
      <PageHeader title="Certificates" subtitle="All generated and issued certificates." />
      <DataTable
        columns={columns}
        fetcher={(p) => certificateService.query(p)}
        searchPlaceholder="Search by certificate ID, intern..."
        selectable
        filters={[
          { key: "status", label: "All statuses", options: ["ELIGIBLE", "PENDING", "GENERATED", "ISSUED", "FAILED", "REVOKED"].map((s) => ({ value: s, label: s })) },
          { key: "domain", label: "All domains", options: Object.entries(domainLabel).map(([value, label]) => ({ value, label })) },
        ]}
        bulkActions={(rows, clear) => (
          <>
            <Button size="sm" variant="primary" onClick={() => { toast.success(`${rows.length} certificates issued.`); clear(); }}>Issue</Button>
            <Button size="sm" variant="secondary" onClick={() => { toast.info(`${rows.length} certificates emailed.`); clear(); }}>Send</Button>
          </>
        )}
        emptyTitle="No certificates yet"
      />
    </div>
  );
}
