"use client";

import { useState, useEffect } from "react";
import {
  PageHeader,
  Badge,
  Button,
  Input,
  Select,
  Field,
  Textarea,
} from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Modal } from "@/components/admin/overlays";
import { useToast } from "@/components/admin/toast";
import { api, ApiError } from "@/lib/api";
import {
  adminApplicationService,
  type AdminApplication,
  type AdminApplicationStatus,
  type AccessResult,
} from "@/services/admin";
import { DOMAIN_META, normalizeCertificateDomain } from "@/lib/certificates/mentors";
import { formatDate } from "@/lib/utils";
import {
  Plus,
  Download,
  XCircle,
  Award,
  ExternalLink,
  Pencil,
  KeyRound,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Users,
  CreditCard,
  Sparkles,
  Calendar,
  Layers,
  GraduationCap,
} from "lucide-react";

export type BatchKey = "batch-2-oct-nov-2026" | "batch-1-may-jun-2026" | "all";

const STATUS_TONE: Record<AdminApplicationStatus, "neutral" | "yellow" | "green" | "red" | "blue"> = {
  PAYMENT_PENDING: "neutral",
  PAYMENT_PROOF_SUBMITTED: "yellow",
  PAYMENT_VERIFIED: "green",
  PAYMENT_REJECTED: "red",
  CERTIFICATE_ISSUED: "blue",
};

const STATUS_LABEL: Record<AdminApplicationStatus, string> = {
  PAYMENT_PENDING: "Payment pending",
  PAYMENT_PROOF_SUBMITTED: "Proof submitted",
  PAYMENT_VERIFIED: "Payment verified",
  PAYMENT_REJECTED: "Payment rejected",
  CERTIFICATE_ISSUED: "Certificate issued",
};

const BATCH_TABS: { key: BatchKey; label: string; badge: string; desc: string }[] = [
  {
    key: "batch-2-oct-nov-2026",
    label: "Batch 2 (Oct - Nov 2026)",
    badge: "Active Cohort • ₹449",
    desc: "2 Domains: Python Development + Project, Java Development + Project",
  },
  {
    key: "batch-1-may-jun-2026",
    label: "Batch 1 (May - Jun 2026)",
    badge: "1st Cohort • ₹222",
    desc: "4 Domains: Python, Java, Data Analytics, Cybersecurity • Certificates Issued",
  },
  {
    key: "all",
    label: "All Cohorts",
    badge: "Combined View",
    desc: "All historical and active internship registrations",
  },
];

const BATCH_2_DOMAINS = [
  { value: "python", label: "Python Development + Project", defaultPrice: 449 },
  { value: "java", label: "Java Development + Project", defaultPrice: 449 },
];

const BATCH_1_DOMAINS = [
  { value: "python", label: "Python Development", defaultPrice: 222 },
  { value: "java", label: "Java Development", defaultPrice: 222 },
  { value: "data-analytics", label: "Data Analytics", defaultPrice: 222 },
  { value: "cybersecurity", label: "Cybersecurity", defaultPrice: 222 },
];

function getDomainBadge(domain: string | undefined) {
  const norm = String(domain || "").toLowerCase().trim();
  if (norm.includes("python")) {
    return {
      label: "Python Development + Project",
      badgeClass: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
      accent: "#0057ff",
    };
  }
  if (norm.includes("java")) {
    return {
      label: "Java Development + Project",
      badgeClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      accent: "#ea580c",
    };
  }
  if (norm.includes("data") || norm.includes("analytic")) {
    return {
      label: "Data Analytics",
      badgeClass: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
      accent: "#7c3aed",
    };
  }
  if (norm.includes("cyber") || norm.includes("security")) {
    return {
      label: "Cybersecurity",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      accent: "#16a34a",
    };
  }
  if (norm.includes("web") || norm.includes("fullstack")) {
    return {
      label: "Web Development",
      badgeClass: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
      accent: "#0891b2",
    };
  }
  if (!domain || domain === "hack2skill" || norm.includes("hack") || norm.includes("prompt")) {
    return {
      label: "PromptWars Hackathon",
      badgeClass: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
      accent: "#f5c400",
    };
  }
  return {
    label: domain.charAt(0).toUpperCase() + domain.slice(1),
    badgeClass: "bg-neutral-800 text-neutral-300 border border-neutral-700",
    accent: "#888888",
  };
}

