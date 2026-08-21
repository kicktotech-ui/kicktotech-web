"use client";

import { useState } from "react";
import { PageHeader, Card, Badge, Button, EmptyState, Input } from "@/components/admin/ui";
import { api } from "@/lib/api";
import { ShieldCheck, Search, ShieldX } from "lucide-react";

interface VerifyResult {
  found: boolean;
  valid?: boolean;
  status?: string;
  certificateId?: string;
  recipientName?: string;
  program?: string;
  domain?: string;
  grade?: string;
  durationLabel?: string;
  issuedAt?: string;
}

export default function VerifyPage() {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<VerifyResult | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    const id = q.trim();
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<VerifyResult>(`/certificates/verify/${encodeURIComponent(id)}`);
      setResult(res);
    } catch {
      setResult({ found: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Certificate verification" subtitle="Validate any Kick To Tech certificate ID against the live registry." />
      <Card className="p-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-adm-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && verify()}
              placeholder="e.g. KTT-2026-A1B2C3D4"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="characters"
              autoComplete="off"
              className="h-11 pl-10 font-mono bg-adm-surface focus:ring-2 focus:ring-[#0057ff]/20"
            />
          </div>
          <Button variant="primary" onClick={verify}>{loading ? "Verifying..." : "Verify"}</Button>
        </div>
      </Card>

      {result === undefined ? (
        <div className="mt-5"><EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="Enter a certificate ID to verify" description="Paste or type a Kick To Tech certificate ID (format KTT-YYYY-XXXX) and select Verify to check it against the live registry." /></div>
      ) : !result.found ? (
        <div className="mt-5"><EmptyState icon={<ShieldX className="h-6 w-6 text-red-500" />} title="No certificate found" description={`No record matches "${q}". Check the ID and try again.`} /></div>
      ) : (
        <Card className="mt-5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-adm-fg">{result.recipientName}</h2>
              <p className="font-mono text-xs text-adm-muted">{result.certificateId}</p>
            </div>
            <Badge tone={result.valid ? "green" : "red"} className="text-xs">
              {result.valid ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldX className="h-3.5 w-3.5" />} {result.status?.toUpperCase()}
            </Badge>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-adm-surface2">
            {[
              ["Program", result.program], ["Domain", result.domain],
              ["Grade", result.grade ?? "—"], ["Duration", result.durationLabel ?? "—"],
              ["Issued on", result.issuedAt ? new Date(result.issuedAt).toLocaleDateString("en-IN") : "—"],
              ["Status", result.status],
            ].map(([k, v]) => (
              <div key={k} className="bg-adm-surface px-4 py-3"><dt className="text-[11px] font-semibold uppercase tracking-wide text-adm-muted">{k}</dt><dd className="mt-0.5 text-sm font-medium text-adm-fg">{v}</dd></div>
            ))}
          </dl>
          {result.valid ? (
            <p className="mt-4 flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400"><ShieldCheck className="h-4 w-4" /> Authentic, publicly verifiable Kick To Tech credential.</p>
          ) : (
            <p className="mt-4 flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400"><ShieldX className="h-4 w-4" /> This certificate has been revoked and is no longer valid.</p>
          )}
        </Card>
      )}
    </div>
  );
}
