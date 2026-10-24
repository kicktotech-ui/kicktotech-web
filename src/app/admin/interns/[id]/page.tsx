"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, PauseCircle, Award, Bell, Mail, Phone, GraduationCap, Building2 } from "lucide-react";
import { Button, Card, CardHeader, Badge, Skeleton, EmptyState, statusTone } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/admin/overlays";
import { useToast } from "@/components/admin/toast";
import { internService, paymentService, certificateService } from "@/services/admin";
import { domainLabel } from "@/data/admin";
import type { Intern, Payment, Certificate } from "@/lib/admin/types";
import { formatDate, formatINR } from "@/lib/utils";
import { FEATURES } from "@/config/features";

const TABS = ["Overview", "Payments", "Certificates", "Activity"] as const;

export default function InternProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [intern, setIntern] = useState<Intern | null | undefined>(undefined);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [suspendOpen, setSuspendOpen] = useState(false);

  useEffect(() => {
    if (FEATURES.internshipMaintenance) {
      setIntern(null);
      return;
    }
    (async () => {
      const found = await internService.getById(id);
      setIntern(found);
      if (found) {
        const [p, c] = await Promise.all([
          paymentService.query({ search: found.internId, pageSize: 5 }),
          certificateService.query({ search: found.internId, pageSize: 5 }),
        ]);
        setPayments(p.rows);
        setCerts(c.rows);
      }
    })();
  }, [id]);

  if (FEATURES.internshipMaintenance) {
    return (
      <EmptyState
        title="Intern details paused (Maintenance Mode)"
        description="Intern queries are temporarily paused to protect Firestore read quotas during the Hackathon priority period. Set NEXT_PUBLIC_INTERNSHIP_MAINTENANCE='false' to restore."
        action={<Button variant="secondary" href="/admin">Back to dashboard</Button>}
      />
    );
  }

  if (intern === undefined) {
    return <div className="space-y-4"><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>;
  }
  if (intern === null) {
    return <EmptyState title="Intern not found" description="This record may have been removed." action={<Button variant="secondary" href="/admin/interns">Back to interns</Button>} />;
  }

  const info = [
    { icon: Mail, label: "Email", value: intern.email },
    { icon: Phone, label: "Phone", value: intern.phone },
    { icon: Building2, label: "College", value: intern.college },
    { icon: GraduationCap, label: "Domain", value: domainLabel[intern.domainId] || intern.domainId || "General" },
  ];

  return (
    <div>
      <button onClick={() => router.push("/admin/interns")} className="mb-4 inline-flex items-center gap-1.5 text-sm text-adm-muted hover:text-adm-fg">
        <ArrowLeft className="h-4 w-4" /> Interns
      </button>

      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white" style={{ backgroundColor: intern.avatarColor }}>{intern.name[0]}</span>
            <div>
              <h1 className="text-xl font-bold text-adm-fg">{intern.name}</h1>
              <p className="font-mono text-xs text-adm-muted">{intern.internId}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone={statusTone(intern.status)}>{intern.status}</Badge>
                <Badge tone={statusTone(intern.paymentStatus)}>{intern.paymentStatus}</Badge>
                <Badge tone="neutral">{domainLabel[intern.domainId] || intern.domainId || "General"}</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => toast.info("Edit form opens here.")}><Pencil className="h-4 w-4" /> Edit</Button>
            <Button variant="secondary" onClick={() => toast.info("Notification composer opens.")}><Bell className="h-4 w-4" /> Notify</Button>
            <Button variant="primary" onClick={() => toast.success("Certificate generation queued.")}><Award className="h-4 w-4" /> Generate cert</Button>
            <Button variant="danger" onClick={() => setSuspendOpen(true)}><PauseCircle className="h-4 w-4" /> Suspend</Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 border-b border-adm-border">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === t ? "border-[#0057ff] text-[#0057ff]" : "border-transparent text-adm-muted hover:text-adm-fg"}`}>{t}</button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "Overview" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Profile information" />
              <dl className="grid grid-cols-1 gap-px overflow-hidden bg-adm-surface2 sm:grid-cols-2">
                {info.map((f) => (
                  <div key={f.label} className="flex items-center gap-3 bg-adm-surface px-5 py-4">
                    <f.icon className="h-4 w-4 text-adm-muted" />
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-adm-muted">{f.label}</dt>
                      <dd className="text-sm text-adm-fg">{f.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-bold text-adm-fg">Progress</h3>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-3xl font-bold text-adm-fg">{intern.progress}%</span>
                <span className="mb-1 text-xs text-adm-muted">complete</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-adm-surface2"><div className="h-full rounded-full bg-[#0057ff]" style={{ width: `${intern.progress}%` }} /></div>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-adm-muted">Certificate</dt><dd><Badge tone={statusTone(intern.certificateStatus)}>{intern.certificateStatus.replace("_", " ")}</Badge></dd></div>
                <div className="flex justify-between"><dt className="text-adm-muted">Grade</dt><dd className="font-semibold">{intern.grade ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-adm-muted">Joined</dt><dd>{formatDate(intern.joinedAt)}</dd></div>
              </dl>
            </Card>
          </div>
        )}

        {tab === "Payments" && (
          <Card>
            <CardHeader title="Payment history" />
            {payments.length === 0 ? <div className="p-4"><EmptyState title="No payments recorded" /></div> : (
              <ul className="divide-y divide-neutral-100">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-5 py-3.5">
                    <div><p className="font-mono text-xs text-adm-muted">{p.paymentId}</p><p className="text-sm text-adm-fg">{p.method} · {formatDate(p.date)}</p></div>
                    <div className="flex items-center gap-3"><span className="font-semibold">{formatINR(p.amountRupees)}</span><Badge tone={statusTone(p.status)}>{p.status}</Badge></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {tab === "Certificates" && (
          <Card>
            <CardHeader title="Certificates" />
            {certs.length === 0 ? <div className="p-4"><EmptyState title="No certificates yet" description="Generate a certificate once the intern completes the program." /></div> : (
              <ul className="divide-y divide-neutral-100">
                {certs.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-5 py-3.5">
                    <div><p className="font-mono text-xs text-adm-muted">{c.certificateId}</p><p className="text-sm text-adm-fg">{c.program} · Grade {c.grade}</p></div>
                    <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {tab === "Activity" && (
          <Card><div className="p-4"><EmptyState title="Activity timeline" description="Intern-specific activity will appear here as actions are recorded." /></div></Card>
        )}
      </div>

      <ConfirmDialog
        open={suspendOpen} onClose={() => setSuspendOpen(false)}
        onConfirm={() => toast.warning(`${intern.name} suspended.`)}
        title="Suspend intern?" message={`This will pause ${intern.name}'s internship access. You can reactivate later.`}
        confirmLabel="Suspend" danger
      />
    </div>
  );
}