function getBatchBadge(batch: string | undefined) {
  if (batch === "batch-1-may-jun-2026") {
    return {
      label: "Batch 1 (May-Jun)",
      className: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
      expectedFee: 222,
    };
  }
  return {
    label: "Batch 2 (Oct-Nov)",
    className: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    expectedFee: 449,
  };
}

export default function ApplicationsPage() {
  const toast = useToast();
  const [selectedBatch, setSelectedBatch] = useState<BatchKey>("batch-2-oct-nov-2026");
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0, revenue: 0 });

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [accessResult, setAccessResult] = useState<AccessResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form states
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    college: "",
    course: "",
    year: "",
    prn: "",
    batch: "batch-2-oct-nov-2026",
    domain: "python",
    amount: 449,
    status: "PAYMENT_VERIFIED" as AdminApplicationStatus,
    mentorId: "",
    mentorName: "",
    reviewNote: "",
    grantAccess: true,
  });

  const [editApp, setEditApp] = useState<AdminApplication | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    college: "",
    course: "",
    year: "",
    prn: "",
    batch: "batch-2-oct-nov-2026",
    domain: "python",
    amount: 449,
    status: "PAYMENT_PENDING" as AdminApplicationStatus,
    mentorName: "",
    reviewNote: "",
  });

  const refresh = () => setRefreshKey((k) => k + 1);

  // Trigger table and metric refresh when switching cohort tabs
  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [selectedBatch]);

  // Fetch summary metrics on mount, refresh, or batch tab change
  useEffect(() => {
    adminApplicationService
      .query({ type: "internship", batch: selectedBatch, pageSize: 5000 })
      .then((res) => {
        const total = res.total;
        const verified = res.rows.filter(
          (r) => r.status === "PAYMENT_VERIFIED" || r.status === "CERTIFICATE_ISSUED",
        ).length;
        const pending = res.rows.filter(
          (r) => r.status === "PAYMENT_PENDING" || r.status === "PAYMENT_PROOF_SUBMITTED",
        ).length;
        const revenue = res.rows
          .filter((r) => r.status === "PAYMENT_VERIFIED" || r.status === "CERTIFICATE_ISSUED")
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        setStats({ total, verified, pending, revenue });
      })
      .catch(() => {});
  }, [refreshKey, selectedBatch]);

  // Handle Batch switch inside Add Form
  const handleAddBatchChange = (batch: string) => {
    const isBatch1 = batch === "batch-1-may-jun-2026";
    const defaultAmount = isBatch1 ? 222 : 449;
    setAddForm((prev) => ({
      ...prev,
      batch,
      domain: "python",
      amount: defaultAmount,
    }));
  };

  // Handle Domain Change in Add Form to update default amount
  const handleAddDomainChange = (domain: string) => {
    const options = addForm.batch === "batch-1-may-jun-2026" ? BATCH_1_DOMAINS : BATCH_2_DOMAINS;
    const opt = options.find((d) => d.value === domain);
    setAddForm((prev) => ({
      ...prev,
      domain,
      amount: opt ? opt.defaultPrice : prev.amount,
    }));
  };

  // Open Add Modal prefilled with active batch
  const openAddModal = () => {
    const initialBatch = selectedBatch === "batch-1-may-jun-2026" ? "batch-1-may-jun-2026" : "batch-2-oct-nov-2026";
    setAddForm({
      name: "",
      email: "",
      phone: "",
      college: "",
      course: "",
      year: "",
      prn: "",
      batch: initialBatch,
      domain: "python",
      amount: initialBatch === "batch-1-may-jun-2026" ? 222 : 449,
      status: "PAYMENT_VERIFIED",
      mentorId: "",
      mentorName: "",
      reviewNote: "",
      grantAccess: true,
    });
    setAddModalOpen(true);
  };

  // Submit Add Form
  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.phone.trim()) {
      toast.error("Please fill in applicant name, email, and phone.");
      return;
    }
    setBusy("create");
    try {
      const res = await adminApplicationService.create(addForm);
      toast.success(`Internship record created for ${addForm.name}!`);
      setAddModalOpen(false);
      refresh();
      if (res.access) {
        setAccessResult(res);
        setAccessModalOpen(true);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create application.");
    } finally {
      setBusy(null);
    }
  };

  // Open Edit Modal
  const openEditModal = (app: AdminApplication) => {
    setEditApp(app);
    const initialBatch = app.batch || (app.amount === 222 ? "batch-1-may-jun-2026" : "batch-2-oct-nov-2026");
    setEditForm({
      name: app.name,
      email: app.email,
      phone: app.phone,
      college: app.college || "",
      course: app.course || "",
      year: app.year || "",
      prn: app.prn || "",
      batch: initialBatch,
      domain: app.domain || "python",
      amount: app.amount || (initialBatch === "batch-1-may-jun-2026" ? 222 : 449),
      status: app.status,
      mentorName: app.mentorName || "",
      reviewNote: app.reviewNote || "",
    });
    setEditModalOpen(true);
  };

  // Submit Edit Form
  const handleUpdateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editApp) return;
    setBusy(editApp.applicationId);
    try {
      await adminApplicationService.update(editApp.applicationId, editForm);
      toast.success(`Updated record for ${editForm.name}!`);
      setEditModalOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update record.");
    } finally {
      setBusy(null);
    }
  };

  // Grant Access Directly
  const handleGrantAccess = async (app: AdminApplication) => {
    setBusy(app.applicationId);
    try {
      const res = await adminApplicationService.grantAccess(app.applicationId);
      toast.success(`Access granted to ${app.name}!`);
      setAccessResult(res);
      setAccessModalOpen(true);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not grant access.");
    } finally {
      setBusy(null);
    }
  };

  // Payment Decision (Verify / Reject)
  async function decide(app: AdminApplication, action: "verify" | "reject") {
    if (action === "reject" && !window.confirm(`Reject payment for ${app.name} (${app.applicationId})?`)) return;
    setBusy(app.applicationId);
    try {
      if (action === "verify") {
        const res = await adminApplicationService.grantAccess(app.applicationId);
        toast.success(`Payment verified & access granted to ${app.name}!`);
        setAccessResult(res);
        setAccessModalOpen(true);
      } else {
        await adminApplicationService.decide(app.applicationId, action);
        toast.success(`Payment rejected for ${app.name}.`);
      }
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  // Issue Certificate
  async function issue(app: AdminApplication) {
    setBusy(app.applicationId);
    try {
      const domain = normalizeCertificateDomain(app.domain);
      const res = await api.post<{ certificate: { certificateId: string }; verificationUrl: string; duplicate: boolean }>(
        "/admin/certificates",
        {
          recipientName: app.name,
          email: app.email,
          domain,
          program: DOMAIN_META[domain]?.program || "Kick To Tech Internship Program",
          mentorId: app.mentorId,
          applicationId: app.applicationId,
        },
      );
      toast.success(res.duplicate ? `Already issued: ${res.certificate.certificateId}` : `Certificate issued: ${res.certificate.certificateId}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not issue certificate.");
    } finally {
      setBusy(null);
    }
  }

  // Export CSV for the currently active batch
  const handleExportCsv = async () => {
    try {
      toast.info("Preparing CSV export...");
      const res = await adminApplicationService.query({
        type: "internship",
        batch: selectedBatch,
        pageSize: 5000,
      });
      if (!res.rows.length) {
        toast.error("No applications to export for this cohort.");
        return;
      }
      const headers = [
        "Application ID",
        "Cohort Batch",
        "Name",
        "Email",
        "Phone",
        "College",
        "Course",
        "Year",
        "PRN",
        "Domain",
        "Fee Amount (INR)",
        "Payment Status",
        "Certificate ID",
        "Mentor",
        "Review Note",
        "Submitted Date",
      ];
      const rows = res.rows.map((r) => [
        `"${r.applicationId}"`,
        `"${r.batch === "batch-1-may-jun-2026" ? "Batch 1 (May-Jun 2026)" : "Batch 2 (Oct-Nov 2026)"}"`,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.email}"`,
        `"${r.phone}"`,
        `"${(r.college || "").replace(/"/g, '""')}"`,
        `"${(r.course || "").replace(/"/g, '""')}"`,
        `"${(r.year || "").replace(/"/g, '""')}"`,
        `"${(r.prn || "").replace(/"/g, '""')}"`,
        `"${getDomainBadge(r.domain).label}"`,
        r.amount ?? (r.batch === "batch-1-may-jun-2026" ? 222 : 449),
        `"${STATUS_LABEL[r.status] || r.status}"`,
        `"${r.certificateId || ""}"`,
        `"${(r.mentorName || "").replace(/"/g, '""')}"`,
        `"${(r.reviewNote || "").replace(/"/g, '""')}"`,
        `"${r.createdAt}"`,
      ]);
      const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const batchSuffix =
        selectedBatch === "batch-1-may-jun-2026"
          ? "batch1_may_jun_222rs"
          : selectedBatch === "batch-2-oct-nov-2026"
          ? "batch2_oct_nov_449rs"
          : "all_batches";
      link.setAttribute("download", `ktt_internships_${batchSuffix}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV download started!");
    } catch {
      toast.error("Failed to generate CSV export.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const columns: Column<AdminApplication>[] = [
    {
      key: "name",
      header: "Applicant",
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-semibold text-adm-fg">{r.name}</p>
          <p className="text-xs text-adm-muted">{r.email}</p>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-adm-muted">
            <span>{r.applicationId}</span>
            {r.prn && (
              <span className="rounded bg-neutral-800 px-1 py-0.2 text-[10px] text-neutral-400">
                PRN: {r.prn}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Contact & College",
      render: (r) => (
        <div className="text-xs">
          <p className="font-medium text-adm-fg">{r.phone || "—"}</p>
          <p className="max-w-[180px] truncate text-adm-muted">{r.college || "—"}</p>
          {(r.course || r.year) && (
            <p className="text-[11px] text-adm-muted/70">
              {[r.course, r.year].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "domain",
      header: "Domain / Cohort",
      render: (r) => {
        const dBadge = getDomainBadge(r.domain);
        const bBadge = getBatchBadge(r.batch);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${dBadge.badgeClass}`}
              >
                {dBadge.label}
              </span>
              <span
                className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium ${bBadge.className}`}
              >
                {bBadge.label}
              </span>
            </div>
            <p className="text-xs text-adm-muted">Mentor: {r.mentorName ?? "—"}</p>
          </div>
        );
      },
    },
    {
      key: "amount",
      header: "Fee",
      sortable: true,
      render: (r) => {
        const expected = r.batch === "batch-1-may-jun-2026" ? 222 : 449;
        const amount = r.amount ?? expected;
        return (
          <div className="text-xs">
            <span className="font-semibold text-adm-fg">₹{amount}</span>
            {amount === 222 && (
              <span className="ml-1 text-[10px] text-purple-400 font-mono">(Batch 1)</span>
            )}
            {amount === 449 && (
              <span className="ml-1 text-[10px] text-blue-400 font-mono">(Batch 2)</span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Payment",
      sortable: true,
      render: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>,
    },
    {
      key: "access",
      header: "Student Access",
      render: (r) => {
        const hasAccess = r.status === "PAYMENT_VERIFIED" || r.status === "CERTIFICATE_ISSUED";
        if (hasAccess) {
          return (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Active
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard("https://kicktotech.in/internship/dashboard")}
                title="Copy Student Dashboard Link"
                className="rounded p-1 text-adm-muted hover:bg-adm-surface2 hover:text-adm-fg transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-400 border border-neutral-700">
            <Clock className="h-3 w-3" /> Locked
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Submitted",
      sortable: true,
      render: (r) => <span className="text-xs text-adm-muted">{formatDate(r.createdAt)}</span>,
    },
    {
      key: "id",
      header: "Actions",
      render: (r) => {
        const disabled = busy === r.applicationId;
        const isVerified = r.status === "PAYMENT_VERIFIED" || r.status === "CERTIFICATE_ISSUED";

        return (
          <div className="flex items-center gap-1.5">
            {r.status === "CERTIFICATE_ISSUED" || r.certificateId ? (
              <a
                href={`/verify_cert?cert=${encodeURIComponent(r.certificateId ?? "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded bg-[#0057ff]/10 px-2 py-1 text-xs font-semibold text-[#0057ff] hover:bg-[#0057ff]/20 border border-[#0057ff]/20 transition-colors"
                title={`View Certificate: ${r.certificateId}`}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Cert
              </a>
            ) : r.status === "PAYMENT_VERIFIED" ? (
              <Button
                size="sm"
                variant="primary"
                disabled={disabled}
                onClick={() => issue(r)}
                title="Generate and issue completion certificate"
              >
                <Award className="h-3.5 w-3.5" /> Issue
              </Button>
            ) : (
              <Button
                size="sm"
                variant="success"
                disabled={disabled}
                onClick={() => handleGrantAccess(r)}
                title="Verify payment and unlock student portal access"
              >
                <KeyRound className="h-3.5 w-3.5" /> Give Access
              </Button>
            )}

            {/* Edit Button */}
            <Button
              size="sm"
              variant="secondary"
              disabled={disabled}
              onClick={() => openEditModal(r)}
              title="Edit batch, domain, fee, payment status, or student info"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>

            {/* Reject option for non-verified */}
            {!isVerified && (
              <Button
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => decide(r, "reject")}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                title="Reject application"
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const activeBatchTabInfo = BATCH_TABS.find((t) => t.key === selectedBatch);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internship Applications & Batches"
        subtitle="Manage Batch 1 (May-Jun 2026, ₹222, 4 domains) and Batch 2 (Oct-Nov 2026, ₹449, 2 domains) with zero data loss."
        actions={
          <>
            <Button variant="secondary" onClick={handleExportCsv}>
              <Download className="h-4 w-4" /> Export CSV ({activeBatchTabInfo?.label})
            </Button>
            <Button variant="primary" onClick={openAddModal}>
              <Plus className="h-4 w-4" /> Add Application
            </Button>
          </>
        }
      />

      {/* Cohort / Batch Filter Switcher */}
      <div className="rounded-2xl border border-adm-border bg-adm-surface p-2 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto p-1">
            {BATCH_TABS.map((tab) => {
              const active = selectedBatch === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedBatch(tab.key)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    active
                      ? "bg-[#0057ff] text-white shadow-md shadow-[#0057ff]/25"
                      : "text-adm-muted hover:text-adm-fg hover:bg-adm-surface2"
                  }`}
                >
                  {tab.key === "batch-2-oct-nov-2026" ? (
                    <Calendar className="h-4 w-4" />
                  ) : tab.key === "batch-1-may-jun-2026" ? (
                    <GraduationCap className="h-4 w-4" />
                  ) : (
                    <Layers className="h-4 w-4" />
                  )}
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                      active ? "bg-white/20 text-white" : "bg-adm-surface2 text-adm-muted border border-adm-border"
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-3 py-1 text-right text-xs text-adm-muted hidden lg:block">
            {activeBatchTabInfo?.desc}
          </div>
        </div>
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-adm-border bg-adm-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-adm-muted">Total Applications</span>
            <div className="rounded-lg bg-[#0057ff]/10 p-2 text-[#0057ff]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-adm-fg">{stats.total}</p>
          <span className="text-[11px] text-adm-muted">
            {selectedBatch === "all" ? "All cohorts combined" : activeBatchTabInfo?.label}
          </span>
        </div>

        <div className="rounded-xl border border-adm-border bg-adm-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-adm-muted">Verified & Active Interns</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{stats.verified}</p>
          <span className="text-[11px] text-emerald-500/80">Portal access unlocked</span>
        </div>

        <div className="rounded-xl border border-adm-border bg-adm-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-adm-muted">Pending Verification</span>
            <div className="rounded-lg bg-yellow-500/10 p-2 text-yellow-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-yellow-400">{stats.pending}</p>
          <span className="text-[11px] text-adm-muted">Pending payment proof review</span>
        </div>

        <div className="rounded-xl border border-adm-border bg-adm-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-adm-muted">Verified Revenue</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-adm-fg">₹{stats.revenue.toLocaleString("en-IN")}</p>
          <span className="text-[11px] text-adm-muted">
            {selectedBatch === "batch-1-may-jun-2026"
              ? "May-Jun (₹222 / student)"
              : selectedBatch === "batch-2-oct-nov-2026"
              ? "Oct-Nov (₹449 / student)"
              : "All internship revenue"}
          </span>
        </div>
      </div>

      {/* Applications Data Table */}
      <DataTable
        columns={columns}
        fetcher={(p) =>
          adminApplicationService.query({
            ...p,
            type: "internship",
            batch: selectedBatch,
          })
        }
        searchPlaceholder="Search applicant, email, phone, PRN, college, domain..."
        refreshKey={refreshKey}
        filters={[
          {
            key: "domain",
            label: "All Domains",
            options: [
              { value: "python", label: "Python (AI + Projects)" },
              { value: "java", label: "Java Development" },
              { value: "data-analytics", label: "Data Analytics" },
              { value: "cybersecurity", label: "Cybersecurity" },
            ],
          },
          {
            key: "status",
            label: "All Statuses",
            options: (Object.keys(STATUS_LABEL) as AdminApplicationStatus[]).map((s) => ({
              value: s,
              label: STATUS_LABEL[s],
            })),
          },
        ]}
        emptyTitle={`No applications found in ${activeBatchTabInfo?.label}`}
        emptyDescription="Create a new application or switch cohorts using the tabs above."
      />

      {/* Modal 1: Add New Application */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Internship Record"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={busy === "create"}
              onClick={handleCreateApplication}
            >
              <Plus className="h-4 w-4" /> Create & Grant Access
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateApplication} className="space-y-4">
          {/* Cohort Selector in Add Form */}
          <div className="rounded-xl border border-[#0057ff]/30 bg-[#0057ff]/5 p-3">
            <Field label="Internship Cohort / Batch *">
              <Select
                value={addForm.batch}
                onChange={(e) => handleAddBatchChange(e.target.value)}
              >
                <option value="batch-2-oct-nov-2026">
                  Batch 2: Oct - Nov 2026 (Active Cohort • ₹449 • Python & Java Projects)
                </option>
                <option value="batch-1-may-jun-2026">
                  Batch 1: May - Jun 2026 (Past Cohort • ₹222 • 4 Domains)
                </option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Applicant Full Name *">
              <Input
                required
                placeholder="e.g. Mayur Patil"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              />
            </Field>
            <Field label="Email Address *">
              <Input
                required
                type="email"
                placeholder="e.g. student@gmail.com"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone Number *">
              <Input
                required
                placeholder="e.g. 9876543210"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              />
            </Field>
            <Field label="College / Institute">
              <Input
                placeholder="e.g. JSPM University Pune"
                value={addForm.college}
                onChange={(e) => setAddForm({ ...addForm, college: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Course / Branch">
              <Input
                placeholder="e.g. B.Tech Computer Engineering"
                value={addForm.course}
                onChange={(e) => setAddForm({ ...addForm, course: e.target.value })}
              />
            </Field>
            <Field label="Study Year">
              <Input
                placeholder="e.g. 3rd Year"
                value={addForm.year}
                onChange={(e) => setAddForm({ ...addForm, year: e.target.value })}
              />
            </Field>
            <Field label="PRN / Roll No">
              <Input
                placeholder="e.g. 2026100123"
                value={addForm.prn}
                onChange={(e) => setAddForm({ ...addForm, prn: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Internship Domain *">
              <Select
                value={addForm.domain}
                onChange={(e) => handleAddDomainChange(e.target.value)}
              >
                {(addForm.batch === "batch-1-may-jun-2026" ? BATCH_1_DOMAINS : BATCH_2_DOMAINS).map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label} (Standard fee: ₹{d.defaultPrice})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fee Amount (₹) *">
              <Input
                type="number"
                min="0"
                value={addForm.amount}
                onChange={(e) => setAddForm({ ...addForm, amount: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Payment Status">
              <Select
                value={addForm.status}
                onChange={(e) => setAddForm({ ...addForm, status: e.target.value as AdminApplicationStatus })}
              >
                <option value="PAYMENT_VERIFIED">Payment Verified (Directly Grant Access)</option>
                <option value="PAYMENT_PENDING">Payment Pending</option>
                <option value="PAYMENT_PROOF_SUBMITTED">Payment Proof Submitted</option>
              </Select>
            </Field>
            <Field label="Assign Mentor (Optional)">
              <Input
                placeholder="e.g. Omkar Pawar"
                value={addForm.mentorName}
                onChange={(e) => setAddForm({ ...addForm, mentorName: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Admin Notes / Reference">
            <Input
              placeholder="e.g. Verified via UPI reference 4321..."
              value={addForm.reviewNote}
              onChange={(e) => setAddForm({ ...addForm, reviewNote: e.target.value })}
            />
          </Field>

          <div className="rounded-lg border border-adm-border bg-adm-surface2/60 p-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={addForm.grantAccess}
                onChange={(e) => setAddForm({ ...addForm, grantAccess: e.target.checked })}
                className="h-4 w-4 rounded border-adm-border text-[#0057ff] focus:ring-[#0057ff]"
              />
              <div>
                <p className="text-xs font-semibold text-adm-fg">
                  Automatically register in Interns directory & activate student portal access
                </p>
                <p className="text-[11px] text-adm-muted">
                  Enables student dashboard access at kicktotech.in/internship/dashboard immediately.
                </p>
              </div>
            </label>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Edit Existing Application */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Internship Record — ${editApp?.name || ""}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={Boolean(busy)}
              onClick={handleUpdateApplication}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateApplication} className="space-y-4">
          <div className="rounded-xl border border-adm-border bg-adm-surface2/60 p-3">
            <Field label="Cohort / Batch">
              <Select
                value={editForm.batch}
                onChange={(e) => {
                  const newBatch = e.target.value;
                  const newAmount = newBatch === "batch-1-may-jun-2026" ? 222 : 449;
                  setEditForm({
                    ...editForm,
                    batch: newBatch,
                    domain: "python",
                    amount: newAmount,
                  });
                }}
              >
                <option value="batch-2-oct-nov-2026">
                  Batch 2: Oct - Nov 2026 (Active • ₹449 • Python & Java)
                </option>
                <option value="batch-1-may-jun-2026">
                  Batch 1: May - Jun 2026 (Past • ₹222 • 4 Domains)
                </option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Applicant Name">
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </Field>
            <Field label="Email Address">
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone Number">
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </Field>
            <Field label="College / University">
              <Input
                value={editForm.college}
                onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Course">
              <Input
                value={editForm.course}
                onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
              />
            </Field>
            <Field label="Study Year">
              <Input
                value={editForm.year}
                onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
              />
            </Field>
            <Field label="PRN">
              <Input
                value={editForm.prn}
                onChange={(e) => setEditForm({ ...editForm, prn: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Domain Track">
              <Select
                value={editForm.domain}
                onChange={(e) => {
                  const val = e.target.value;
                  const options = editForm.batch === "batch-1-may-jun-2026" ? BATCH_1_DOMAINS : BATCH_2_DOMAINS;
                  const opt = options.find((d) => d.value === val);
                  setEditForm({
                    ...editForm,
                    domain: val,
                    amount: opt ? opt.defaultPrice : editForm.amount,
                  });
                }}
              >
                {(editForm.batch === "batch-1-may-jun-2026" ? BATCH_1_DOMAINS : BATCH_2_DOMAINS).map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label} (₹{d.defaultPrice})
                  </option>
                ))}
                {!BATCH_1_DOMAINS.concat(BATCH_2_DOMAINS).some((d) => d.value === editForm.domain) && (
                  <option value={editForm.domain}>{editForm.domain}</option>
                )}
              </Select>
            </Field>

            <Field label="Fee Amount (₹)">
              <Input
                type="number"
                min="0"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Payment Status">
              <Select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as AdminApplicationStatus })}
              >
                <option value="PAYMENT_VERIFIED">Payment verified (Access Active)</option>
                <option value="PAYMENT_PENDING">Payment pending</option>
                <option value="PAYMENT_PROOF_SUBMITTED">Proof submitted</option>
                <option value="PAYMENT_REJECTED">Payment rejected</option>
                <option value="CERTIFICATE_ISSUED">Certificate issued</option>
              </Select>
            </Field>

            <Field label="Mentor Name">
              <Input
                value={editForm.mentorName}
                onChange={(e) => setEditForm({ ...editForm, mentorName: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Review Note / Payment Reference">
            <Textarea
              value={editForm.reviewNote}
              onChange={(e) => setEditForm({ ...editForm, reviewNote: e.target.value })}
              placeholder="Add admin notes or payment tracking details..."
            />
          </Field>
        </form>
      </Modal>

      {/* Modal 3: Access Granted Success Notification */}
      <Modal
        open={accessModalOpen}
        onClose={() => setAccessModalOpen(false)}
        title="Student Access Granted"
        size="md"
        footer={
          <Button variant="primary" onClick={() => setAccessModalOpen(false)}>
            Done
          </Button>
        }
      >
        <div className="space-y-4 text-center sm:text-left">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 sm:mx-0">
            <Sparkles className="h-6 w-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-adm-fg">
              Access Unlocked for {accessResult?.application.name}!
            </h3>
            <p className="mt-1 text-xs text-adm-muted">
              The student record has been activated in the Interns directory with full portal access.
            </p>
          </div>

          <div className="rounded-xl border border-adm-border bg-adm-surface2/60 p-4 space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-adm-border/50 pb-2">
              <span className="text-adm-muted">Cohort Batch:</span>
              <span className="font-semibold text-adm-fg">
                {getBatchBadge(accessResult?.application.batch).label}
              </span>
            </div>
            <div className="flex justify-between border-b border-adm-border/50 pb-2">
              <span className="text-adm-muted">Domain Track:</span>
              <span className="font-semibold text-adm-fg">
                {getDomainBadge(accessResult?.application.domain).label}
              </span>
            </div>
            <div className="flex justify-between border-b border-adm-border/50 pb-2">
              <span className="text-adm-muted">Fee Amount:</span>
              <span className="font-semibold text-adm-fg">
                ₹{accessResult?.application.amount ?? (accessResult?.application.batch === "batch-1-may-jun-2026" ? 222 : 449)} (Verified)
              </span>
            </div>
            {accessResult?.access?.internId && (
              <div className="flex justify-between border-b border-adm-border/50 pb-2">
                <span className="text-adm-muted">Intern ID:</span>
                <span className="font-mono font-semibold text-[#0057ff]">
                  {accessResult.access.internId}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-adm-muted">Student Portal:</span>
              <span className="font-mono text-[11px] text-adm-fg">
                kicktotech.in/internship/dashboard
              </span>
            </div>
          </div>

          <Button
            variant="secondary"
            className="w-full gap-2 text-xs"
            onClick={() =>
              copyToClipboard(
                `Hi ${accessResult?.application.name}, your Kick To Tech internship enrollment for ${getDomainBadge(accessResult?.application.domain).label} (${getBatchBadge(accessResult?.application.batch).label}) has been verified! Access your student dashboard here: https://kicktotech.in/internship/dashboard`,
              )
            }
          >
            {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copiedLink ? "Access Message Copied!" : "Copy WhatsApp Access Invite"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
