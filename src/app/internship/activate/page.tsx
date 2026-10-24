"use client";

import { useState } from "react";
import { KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { RequireAuth } from "@/components/dashboard/RequireAuth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardHeader } from "@/components/dashboard/primitives";
import { Card } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/forms/fields";
import { SuccessState } from "@/components/feedback/states";
import { isInternshipMaintenance } from "@/config/features";
import { InternshipMaintenanceView } from "@/components/views/InternshipMaintenanceView";

export default function ActivatePage() {
  if (isInternshipMaintenance()) {
    return <InternshipMaintenanceView mode="portal" />;
  }

  return (
    <RequireAuth permission="view_dashboard">
      <DashboardShell>
        <DashboardHeader title="Activate internship" subtitle="Enter your activation code to unlock your dashboard." />
        <div className="max-w-md">
          <ActivateForm />
        </div>
      </DashboardShell>
    </RequireAuth>
  );
}

function ActivateForm() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError(null);
    await new Promise((r) => setTimeout(r, 800));
    // Real activation + verification happens server-side later.
    if (code.trim().length >= 4) setState("done");
    else { setState("error"); setError("Enter a valid activation code."); }
  }

  if (state === "done") {
    return (
      <Card>
        <SuccessState title="Internship activated" description="Your dashboard is now unlocked." />
        <Button href="/internship/dashboard" className="mt-4 w-full">Go to dashboard <CheckCircle2 className="h-4 w-4" /></Button>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormField label="Activation code" htmlFor="code" error={error ?? undefined} hint="Provided after enrollment confirmation.">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX" className="pl-9" />
          </div>
        </FormField>
        <Button className="w-full" disabled={state === "loading"}>
          {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate"}
        </Button>
      </form>
    </Card>
  );
}
