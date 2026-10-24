"use client";

import { Users, ClipboardCheck, MessageSquare } from "lucide-react";
import { RequireAuth } from "@/components/dashboard/RequireAuth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardHeader, StatCard, StatusBadge } from "@/components/dashboard/primitives";
import { Card } from "@/components/ui";
import { EmptyState } from "@/components/feedback/states";
import { isInternshipMaintenance } from "@/config/features";

export default function MentorPage() {
  const maintenance = isInternshipMaintenance();

  return (
    <RequireAuth permission="view_mentor">
      <DashboardShell>
        <DashboardHeader title="Mentor portal" subtitle="Guide your assigned interns and track their progress." />
        {maintenance && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
            Mentor portal reviews are temporarily on hold while mentors are assigned to the live PromptWars Hackathon.
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Users} label="Assigned interns" value="—" hint="Loaded from backend later" />
          <StatCard icon={ClipboardCheck} label="Reviews due" value="—" />
          <StatCard icon={MessageSquare} label="Messages" value="—" />
        </div>
        <Card className="mt-6">
          <h3 className="mb-4 font-semibold">Assigned interns</h3>
          <EmptyState
            title="No interns assigned yet"
            icon={<Users className="h-7 w-7" />}
            description="Once interns are assigned to you (backend), they'll appear here with progress and review actions."
          />
        </Card>
        <div className="mt-6 flex items-center gap-2 text-xs text-muted">
          <StatusBadge status="pending" /> Mentor data is backend-driven and mocked in this build.
        </div>
      </DashboardShell>
    </RequireAuth>
  );
}
