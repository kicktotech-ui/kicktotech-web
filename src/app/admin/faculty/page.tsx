"use client";

import { PageHeader, Badge, Button, statusTone } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useToast } from "@/components/admin/toast";
import { facultyService } from "@/services/admin";
import { domainLabel } from "@/data/admin";
import type { Faculty } from "@/lib/admin/types";
import { UserPlus } from "lucide-react";

const columns: Column<Faculty>[] = [
  { key: "name", header: "Faculty", sortable: true, render: (r) => <div><p className="font-semibold text-adm-fg">{r.name}</p><p className="text-xs text-adm-muted">{r.designation}</p></div> },
  { key: "department", header: "Department", render: (r) => <span className="text-sm text-adm-muted">{r.department}</span> },
  { key: "college", header: "College", render: (r) => <span className="text-xs text-adm-muted">{r.college}</span> },
  { key: "domainIds", header: "Domains", render: (r) => <div className="flex flex-wrap gap-1">{r.domainIds.map((d) => <Badge key={d} tone="neutral">{domainLabel[d].split(" ")[0]}</Badge>)}</div> },
  { key: "status", header: "Status", render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
];

export default function FacultyPage() {
  const toast = useToast();
  return (
    <div>
      <PageHeader title="Faculty" subtitle="College faculty coordinators and their assigned domains."
        actions={<Button variant="primary" onClick={() => toast.info("Add faculty form.")}><UserPlus className="h-4 w-4" /> Add faculty</Button>} />
      <DataTable
        columns={columns}
        fetcher={(p) => facultyService.query(p)}
        searchPlaceholder="Search faculty..."
        filters={[{ key: "status", label: "All", options: [{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }] }]}
        emptyTitle="No faculty added yet"
      />
    </div>
  );
}
