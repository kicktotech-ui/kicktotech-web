"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge, statusTone } from "@/components/admin/ui";
import { StatCard } from "@/components/admin/charts";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { attendanceService } from "@/services/admin";
import { domainLabel } from "@/data/admin";
import type { AttendanceRecord } from "@/lib/admin/types";
import { formatDate } from "@/lib/utils";

const columns: Column<AttendanceRecord>[] = [
  { key: "internName", header: "Intern", sortable: true, render: (r) => <div><p className="font-medium text-adm-fg">{r.internName}</p><p className="font-mono text-[11px] text-adm-muted">{r.internId}</p></div> },
  { key: "sessionTitle", header: "Session", render: (r) => <span className="text-sm text-adm-muted">{r.sessionTitle}</span> },
  { key: "domainId", header: "Domain", render: (r) => <span className="text-xs">{(r.domainId && domainLabel[r.domainId]?.split(" ")[0]) || r.domainId || "General"}</span> },
  { key: "date", header: "Date", sortable: true, render: (r) => <span className="text-xs text-adm-muted">{formatDate(r.date)}</span> },
  { key: "state", header: "Attendance", render: (r) => <Badge tone={statusTone(r.state)}>{r.state}</Badge> },
];

export default function AttendancePage() {
  const [stats, setStats] = useState({ rate: 0, present: 0, absent: 0, late: 0 });

  useEffect(() => {
    (async () => {
      const all = await attendanceService.all();
      const present = all.filter((a) => a.state === "PRESENT").length;
      const absent = all.filter((a) => a.state === "ABSENT").length;
      const late = all.filter((a) => a.state === "LATE").length;
      setStats({ rate: Math.round(((present + late) / all.length) * 100), present, absent, late });
    })();
  }, []);

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Session attendance across all interns and domains." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Attendance rate" value={stats.rate} format="percent" accent="#16a34a" />
        <StatCard label="Present" value={stats.present} accent="#0057ff" />
        <StatCard label="Late" value={stats.late} accent="#f5c400" />
        <StatCard label="Absent" value={stats.absent} accent="#dc2626" />
      </div>
      <DataTable
        columns={columns}
        fetcher={(p) => attendanceService.query(p)}
        searchPlaceholder="Search by intern or session..."
        filters={[
          { key: "state", label: "All states", options: ["PRESENT", "ABSENT", "LATE", "EXCUSED"].map((s) => ({ value: s, label: s })) },
          { key: "domain", label: "All domains", options: Object.entries(domainLabel).map(([value, label]) => ({ value, label })) },
        ]}
        emptyTitle="No attendance records"
      />
    </div>
  );
}
