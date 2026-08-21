"use client";

import { PageHeader, Badge, Button, statusTone } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useToast } from "@/components/admin/toast";
import { campaignService } from "@/services/admin";
import type { EmailCampaign } from "@/lib/admin/types";
import { Mail, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

const columns: Column<EmailCampaign>[] = [
  { key: "name", header: "Campaign", sortable: true, render: (r) => <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-adm-muted" /><div><p className="font-semibold text-adm-fg">{r.name}</p><p className="text-xs text-adm-muted">{r.subject}</p></div></div> },
  { key: "audience", header: "Audience", render: (r) => <span className="text-xs text-adm-muted">{r.audience}</span> },
  { key: "recipients", header: "Recipients", sortable: true, render: (r) => <span className="text-sm">{r.recipients}</span> },
  { key: "sent", header: "Sent", render: (r) => <span className="text-sm">{r.sent}/{r.recipients}</span> },
  { key: "status", header: "Status", render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
  { key: "updatedAt", header: "Updated", sortable: true, render: (r) => <span className="text-xs text-adm-muted">{formatDate(r.updatedAt)}</span> },
];

export default function EmailPage() {
  const toast = useToast();
  return (
    <div>
      <PageHeader title="Email campaigns" subtitle="Compose, track, and manage email campaigns."
        actions={<Button variant="primary" onClick={() => toast.info("Campaign composer is coming soon.")}><Plus className="h-4 w-4" /> New campaign</Button>} />
      <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
        Email sending is being finalized. Campaigns can be drafted, but delivery is not yet active.
      </div>
      <DataTable
        columns={columns}
        fetcher={(p) => campaignService.query(p)}
        searchPlaceholder="Search campaigns..."
        emptyTitle="No campaigns yet"
      />
    </div>
  );
}
