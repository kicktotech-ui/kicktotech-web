"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BadgeCheck, Search, ShieldX, Loader2, ShieldAlert, ScrollText, CalendarDays, GraduationCap, UserCheck } from "lucide-react";
import { certificateService, type PublicCertificate, type VerificationOutcome } from "@/services";
import { Container, Section, Badge } from "@/components/ui";
import { FormField, Input } from "@/components/forms/fields";
import { formatDate } from "@/lib/utils";

type State = "idle" | "loading" | VerificationOutcome;

export function VerifyCertView() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("cert") ?? "";
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<State>("idle");
  const [cert, setCert] = useState<PublicCertificate | null>(null);

  const verify = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setState("loading");
    const { outcome, certificate } = await certificateService.verifyCertificate(id);
    setCert(certificate);
    setState(outcome);
  }, []);

  // Auto-verify when arriving via /verify_cert?cert=...
  useEffect(() => {
    if (initial) void verify(initial);
  }, [initial, verify]);

  return (
    <Section className="pt-8">
      <Container className="max-w-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const id = value.trim();
            router.replace(`/verify_cert?cert=${encodeURIComponent(id)}`);
            void verify(id);
          }}
          className="glass rounded-3xl p-6 sm:p-8"
          noValidate
        >
          <FormField label="Certificate ID" htmlFor="cert-id" hint="Format: KTT-YYYY-XXXX (e.g. KTT-2026-4KQ9)">
            <div className="flex gap-2">
              <Input id="cert-id" value={value} onChange={(e) => setValue(e.target.value)} placeholder="KTT-2026-XXXX" className="flex-1" />
              <button type="submit" disabled={state === "loading"} className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-foreground hover:shadow-glow disabled:opacity-60">
                {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Verify
              </button>
            </div>
          </FormField>
        </form>

        <div className="mt-8" aria-live="polite">
          {state === "loading" && (
            <div className="flex flex-col items-center rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center">
              <Loader2 className="h-9 w-9 animate-spin text-accent" />
              <p className="mt-4 text-sm text-muted">Checking against Kick To Tech records…</p>
            </div>
          )}

          {state === "verified" && cert && <VerifiedCard cert={cert} />}

          {state === "revoked" && cert && (
            <StatusCard
              tone="amber"
              icon={<ShieldAlert className="h-10 w-10 text-amber-300" />}
              title="Certificate revoked"
              body={`Certificate ${cert.certificateId} was issued by Kick To Tech but has since been revoked and is no longer valid.`}
            />
          )}

          {state === "not_found" && (
            <StatusCard
              tone="red"
              icon={<ShieldX className="h-10 w-10 text-red-300" />}
              title="Certificate not found"
              body="We couldn't find that ID in Kick To Tech's records. Please double-check the certificate ID and try again."
            />
          )}

          {state === "error" && (
            <StatusCard
              tone="red"
              icon={<ShieldX className="h-10 w-10 text-red-300" />}
              title="Unable to verify right now"
              body="Something went wrong while contacting the verification service. Please try again in a moment."
            />
          )}
        </div>
      </Container>
    </Section>
  );
}

function VerifiedCard({ cert }: { cert: PublicCertificate }) {
  const rows: Array<[string, string | undefined, React.ReactNode]> = [
    ["Certificate ID", cert.certificateId, <ScrollText key="i" className="h-4 w-4" />],
    ["Recipient", cert.recipientName, <UserCheck key="i" className="h-4 w-4" />],
    ["Program", cert.program, <GraduationCap key="i" className="h-4 w-4" />],
    ["Mentor", cert.mentorName ? `${cert.mentorName}${cert.mentorDesignation ? ` · ${cert.mentorDesignation}` : ""}` : undefined, <UserCheck key="i" className="h-4 w-4" />],
    ["Duration", cert.durationLabel, <CalendarDays key="i" className="h-4 w-4" />],
    ["Grade", cert.grade, <GraduationCap key="i" className="h-4 w-4" />],
    ["Issued on", cert.issuedAt ? formatDate(cert.issuedAt) : undefined, <CalendarDays key="i" className="h-4 w-4" />],
  ];
  return (
    <div className="overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/10 to-transparent">
      <div className="flex items-center gap-4 border-b border-accent/20 p-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/15 ring-1 ring-accent/30">
          <BadgeCheck className="h-8 w-8 text-accent" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="success">Verified</Badge>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent/80">Kick To Tech</span>
          </div>
          <p className="mt-1 text-sm text-muted">Certificate of Internship · verified directly against official records.</p>
        </div>
      </div>
      <div className="p-6">
        <dl className="divide-y divide-white/5">
          {rows.filter(([, v]) => v).map(([k, v, icon]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-3">
              <dt className="flex items-center gap-2 text-muted"><span className="text-accent/70">{icon}</span>{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        {cert.verifiedAt && (
          <p className="mt-5 text-center text-xs text-muted">
            Verified {formatDate(cert.verifiedAt)} at {new Date(cert.verifiedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.
          </p>
        )}
      </div>
    </div>
  );
}

function StatusCard({ tone, icon, title, body }: { tone: "red" | "amber"; icon: React.ReactNode; title: string; body: string }) {
  const ring = tone === "red" ? "border-red-400/30 bg-red-400/5" : "border-amber-400/30 bg-amber-400/5";
  return (
    <div className={`flex flex-col items-center rounded-3xl border p-10 text-center ${ring}`}>
      {icon}
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted">{body}</p>
    </div>
  );
}
