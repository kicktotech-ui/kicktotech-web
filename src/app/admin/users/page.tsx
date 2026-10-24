"use client";

import { useState } from "react";
import { PageHeader, Badge, Button, statusTone } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useToast } from "@/components/admin/toast";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Users, Shield, Download, Mail, CheckCircle2 } from "lucide-react";

interface AdminUserRow {
  id: string;
  type: string;
  role: string;
  name: string;
  email: string;
  phone?: string;
  college?: string;
  company?: string;
  status: string;
  createdAt: string;
}

const columns: Column<AdminUserRow>[] = [
  {
    key: "name",
    header: "User",
    sortable: true,
    render: (r) => (
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white bg-[#0057ff]">
          {r.name?.[0] || "U"}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-adm-fg">{r.name}</p>
          <p className="truncate text-xs text-adm-muted">{r.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: "role",
    header: "Role",
    render: (r) => (
      <Badge tone={r.type === "admin" ? "blue" : "neutral"}>
        {r.type === "admin" ? "ADMIN" : r.role ? r.role.toUpperCase() : "STUDENT"}
      </Badge>
    ),
  },
  {
    key: "college",
    header: "College / Org",
    render: (r) => (
      <span className="text-xs text-adm-muted">
        {r.college || r.company || "—"}
      </span>
    ),
  },
  {
    key: "phone",
    header: "Phone",
    render: (r) => (
      <span className="font-mono text-xs text-adm-muted">
        {r.phone || "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (r) => (
      <Badge tone={r.status === "active" ? "green" : "neutral"}>
        {r.status?.toUpperCase() || "ACTIVE"}
      </Badge>
    ),
  },
  {
    key: "createdAt",
    header: "Registered",
    sortable: true,
    render: (r) => (
      <span className="text-xs text-adm-muted">
        {r.createdAt ? formatDate(r.createdAt) : "—"}
      </span>
    ),
  },
];

export default function AdminUsersPage() {
  const toast = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  async function fetchUsers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) {
    const q = new URLSearchParams();
    q.set("page", String(params.page ?? 1));
    q.set("pageSize", String(params.pageSize ?? 10));
    if (params.search) q.set("search", params.search);

    const res = await api.get<{
      rows: AdminUserRow[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/admin/users?${q.toString()}`);

    return {
      rows: res.rows || [],
      total: res.total || 0,
      page: res.page || 1,
      pageSize: res.pageSize || 10,
    };
  }

  return (
    <div>
      <PageHeader
        title="Registered Users"
        subtitle="Browse all registered students and accounts in the MongoDB database."
        actions={
          <Button
            variant="secondary"
            onClick={() => toast.info("Exporting user directory...")}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <DataTable
        columns={columns}
        fetcher={fetchUsers}
        searchPlaceholder="Search by name, email, phone, college..."
        refreshKey={refreshKey}
        emptyTitle="No users found"
        emptyDescription="No registered users match your criteria."
      />
    </div>
  );
}
