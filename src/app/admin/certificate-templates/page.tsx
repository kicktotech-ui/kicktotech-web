"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PageHeader, Card, Button, Input, Select, Field } from "@/components/admin/ui";
import { useToast } from "@/components/admin/toast";
import { api, ApiError } from "@/lib/api";
import { Download, Send, ExternalLink, BadgeCheck, AlertTriangle, RotateCcw, User, ScrollText, PenLine } from "lucide-react";
import { CertificateRenderer, CertificateScaler } from "@/components/certificates/CertificateRenderer";
import { CroppedSignature } from "@/components/certificates/CroppedSignature";
import { CertificatePrintLayer } from "@/components/certificates/CertificatePrintLayer";
import { MentorSelect } from "@/components/certificates/MentorSelect";
import { type CertificateTemplateId, type CertificateData } from "@/lib/certificates/types";
import {
  getMentorById, resolveMentorForDomain, AUTHORIZED_SIGNATORIES,
  DOMAIN_META, DOMAIN_SLUGS, type CertificateDomain,
} from "@/lib/certificates/mentors";
import { cn } from "@/lib/utils";

const PREVIEW_ID = "KTT-YYYY-XXXX";
const DEFAULTS = { name: "Recipient Name", email: "", college: "", grade: "A", duration: "5 Weeks (18 May 2026 – 21 June 2026)" };

interface Issued { certificateId: string; issuedAt: string; verificationUrl: string; duplicate: boolean }

