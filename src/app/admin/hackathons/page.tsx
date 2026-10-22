"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader, Badge, Button, type Tone } from "@/components/admin/ui";
import { StatCard } from "@/components/admin/charts";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useToast } from "@/components/admin/toast";
import { ApiError } from "@/lib/api";
import {
  adminHackathonService,
  type AdminApplication,
  type AdminApplicationStatus,
} from "@/services/admin";
import { formatDate, formatINR } from "@/lib/utils";
import {
  BadgeCheck,
  XCircle,
  Download,
  Trophy,
  Users,
  Clock,
  Sparkles,
} from "lucide-react";

const STATUS_TONE: Record<AdminApplicationStatus, Tone> = {
  PAYMENT_PENDING: "neutral",
  PAYMENT_PROOF_SUBMITTED: "yellow",
  PAYMENT_VERIFIED: "green",
  PAYMENT_REJECTED: "red",
  CERTIFICATE_ISSUED: "green",
};

const STATUS_LABEL: Record<AdminApplicationStatus, string> = {
  PAYMENT_PENDING: "Payment Pending",
  PAYMENT_PROOF_SUBMITTED: "Proof Submitted",
  PAYMENT_VERIFIED: "Verified / Paid",
  PAYMENT_REJECTED: "Payment Rejected",
  CERTIFICATE_ISSUED: "Verified / Paid",
};

export default function HackathonManagerPage() {
  const toast = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    revenue: 0,
  });

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Compute metrics from the hackathon service
  useEffect(() => {
    (async () => {
      try {
        const res = await adminHackathonService.query({ page: 1, pageSize: 1000 });
        const rows = res.rows;
        const paidRows = rows.filter(
          (r) => r.status === "PAYMENT_VERIFIED" || r.status === "CERTIFICATE_ISSUED",
        );
        const pendingRows = rows.filter(
          (r) => r.status === "PAYMENT_PENDING" || r.status === "PAYMENT_PROOF_SUBMITTED",
        );
        const revenue = paidRows.reduce((sum, r) => sum + (r.amount || 99), 0);

        setStats({
          total: res.total || rows.length,
          paid: paidRows.length,
          pending: pendingRows.length,
          revenue,
        });
      } catch (err) {
        console.warn("[hackathons] Failed loading metrics:", err);
      }
    })();
  }, [refreshKey]);

  async function decide(app: AdminApplication, action: "verify" | "reject") {
    if (
      action === "reject" &&
      !window.confirm(`Reject payment/registration for ${app.name} (${app.applicationId})?`)
    ) {
      return;
    }
    setBusy(app.applicationId);
    try {
      await adminHackathonService.decide(app.applicationId, action);
      toast.success(
        action === "verify"
          ? `Payment verified for ${app.name}. Confirmation email triggered.`
          : `Payment rejected for ${app.name}.`,
      );
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await adminHackathonService.query({ page: 1, pageSize: 2000 });
      if (!res.rows.length) {
        toast.info("No hackathon participants to export.");
        return;
      }

      const headers = [
        "Application ID",
        "Name",
        "Email",
        "Phone",
        "College",
        "Course",
        "Year",
        "Team Name",
        "Amount (INR)",
        "Payment Status",
        "Razorpay Order ID",
        "Razorpay Payment ID",
        "Registered At",
      ];

      const csvRows = [headers.join(",")];
      for (const r of res.rows) {
        csvRows.push(
          [
            `"${r.applicationId || ""}"`,
            `"${(r.name || "").replace(/"/g, '""')}"`,
            `"${r.email || ""}"`,
            `"${r.phone || ""}"`,
            `"${(r.college || "").replace(/"/g, '""')}"`,
            `"${(r.course || "").replace(/"/g, '""')}"`,
            `"${(r.year || "").replace(/"/g, '""')}"`,
            `"${(r.teamName || "").replace(/"/g, '""')}"`,
            `"${r.amount || 99}"`,
            `"${r.status || ""}"`,
            `"${r.razorpayOrderId || ""}"`,
            `"${r.razorpayPaymentId || ""}"`,
            `"${r.createdAt || ""}"`,
          ].join(","),
        );
      }

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hackathon_registrations_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${res.rows.length} hackathon registrations.`);
    } catch (e) {
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  const columns: Column<AdminApplication>[] = [
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
        <span className="text-xs font-medium text-adm-fg">
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
      key: "status",
      header: "Payment Status",
      sortable: true,
      render: (r) => (
        <div className="flex flex-col gap-1 items-start">
          <Badge tone={STATUS_TONE[r.status]}>
            {STATUS_LABEL[r.status] || r.status}
          </Badge>
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
      header: "Registered At",
      sortable: true,
      render: (r) => (
        <span className="text-xs text-adm-muted">
          {formatDate(r.createdAt)}
        </span>
      ),
    },
    {
      key: "id",
      header: "Actions",
      render: (r) => {
        const disabled = busy === r.applicationId;
        const isPaid =
          r.status === "PAYMENT_VERIFIED" || r.status === "CERTIFICATE_ISSUED";

        if (isPaid) {
          return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
              <BadgeCheck className="h-4 w-4" /> Paid & Confirmed
            </span>
          );
        }

        return (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="success"
              disabled={disabled}
              onClick={() => decide(r, "verify")}
            >
              <BadgeCheck className="h-4 w-4" /> Verify
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={disabled}
              onClick={() => decide(r, "reject")}
            >
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Hackathon Manager"
        subtitle="Track PromptWars × KICK To TECH ₹99 registrations, Razorpay transactions, and participant details."
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
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Registrations"
          value={stats.total}
          accent="#0057ff"
        />
        <StatCard
          label="Paid / Verified"
          value={stats.paid}
          accent="#16a34a"
        />
        <StatCard
          label="Pending Payments"
          value={stats.pending}
          accent="#f5c400"
        />
        <StatCard
          label="Hackathon Revenue"
          value={stats.revenue}
          format="currency"
          accent="#16a34a"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        fetcher={(p) => adminHackathonService.query(p)}
        searchPlaceholder="Search participant, email, phone, college, team name..."
        refreshKey={refreshKey}
        filters={[
          {
            key: "status",
            label: "All statuses",
            options: [
              { value: "PAYMENT_VERIFIED", label: "Verified / Paid" },
              { value: "PAYMENT_PENDING", label: "Payment Pending" },
              { value: "PAYMENT_PROOF_SUBMITTED", label: "Proof Submitted" },
              { value: "PAYMENT_REJECTED", label: "Rejected" },
            ],
          },
        ]}
        emptyTitle="No hackathon registrations yet"
      />
    </div>
  );
}
