"use client";

import { useState } from "react";
import { PageHeader, Badge, Button } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useToast } from "@/components/admin/toast";
import { api, ApiError } from "@/lib/api";
import { adminApplicationService, type AdminApplication, type AdminApplicationStatus } from "@/services/admin";
import { DOMAIN_META, normalizeCertificateDomain } from "@/lib/certificates/mentors";
import { formatDate } from "@/lib/utils";
import { BadgeCheck, XCircle, Award, ExternalLink } from "lucide-react";

const STATUS_TONE: Record<AdminApplicationStatus, "neutral" | "yellow" | "green" | "red" | "blue"> = {
  PAYMENT_PENDING: "neutral",
  PAYMENT_PROOF_SUBMITTED: "yellow",
  PAYMENT_VERIFIED: "green",
  PAYMENT_REJECTED: "red",
  CERTIFICATE_ISSUED: "blue",
};

const STATUS_LABEL: Record<AdminApplicationStatus, string> = {
  PAYMENT_PENDING: "Payment pending",
  PAYMENT_PROOF_SUBMITTED: "Proof submitted",
  PAYMENT_VERIFIED: "Payment verified",
  PAYMENT_REJECTED: "Payment rejected",
  CERTIFICATE_ISSUED: "Certificate issued",
};

export default function ApplicationsPage() {
  const toast = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = () => setRefreshKey((k) => k + 1);

  async function decide(app: AdminApplication, action: "verify" | "reject") {
    if (action === "reject" && !window.confirm(`Reject payment for ${app.name} (${app.applicationId})?`)) return;
    setBusy(app.applicationId);
    try {
      await adminApplicationService.decide(app.applicationId, action);
      toast.success(action === "verify" ? `Payment verified for ${app.name}.` : `Payment rejected for ${app.name}.`);
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Action failed.");
    } finally { setBusy(null); }
  }

  async function issue(app: AdminApplication) {
    setBusy(app.applicationId);
    try {
      const domain = normalizeCertificateDomain(app.domain);
      const res = await api.post<{ certificate: { certificateId: string }; verificationUrl: string; duplicate: boolean }>(
        "/admin/certificates",
        {
          recipientName: app.name, email: app.email, domain,
          program: DOMAIN_META[domain].program, mentorId: app.mentorId, applicationId: app.applicationId,
        },
      );
      toast.success(res.duplicate ? `Already issued: ${res.certificate.certificateId}` : `Certificate issued: ${res.certificate.certificateId}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not issue certificate.");
    } finally { setBusy(null); }
  }

  const columns: Column<AdminApplication>[] = [
    { key: "name", header: "Applicant", sortable: true, render: (r) => <div><p className="font-semibold text-adm-fg">{r.name}</p><p className="text-xs text-adm-muted">{r.email}</p><p className="font-mono text-[11px] text-adm-muted">{r.applicationId}</p></div> },
    { key: "domain", header: "Domain / Mentor", render: (r) => <div className="text-xs"><p className="font-medium">{DOMAIN_META[normalizeCertificateDomain(r.domain)].label}</p><p className="text-adm-muted">{r.mentorName ?? "—"}</p></div> },
    { key: "amount", header: "Amount", render: (r) => <span className="text-xs font-medium">₹{r.amount}</span> },
    { key: "status", header: "Payment", sortable: true, render: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
    { key: "createdAt", header: "Submitted", sortable: true, render: (r) => <span className="text-xs text-adm-muted">{formatDate(r.createdAt)}</span> },
    {
      key: "id", header: "Actions", render: (r) => {
        const disabled = busy === r.applicationId;
        if (r.status === "CERTIFICATE_ISSUED") {
          return <a href={`/verify_cert?cert=${encodeURIComponent(r.certificateId ?? "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#0057ff]"><ExternalLink className="h-3.5 w-3.5" /> {r.certificateId}</a>;
        }
        if (r.status === "PAYMENT_VERIFIED") {
          return <Button size="sm" variant="primary" disabled={disabled} onClick={() => issue(r)}><Award className="h-4 w-4" /> Issue certificate</Button>;
        }
        return (
          <div className="flex gap-1.5">
            <Button size="sm" variant="success" disabled={disabled} onClick={() => decide(r, "verify")}><BadgeCheck className="h-4 w-4" /> Verify</Button>
            <Button size="sm" variant="danger" disabled={disabled} onClick={() => decide(r, "reject")}><XCircle className="h-4 w-4" /> Reject</Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="Applications" subtitle="Manage and verify ₹449 Internship applications, then issue certificates." />
      <DataTable
        columns={columns}
        fetcher={(p) => adminApplicationService.query({ ...p, type: "internship" })}
        searchPlaceholder="Search name, email, application ID..."
        refreshKey={refreshKey}
        filters={[
          { key: "status", label: "All statuses", options: (Object.keys(STATUS_LABEL) as AdminApplicationStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] })) },
        ]}
        emptyTitle="No applications yet"
      />
    </div>
  );
}