export default function CertificateStudioPage() {
  const toast = useToast();
  const tpl: CertificateTemplateId = "classic";
  const [domain, setDomain] = useState<CertificateDomain>("python");
  const [mentorId, setMentorId] = useState<string>(resolveMentorForDomain("python")?.id ?? "");
  const [f, setF] = useState({ ...DEFAULTS });
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [tab, setTab] = useState<"details" | "preview">("details");
  const [dirty, setDirty] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setIssued(null); setDirty(true); };

  function onDomainChange(d: CertificateDomain) {
    setDomain(d);
    setMentorId(resolveMentorForDomain(d)?.id ?? "");
    setIssued(null); setDirty(true);
  }

  const mentor = getMentorById(mentorId);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const previewData: CertificateData = useMemo(() => ({
    recipientName: f.name || "Recipient Name",
    program: DOMAIN_META[domain].program,
    domainLabel: DOMAIN_META[domain].label,
    grade: f.grade || undefined,
    certificateId: issued?.certificateId ?? PREVIEW_ID,
    issuedDateLabel: issued ? new Date(issued.issuedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "dd Mon yyyy",
    durationLabel: f.duration || undefined,
    mentor: mentor ? { name: mentor.name, designation: mentor.designation, signatureAsset: mentor.signatureAsset } : null,
    signatories: AUTHORIZED_SIGNATORIES.map((s) => ({ name: s.name, designation: s.designation, signatureAsset: s.signatureAsset })),
    verificationUrl: issued?.verificationUrl ?? `${origin}/verify_cert?cert=${PREVIEW_ID}`,
    isPreview: !issued,
  }), [f, domain, mentor, issued, origin]);

  const missingMentor = !mentor;

  function reset() {
    if (!window.confirm("Reset all fields to defaults?")) return;
    setF({ ...DEFAULTS }); setDomain("python"); setMentorId(resolveMentorForDomain("python")?.id ?? "");
    setIssued(null); setDirty(false);
  }

  async function issue() {
    if (f.name.trim().length < 2) { toast.error("Enter a recipient name."); return; }
    if (missingMentor) { toast.error("Select a mentor with a signature before issuing."); return; }
    setIssuing(true);
    try {
      const res = await api.post<{ certificate: { certificateId: string; issuedAt: string }; duplicate: boolean; verificationUrl: string }>(
        "/admin/certificates",
        {
          recipientName: f.name, email: f.email || undefined, college: f.college || undefined,
          program: DOMAIN_META[domain].program, domain, grade: f.grade || undefined,
          durationLabel: f.duration || undefined, mentorId,
        },
      );
      setIssued({ certificateId: res.certificate.certificateId, issuedAt: res.certificate.issuedAt, verificationUrl: res.verificationUrl, duplicate: res.duplicate });
      setDirty(false);
      toast.success(res.duplicate ? `Already issued: ${res.certificate.certificateId} (no duplicate created).` : `Certificate issued: ${res.certificate.certificateId}.`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not issue certificate.");
    } finally {
      setIssuing(false);
    }
  }

  return (
    <div>
      <PageHeader title="Certificate studio" subtitle="Configure, preview, and issue a real verifiable credential." />

      {/* Mobile tabs */}
      <div className="mb-4 flex rounded-lg border border-adm-border bg-adm-surface2 p-0.5 lg:hidden">
        {(["details", "preview"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition-colors", tab === t ? "bg-adm-surface text-adm-fg shadow-sm" : "text-adm-muted")}>{t}</button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Config */}
        <div className={cn("space-y-4", tab !== "details" && "hidden lg:block")}>
          <Section title="Recipient" icon={<User className="h-4 w-4" />}>
            <Field label="Recipient name"><Input value={f.name} onChange={set("name")} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email (optional)"><Input value={f.email} onChange={set("email")} placeholder="name@email.com" /></Field>
              <Field label="Grade"><Input value={f.grade} onChange={set("grade")} /></Field>
            </div>
            <Field label="College (optional)"><Input value={f.college} onChange={set("college")} /></Field>
          </Section>

          <Section title="Certificate" icon={<ScrollText className="h-4 w-4" />}>
            <Field label="Domain"><Select value={domain} onChange={(e) => onDomainChange(e.target.value as CertificateDomain)}>
              {DOMAIN_SLUGS.map((d) => <option key={d} value={d}>{DOMAIN_META[d].label}</option>)}
            </Select></Field>
            <Field label="Duration"><Input value={f.duration} onChange={set("duration")} /></Field>
            <Field label="Certificate ID"><Input value={issued?.certificateId ?? PREVIEW_ID} readOnly className="bg-adm-surface2 text-adm-muted" /></Field>
            <p className="text-[11px] text-adm-muted">The ID is allocated by the backend only when you issue — never during preview.</p>
          </Section>

          <Section title="Mentor & signature" icon={<PenLine className="h-4 w-4" />}>
            <MentorSelect value={mentorId} onChange={(id) => { setMentorId(id); setIssued(null); setDirty(true); }} />
            {mentor && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-adm-border bg-adm-surface2 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {mentor.photo && <img src={mentor.photo} alt={mentor.name} className="h-11 w-11 rounded-full object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-adm-fg">{mentor.name}</p>
                  <p className="truncate text-xs text-adm-muted">{mentor.designation}</p>
                </div>
                <span className="flex h-12 w-32 items-center justify-center rounded-md bg-white px-2 shadow-sm">
                  <CroppedSignature src={mentor.signatureAsset} alt={`${mentor.name} signature`} className="max-h-10 max-w-full object-contain" />
                </span>
              </div>
            )}
            {missingMentor && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" /> No mentor/signature configured — issuance is blocked.
              </div>
            )}
            <p className="mt-2 text-[11px] text-adm-muted">Founder &amp; co-founder signatures are added automatically on every certificate.</p>
          </Section>

          {issued && (
            <Card className="border-emerald-400/40 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400"><BadgeCheck className="h-5 w-5" /><h3 className="text-sm font-bold">{issued.duplicate ? "Already issued" : "Certificate issued"}</h3></div>
              <p className="mt-2 font-mono text-sm font-bold text-adm-fg">{issued.certificateId}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => window.open(issued.verificationUrl, "_blank")}><ExternalLink className="h-4 w-4" /> Verification</Button>
                <Button size="sm" variant="secondary" onClick={() => window.print()}><Download className="h-4 w-4" /> Download PDF</Button>
              </div>
            </Card>
          )}
        </div>

        {/* Live preview — document-style, independent of admin theme */}
        <div className={cn("lg:sticky lg:top-6 lg:self-start", tab !== "preview" && "hidden lg:block")}>
          <Card className="p-4 sm:p-6">
            <CertificateScaler>
              <CertificateRenderer data={previewData} template={tpl} />
            </CertificateScaler>
            <p className="mt-3 text-center text-xs text-adm-muted">
              {issued ? "Issued credential — verifiable via the QR code." : "Live preview · not yet issued · fields update in real time"}
            </p>
          </Card>
        </div>
      </div>

      {/* Sticky action footer (in content flow → respects sidebar width) */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-5 border-t border-adm-border bg-adm-surface/95 backdrop-blur sm:-mx-6">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="hidden text-xs text-adm-muted sm:block">
            {issued ? "Certificate issued · verifiable now" : dirty ? "Unsaved changes · preview updates live" : "Ready to configure"}
          </p>
          <div className="flex flex-1 items-center justify-end gap-2">
            <Button variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" /> Reset</Button>
            <Button variant="secondary" onClick={() => window.print()}><Download className="h-4 w-4" /> {issued ? "Download PDF" : "Print preview"}</Button>
            <Button variant="primary" onClick={issue} disabled={issuing || missingMentor}><Send className="h-4 w-4" /> {issuing ? "Issuing…" : issued ? "Issued" : "Issue certificate"}</Button>
          </div>
        </div>
      </div>

      <CertificatePrintLayer data={previewData} template={tpl} />
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-adm-fg"><span className="text-adm-muted">{icon}</span>{title}</h3>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}
