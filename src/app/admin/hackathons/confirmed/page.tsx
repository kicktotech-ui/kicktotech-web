"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader, Badge, Button } from "@/components/admin/ui";
import { StatCard } from "@/components/admin/charts";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useToast } from "@/components/admin/toast";
import {
  adminHackathonService,
  type AdminApplication,
} from "@/services/admin";
import { formatDate, formatINR } from "@/lib/utils";
import {
  BadgeCheck,
  Download,
  Users,
  ShieldCheck,
  Trophy,
} from "lucide-react";

export default function ConfirmedHackathonRegistrationsPage() {
  const toast = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState({
    confirmedCount: 0,
    revenue: 0,
    uniqueTeams: 0,
  });

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminHackathonService.queryConfirmed({ page: 1, pageSize: 2000 });
        const rows = res.rows;
        const revenue = rows.reduce((sum, r) => sum + (r.amount || 99), 0);
        const uniqueTeams = new Set(
          rows.map((r) => (r.teamName || "").trim().toLowerCase()).filter(Boolean),
        ).size;

        setStats({
          confirmedCount: res.total || rows.length,
          revenue,
          uniqueTeams,
        });
      } catch (err) {
        console.warn("[confirmed-hackathons] Failed loading metrics:", err);
      }
    })();
  }, [refreshKey]);

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await adminHackathonService.queryConfirmed({ page: 1, pageSize: 3000 });
      if (!res.rows.length) {
        toast.info("No confirmed hackathon participants to export.");
        return;
      }

      const headers = [
        "Unique ID",
        "Application ID",
        "Participant Name",
        "Email",
        "Phone",
        "College",
        "Course",
        "Year",
        "Team Name",
        "Fee (INR)",
        "Payment ID",
        "Order ID",
        "Registration Date",
      ];

      const csvRows = [headers.join(",")];
      for (const r of res.rows) {
        csvRows.push(
          [
            `"${r.kttId || ""}"`,
            `"${r.applicationId || ""}"`,
            `"${(r.name || "").replace(/"/g, '""')}"`,
            `"${r.email || ""}"`,
            `"${r.phone || ""}"`,
            `"${(r.college || "").replace(/"/g, '""')}"`,
            `"${(r.course || "").replace(/"/g, '""')}"`,
            `"${(r.year || "").replace(/"/g, '""')}"`,
            `"${(r.teamName || "").replace(/"/g, '""')}"`,
            `"${r.amount || 99}"`,
            `"${r.razorpayPaymentId || ""}"`,
            `"${r.razorpayOrderId || ""}"`,
            `"${r.createdAt || ""}"`,
          ].join(","),
        );
      }

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `confirmed_hackathon_participants_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${res.rows.length} confirmed participants.`);
    } catch (e) {
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  const columns: Column<AdminApplication>[] = [
    {
      key: "kttId",
      header: "Unique ID",
      sortable: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1">
          <Badge tone="green" className="font-mono font-bold text-xs">
            {r.kttId || "—"}
          </Badge>
        </span>
      ),
    },
    {
      key: "name",
      header: "Participant",
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-semibold text-adm-fg">{r.name}</p>
          <p className="text-xs text-adm-muted">{r.email}</p>
          <p className="font-mono text-[11px] text-adm-muted">{r.applicationId}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Contact",
      render: (r) => (
        <span className="font-mono text-xs text-adm-fg">
          {r.phone || "—"}
        </span>
      ),
    },
    {
      key: "college",
      header: "College & Academic",
      render: (r) => (
        <div className="text-xs">
          <p className="font-medium text-adm-fg">{r.college || "—"}</p>
          <p className="text-adm-muted">
            {r.course ? r.course : "—"} {r.year ? `• Year ${r.year}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "teamName",
      header: "Team Name",
      render: (r) => (
        <span className="text-xs font-semibold text-adm-fg">
          {r.teamName || "—"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Fee",
      render: (r) => (
        <span className="text-xs font-semibold text-adm-fg">
          {formatINR(r.amount || 99)}
        </span>
      ),
    },
    {
      key: "razorpayPaymentId",
      header: "Payment Reference",
      render: (r) => (
        <div className="flex flex-col gap-1 items-start">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified
          </span>
          {(r.razorpayPaymentId || r.razorpayOrderId) && (
            <span className="font-mono text-[10px] text-adm-muted">
              {r.razorpayPaymentId || r.razorpayOrderId}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Confirmed Date",
      sortable: true,
      render: (r) => (
        <span className="text-xs text-adm-muted">
          {formatDate(r.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Confirmed Registrations"
        subtitle="Verified and paid PromptWars participants with allocated unique sequential IDs (KTT01, KTT02, ...)."
        actions={
          <Button
            variant="secondary"
            disabled={isExporting}
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        }
      />

      {/* Metrics Cards */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Confirmed Participants"
          value={stats.confirmedCount}
          accent="#16a34a"
        />
        <StatCard
          label="Verified Revenue"
          value={stats.revenue}
          format="currency"
          accent="#16a34a"
        />
        <StatCard
          label="Confirmed Teams"
          value={stats.uniqueTeams}
          accent="#0057ff"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        fetcher={(p) => adminHackathonService.queryConfirmed(p)}
        searchPlaceholder="Search by Name, Unique ID (e.g. KTT01), Email, Phone, College, Team..."
        refreshKey={refreshKey}
        emptyTitle="No confirmed hackathon registrations yet"
      />
    </div>
  );
}
