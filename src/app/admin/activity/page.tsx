"use client";

import { PageHeader, Badge, statusTone } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { activityService } from "@/services/admin";
import type { ActivityLog } from "@/lib/admin/types";

const columns: Column<ActivityLog>[] = [
  { key: "timestamp", header: "Timestamp", sortable: true, render: (r) => <span className="text-xs text-adm-muted">{new Date(r.timestamp).toLocaleString("en-IN")}</span> },
  { key: "admin", header: "Admin", render: (r) => <span className="text-sm text-adm-fg">{r.admin}</span> },
  { key: "action", header: "Action", render: (r) => <Badge tone="blue">{r.action}</Badge> },
  { key: "entity", header: "Entity", render: (r) => <span className="text-sm">{r.entity} <span className="font-mono text-xs text-adm-muted">{r.entityId}</span></span> },
  { key: "status", header: "Status", render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
  { key: "ip", header: "IP", render: (r) => <span className="font-mono text-xs text-adm-muted">{r.ip}</span> },
];

export default function ActivityPage() {
  return (
    <div>
      <PageHeader title="Activity log" subtitle="Audit trail of admin actions across the platform." />
      <DataTable
        columns={columns}
        fetcher={(p) => activityService.query(p)}
        searchPlaceholder="Search actions, entities..."
        filters={[
          { key: "action", label: "All actions", options: ["CREATE", "UPDATE", "DELETE", "APPROVE", "GENERATE", "ISSUE", "SEND", "ACTIVATE"].map((s) => ({ value: s, label: s })) },
          { key: "status", label: "All", options: [{ value: "SUCCESS", label: "Success" }, { value: "FAILED", label: "Failed" }] },
        ]}
        emptyTitle="No activity recorded"
      />
    </div>
  );
}
