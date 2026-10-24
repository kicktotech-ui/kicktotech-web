"use client";

import { PageHeader, Badge, Button, statusTone } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useToast } from "@/components/admin/toast";
import { sessionService } from "@/services/admin";
import { domainLabel } from "@/data/admin";
import type { LiveSession } from "@/lib/admin/types";
import { CalendarPlus, Video } from "lucide-react";
import { formatDate } from "@/lib/utils";

const columns: Column<LiveSession>[] = [
  { key: "title", header: "Session", sortable: true, render: (r) => <div className="flex items-center gap-2"><Video className="h-4 w-4 text-adm-muted" /><span className="font-medium text-adm-fg">{r.title}</span></div> },
  { key: "domainId", header: "Domain", render: (r) => <span className="text-xs font-medium">{domainLabel[r.domainId] || r.domainId || "General"}</span> },
  { key: "mentorName", header: "Mentor", render: (r) => <span className="text-sm text-adm-muted">{r.mentorName}</span> },
  { key: "date", header: "Date", sortable: true, render: (r) => <span className="text-sm">{formatDate(r.date)}</span> },
  { key: "startTime", header: "Time", render: (r) => <span className="text-xs text-adm-muted">{r.startTime}–{r.endTime}</span> },
  { key: "attendees", header: "Attendees", sortable: true, render: (r) => <span className="text-sm">{r.attendees}/{r.capacity}</span> },
  { key: "status", header: "Status", render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
];

export default function SessionsPage() {
  const toast = useToast();
  return (
    <div>
      <PageHeader title="Live sessions" subtitle="Schedule and manage live sessions across all domains."
        actions={<Button variant="primary" onClick={() => toast.info("Session scheduler opens.")}><CalendarPlus className="h-4 w-4" /> Schedule session</Button>} />
      <DataTable
        columns={columns}
        fetcher={(p) => sessionService.query(p)}
        searchPlaceholder="Search sessions..."
        filters={[
          { key: "status", label: "All statuses", options: ["UPCOMING", "LIVE", "COMPLETED", "CANCELLED"].map((s) => ({ value: s, label: s })) },
          { key: "domain", label: "All domains", options: Object.entries(domainLabel).map(([value, label]) => ({ value, label })) },
        ]}
        emptyTitle="No sessions scheduled"
      />
    </div>
  );
}
