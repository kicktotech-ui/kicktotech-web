"use client";

import { useState } from "react";
import { PageHeader, Badge, Button, statusTone, Input, Select, Field } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Modal } from "@/components/admin/overlays";
import { useToast } from "@/components/admin/toast";
import { activationService } from "@/services/admin";
import { domainLabel } from "@/data/admin";
import type { Activation, DomainSlug } from "@/lib/admin/types";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

const columns: Column<Activation>[] = [
  { key: "code", header: "Code", render: (r) => <span className="rounded bg-neutral-900 px-2 py-0.5 font-mono text-xs font-bold text-[#f5c400]">{r.code}</span> },
  { key: "internName", header: "Intern", render: (r) => r.internName ? <div><p className="font-medium text-adm-fg">{r.internName}</p><p className="text-xs text-adm-muted">{r.internEmail}</p></div> : <span className="text-xs text-adm-muted">Unassigned</span> },
  { key: "domainId", header: "Domain", render: (r) => <Badge tone="neutral">{(r.domainId && domainLabel[r.domainId]?.split(" ")[0]) || r.domainId || "General"}</Badge> },
  { key: "status", header: "Status", render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
  { key: "createdAt", header: "Created", sortable: true, render: (r) => <span className="text-xs text-adm-muted">{formatDate(r.createdAt)}</span> },
  { key: "expiresAt", header: "Expires", sortable: true, render: (r) => <span className="text-xs text-adm-muted">{formatDate(r.expiresAt)}</span> },
];

export default function ActivationsPage() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", domainId: "python" as DomainSlug });

  const create = async () => {
    await activationService.create({
      code: String(Math.floor(1000 + Math.random() * 8999)),
      internName: form.name || undefined,
      internEmail: form.email || undefined,
      domainId: form.domainId,
      status: "AVAILABLE",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 90 * 864e5).toISOString(),
    } as Omit<Activation, "id">);
    setOpen(false);
    setForm({ name: "", email: "", domainId: "python" });
    setRefreshKey((k) => k + 1);
    toast.success("Activation code created.");
  };

  return (
    <div>
      <PageHeader title="Manual activation" subtitle="Create and manage activation codes for interns added manually."
        actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add intern</Button>} />
      <DataTable
        columns={columns}
        fetcher={(p) => activationService.query(p)}
        searchPlaceholder="Search by code, name, email..."
        refreshKey={refreshKey}
        filters={[
          { key: "status", label: "All statuses", options: ["AVAILABLE", "USED", "EXPIRED", "REVOKED"].map((s) => ({ value: s, label: s })) },
          { key: "domain", label: "All domains", options: Object.entries(domainLabel).map(([value, label]) => ({ value, label })) },
        ]}
        emptyTitle="No activation codes yet"
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Create activation code"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={create}>Create code</Button></>}>
        <div className="space-y-4">
          <Field label="Intern name (optional)"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></Field>
          <Field label="Email (optional)"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="intern@example.com" /></Field>
          <Field label="Domain"><Select value={form.domainId} onChange={(e) => setForm({ ...form, domainId: e.target.value as DomainSlug })}>{Object.entries(domainLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        </div>
      </Modal>
    </div>
  );
}
