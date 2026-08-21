"use client";

import { useState } from "react";
import { PageHeader, Badge, Button, statusTone, Input, Textarea, Select, Field } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Modal } from "@/components/admin/overlays";
import { useToast } from "@/components/admin/toast";
import { notificationService } from "@/services/admin";
import type { AdminNotification, NotificationType, NotificationTarget } from "@/lib/admin/types";
import { Bell } from "lucide-react";
import { formatDate } from "@/lib/utils";

const TYPE_TONE: Record<NotificationType, "blue" | "green" | "yellow" | "red"> = { INFO: "blue", SUCCESS: "green", WARNING: "yellow", URGENT: "red" };

const columns: Column<AdminNotification>[] = [
  { key: "title", header: "Title & message", render: (r) => <div className="max-w-md"><p className="font-semibold text-adm-fg">{r.title}</p><p className="line-clamp-2 text-xs text-adm-muted">{r.message}</p></div> },
  { key: "type", header: "Type", render: (r) => <Badge tone={TYPE_TONE[r.type]}>{r.type}</Badge> },
  { key: "target", header: "Target", render: (r) => <span className="rounded bg-adm-surface2 px-2 py-0.5 text-[10px] font-bold uppercase text-adm-fg ring-1 ring-inset ring-adm-border">{r.target.replace("DOMAIN_", "")}</span> },
  { key: "delivered", header: "Delivered", sortable: true, render: (r) => <span className="text-sm">{r.delivered}</span> },
  { key: "createdAt", header: "Created", sortable: true, render: (r) => <span className="text-xs text-adm-muted">{formatDate(r.createdAt)}</span> },
  { key: "source", header: "Source", render: (r) => <Badge tone={r.source === "ADMIN" ? "purple" : "neutral"}>{r.source}</Badge> },
];

export default function NotificationsPage() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ title: "", message: "", type: "INFO" as NotificationType, target: "ALL" as NotificationTarget });

  const send = async () => {
    if (!form.title || !form.message) { toast.error("Add a title and message."); return; }
    await notificationService.create({ ...form, createdAt: new Date().toISOString(), source: "ADMIN", delivered: 0 } as Omit<AdminNotification, "id">);
    setOpen(false);
    setForm({ title: "", message: "", type: "INFO", target: "ALL" });
    setRefreshKey((k) => k + 1);
    toast.success("Notification sent to interns' dashboards.");
  };

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Send real-time alerts to interns' dashboards."
        actions={<Button variant="primary" onClick={() => setOpen(true)}><Bell className="h-4 w-4" /> New notification</Button>} />
      <DataTable
        columns={columns}
        fetcher={(p) => notificationService.query(p)}
        searchPlaceholder="Search notifications..."
        refreshKey={refreshKey}
        filters={[{ key: "type", label: "All types", options: ["INFO", "SUCCESS", "WARNING", "URGENT"].map((s) => ({ value: s, label: s })) }]}
        emptyTitle="No notifications sent yet"
      />

      <Modal open={open} onClose={() => setOpen(false)} title="New notification" size="lg"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={send}>Send notification</Button></>}>
        <div className="space-y-4">
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Notification title" /></Field>
          <Field label="Message"><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} placeholder="Write your message..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as NotificationType })}>{["INFO", "SUCCESS", "WARNING", "URGENT"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Target">
              <Select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value as NotificationTarget })}>
                {[["ALL", "All interns"], ["PAID", "Paid interns"], ["ACTIVE", "Active interns"], ["COMPLETED", "Completed interns"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <div className="rounded-lg border border-adm-border bg-adm-surface2 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-adm-muted">Preview</p>
            <div className="mt-2 flex items-center gap-2"><Badge tone={TYPE_TONE[form.type]}>{form.type}</Badge><p className="text-sm font-semibold text-adm-fg">{form.title || "Notification title"}</p></div>
            <p className="mt-1 text-sm text-adm-muted">{form.message || "Your message preview appears here."}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
