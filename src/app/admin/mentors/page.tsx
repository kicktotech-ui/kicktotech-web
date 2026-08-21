"use client";

import { PageHeader, Badge, Button, statusTone } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useToast } from "@/components/admin/toast";
import { mentorService } from "@/services/admin";
import { domainLabel } from "@/data/admin";
import type { Mentor } from "@/lib/admin/types";
import { UserPlus } from "lucide-react";

const columns: Column<Mentor>[] = [
  {
    key: "name", header: "Mentor", sortable: true,
    render: (r) => (
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: r.avatarColor }}>{r.name[0]}</span>
        <div><p className="font-semibold text-adm-fg">{r.name}</p><p className="text-xs text-adm-muted">{r.email}</p></div>
      </div>
    ),
  },
  { key: "domainIds", header: "Domains", render: (r) => <div className="flex flex-wrap gap-1">{r.domainIds.map((d) => <Badge key={d} tone="neutral">{domainLabel[d].split(" ")[0]}</Badge>)}</div> },
  { key: "skills", header: "Skills", render: (r) => <span className="text-xs text-adm-muted">{r.skills.join(", ")}</span> },
  { key: "experienceYears", header: "Exp", sortable: true, render: (r) => <span className="text-sm">{r.experienceYears} yrs</span> },
  { key: "assignedInterns", header: "Interns", sortable: true, render: (r) => <span className="text-sm font-semibold">{r.assignedInterns}</span> },
  { key: "sessions", header: "Sessions", sortable: true, render: (r) => <span className="text-sm">{r.sessions}</span> },
  { key: "status", header: "Status", render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
];

export default function MentorsPage() {
  const toast = useToast();
  return (
    <div>
      <PageHeader title="Mentors" subtitle="Manage the mentor network, domains, and assignments."
        actions={<Button variant="primary" onClick={() => toast.info("Add mentor form.")}><UserPlus className="h-4 w-4" /> Add mentor</Button>} />
      <DataTable
        columns={columns}
        fetcher={(p) => mentorService.query(p)}
        searchPlaceholder="Search mentors by name or skill..."
        filters={[{ key: "status", label: "All", options: [{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }] }]}
        emptyTitle="No mentors added yet"
        emptyDescription="Add your first mentor to start managing the mentor network."
      />
    </div>
  );
}
