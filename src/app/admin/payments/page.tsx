"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge, Button, statusTone } from "@/components/admin/ui";
import { StatCard } from "@/components/admin/charts";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useToast } from "@/components/admin/toast";
import { paymentService } from "@/services/admin";
import { domainLabel } from "@/data/admin";
import type { Payment } from "@/lib/admin/types";
import { Download } from "lucide-react";
import { formatDate, formatINR } from "@/lib/utils";

const columns: Column<Payment>[] = [
  { key: "paymentId", header: "Payment ID", render: (r) => <span className="font-mono text-xs text-adm-muted">{r.paymentId}</span> },
  { key: "internName", header: "Intern", sortable: true, render: (r) => <div><p className="font-medium text-adm-fg">{r.internName}</p><p className="font-mono text-[11px] text-adm-muted">{r.internRef}</p></div> },
  { key: "amountRupees", header: "Amount", sortable: true, render: (r) => <span className="font-semibold">{formatINR(r.amountRupees)}</span> },
  { key: "domainId", header: "Domain", render: (r) => <span className="text-xs">{(r.domainId && domainLabel[r.domainId]?.split(" ")[0]) || r.domainId || "General"}</span> },
  { key: "method", header: "Method", render: (r) => <span className="text-xs text-adm-muted">{r.method}</span> },
  { key: "status", header: "Status", render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
  { key: "date", header: "Date", sortable: true, render: (r) => <span className="text-xs text-adm-muted">{formatDate(r.date)}</span> },
];

export default function PaymentsPage() {
  const toast = useToast();
  const [stats, setStats] = useState({ revenue: 0, paid: 0, pending: 0, failed: 0 });

  useEffect(() => {
    (async () => {
      const all = await paymentService.all();
      setStats({
        revenue: all.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amountRupees, 0),
        paid: all.filter((p) => p.status === "PAID").length,
        pending: all.filter((p) => p.status === "PENDING").length,
        failed: all.filter((p) => p.status === "FAILED").length,
      });
    })();
  }, []);

  return (
    <div>
      <PageHeader title="Payments" subtitle="Track revenue, verify payments, and manage refunds."
        actions={<Button variant="secondary" onClick={() => toast.success("Export started.")}><Download className="h-4 w-4" /> Export</Button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total revenue" value={stats.revenue} format="currency" accent="#16a34a" />
        <StatCard label="Paid" value={stats.paid} accent="#0057ff" />
        <StatCard label="Pending" value={stats.pending} accent="#f5c400" />
        <StatCard label="Failed" value={stats.failed} accent="#dc2626" />
      </div>
      <DataTable
        columns={columns}
        fetcher={(p) => paymentService.query(p)}
        searchPlaceholder="Search by payment ID, intern, reference..."
        selectable
        filters={[
          { key: "status", label: "All statuses", options: ["PENDING", "PAID", "FAILED", "REFUNDED"].map((s) => ({ value: s, label: s })) },
          { key: "domain", label: "All domains", options: Object.entries(domainLabel).map(([value, label]) => ({ value, label })) },
        ]}
        bulkActions={(rows, clear) => (
          <>
            <Button size="sm" variant="success" onClick={() => { toast.success(`${rows.length} payments verified.`); clear(); }}>Mark verified</Button>
            <Button size="sm" variant="secondary" onClick={() => { toast.info(`Refund initiated for ${rows.length}.`); clear(); }}>Refund</Button>
          </>
        )}
        emptyTitle="No payments found"
      />
    </div>
  );
}
