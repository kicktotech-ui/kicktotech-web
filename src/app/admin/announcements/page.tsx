"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, CardHeader, Button, Badge, Skeleton, EmptyState, Input, Textarea } from "@/components/admin/ui";
import { useToast } from "@/components/admin/toast";
import { notificationService } from "@/services/admin";
import type { AdminNotification } from "@/lib/admin/types";
import { Megaphone } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AnnouncementsPage() {
  const toast = useToast();
  const [items, setItems] = useState<AdminNotification[] | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await notificationService.query({ pageSize: 20, sortBy: "createdAt", sortDir: "desc" });
    setItems(res.rows);
  };
  useEffect(() => { load(); }, []);

  const publish = async () => {
    if (!title || !message) { toast.error("Add a title and message."); return; }
    await notificationService.create({ title, message, type: "INFO", target: "ALL", createdAt: new Date().toISOString(), source: "ADMIN", delivered: 0 } as Omit<AdminNotification, "id">);
    setTitle(""); setMessage("");
    toast.success("Announcement published.");
    load();
  };

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Broadcast important updates to the whole cohort." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader title="Recent announcements" />
          {items === null ? (
            <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : items.length === 0 ? (
            <div className="p-5"><EmptyState title="No announcements yet" icon={<Megaphone className="h-5 w-5" />} /></div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {items.map((a) => (
                <li key={a.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-adm-fg">{a.title}</p>
                    <span className="flex-shrink-0 text-xs text-adm-muted">{formatDate(a.createdAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-adm-muted">{a.message}</p>
                  <div className="mt-2"><Badge tone={a.source === "ADMIN" ? "purple" : "neutral"}>{a.source}</Badge></div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="h-fit p-5">
          <h3 className="text-sm font-bold text-adm-fg">New announcement</h3>
          <div className="mt-4 space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Write your announcement..." />
            <Button variant="primary" className="w-full" onClick={publish}><Megaphone className="h-4 w-4" /> Publish to all interns</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
