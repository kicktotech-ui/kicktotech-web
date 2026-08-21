"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, ArrowRight, ArrowLeft, ShieldCheck, Copy, MessageCircle, Clock, BadgeCheck } from "lucide-react";
import { internshipProgram } from "@/data/mock/internship";
import { api, ApiError } from "@/lib/api";
import { Container, Section } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { DomainCard } from "@/components/cards/DomainCard";
import { FormField, Input } from "@/components/forms/fields";
import { UpiQr } from "@/components/payments/UpiQr";
import { cn, formatINR } from "@/lib/utils";

const formSteps = ["Personal", "Academic", "Domain", "Review"] as const;
const phases = ["Information", "Payment", "Verification", "Certificate"] as const;

interface PaymentInfo {
  upiId: string; payeeName: string; amount: number; currency: string; upiUri: string;
  whatsappNumber: string; whatsappConfigured: boolean;
}
interface ApplyResponse { applicationId: string; status: string; duplicate: boolean; payment: PaymentInfo; whatsappUrl: string | null }

type Phase = "form" | "pay" | "proof" | "submitted";

export function RegisterFlow() {
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState(0);
  const [personal, setPersonal] = useState({ name: "", email: "", phone: "" });
  const [academic, setAcademic] = useState({ college: "", year: "", city: "" });
  const [domainId, setDomainId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<ApplyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const domain = internshipProgram.domains.find((d) => d.id === domainId);
  const activePhase = phase === "form" ? 0 : phase === "pay" || phase === "proof" ? 1 : 2;

  const canNext =
    (step === 0 && personal.name && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(personal.email) && personal.phone) ||
    (step === 1 && academic.college && academic.year) ||
    (step === 2 && domainId) ||
    step === 3;

  async function continueToPayment() {
    if (!domainId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<ApplyResponse>("/internship/apply", {
        name: personal.name, email: personal.email, phone: personal.phone,
        college: academic.college, year: academic.year, city: academic.city, domain: domainId,
      });
      setApplied(res);
      setPhase("pay");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyUpi() {
    if (!applied) return;
    try {
      await navigator.clipboard.writeText(applied.payment.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  }

  async function sendProof() {
    if (!applied) return;
    // Record proof-submitted server-side (verification remains manual/admin).
    try { await api.post("/internship/apply/proof", { applicationId: applied.applicationId }); } catch { /* non-blocking */ }
    if (applied.whatsappUrl) window.open(applied.whatsappUrl, "_blank");
    setPhase("submitted");
  }

  return (
    <Section className="pt-8">
      <Container className="max-w-3xl">
        {/* Phase indicator */}
        <ol className="mb-10 flex items-center justify-between">
          {phases.map((label, i) => (
            <li key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <span className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  i < activePhase ? "border-accent bg-accent text-accent-foreground" : i === activePhase ? "border-accent text-accent" : "border-line text-muted",
                )}>
                  {i < activePhase ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className="mt-2 hidden text-xs text-muted sm:block">{label}</span>
              </div>
              {i < phases.length - 1 && <span className={cn("mx-2 h-0.5 flex-1 rounded", i < activePhase ? "bg-accent" : "bg-line")} />}
            </li>
          ))}
        </ol>

        <motion.div key={phase + step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="glass rounded-3xl p-6 sm:p-8">
          {/* ---- INFORMATION (multi-step form) ---- */}
          {phase === "form" && (
            <>
              {step === 0 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-bold">Personal information</h2>
                  <FormField label="Full name" htmlFor="r-name"><Input id="r-name" value={personal.name} onChange={(e) => setPersonal({ ...personal, name: e.target.value })} placeholder="Your name" /></FormField>
                  <FormField label="Email" htmlFor="r-email"><Input id="r-email" type="email" value={personal.email} onChange={(e) => setPersonal({ ...personal, email: e.target.value })} placeholder="you@example.com" /></FormField>
                  <FormField label="Phone" htmlFor="r-phone"><Input id="r-phone" value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} placeholder="+91 ..." /></FormField>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-bold">Academic details</h2>
                  <FormField label="College / Institution" htmlFor="r-college"><Input id="r-college" value={academic.college} onChange={(e) => setAcademic({ ...academic, college: e.target.value })} placeholder="Your college" /></FormField>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Year" htmlFor="r-year"><Input id="r-year" value={academic.year} onChange={(e) => setAcademic({ ...academic, year: e.target.value })} placeholder="e.g. 2nd year" /></FormField>
                    <FormField label="City" htmlFor="r-city"><Input id="r-city" value={academic.city} onChange={(e) => setAcademic({ ...academic, city: e.target.value })} placeholder="Pune" /></FormField>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div>
                  <h2 className="mb-5 text-xl font-bold">Choose your domain</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {internshipProgram.domains.map((d) => (
                      <DomainCard key={d.id} domain={d} selected={domainId === d.id} onSelect={setDomainId} />
                    ))}
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold">Review</h2>
                  <dl className="divide-y divide-line rounded-2xl border border-line">
                    {[
                      ["Name", personal.name], ["Email", personal.email], ["Phone", personal.phone],
                      ["College", academic.college], ["Year", academic.year],
                      ["Domain", domain?.title ?? "-"], ["Mentor", domain?.mentor ?? "-"],
                      ["Processing fee", formatINR(internshipProgram.priceRupees)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 p-4 text-sm"><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
                    ))}
                  </dl>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <p className="flex items-center gap-2 text-xs text-muted"><ShieldCheck className="h-4 w-4 text-accent" /> Payment is verified manually by our team before your certificate is issued.</p>
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft className="h-4 w-4" /> Back</Button>
                {step < 3 ? (
                  <Button onClick={() => canNext && setStep((s) => s + 1)} disabled={!canNext}>Continue <ArrowRight className="h-4 w-4" /></Button>
                ) : (
                  <Button onClick={continueToPayment} disabled={submitting}>{submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Please wait…</> : <>Continue to payment <ArrowRight className="h-4 w-4" /></>}</Button>
                )}
              </div>
            </>
          )}

          {/* ---- PAYMENT (UPI QR) ---- */}
          {phase === "pay" && applied && (
            <div className="text-center">
              <h2 className="text-xl font-bold">Complete your payment</h2>
              <p className="mt-1 text-sm text-muted">Certificate processing fee</p>
              <p className="mt-2 text-4xl font-extrabold text-accent">{formatINR(applied.payment.amount)}</p>
              <p className="mt-4 text-sm text-muted">Scan the QR with any UPI app</p>
              <div className="mt-4"><UpiQr upiUri={applied.payment.upiUri} /></div>

              <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-line p-4">
                <p className="text-xs text-muted">UPI ID</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className="font-mono text-sm font-semibold">{applied.payment.upiId}</span>
                  <button onClick={copyUpi} className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs hover:bg-white/5">
                    <Copy className="h-3.5 w-3.5" /> {copied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-muted">Paying {applied.payment.payeeName}</p>
              </div>

              <Button size="lg" className="mt-6" onClick={() => setPhase("proof")}>I&apos;ve completed payment</Button>
              <p className="mx-auto mt-4 max-w-sm text-xs text-muted">
                After paying, tap the button above and send your payment proof on WhatsApp. Your payment is manually verified by our team.
              </p>
              <p className="mt-3 font-mono text-[11px] text-muted">Application ID: {applied.applicationId}</p>
            </div>
          )}

          {/* ---- VERIFICATION (proof) ---- */}
          {phase === "proof" && applied && (
            <div className="text-center">
              <h2 className="text-xl font-bold">Payment proof required</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted">
                To complete your application, please send your payment proof to our team on WhatsApp. Your payment will be manually verified by an administrator.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <Button size="lg" onClick={sendProof} disabled={!applied.whatsappUrl}>
                  <MessageCircle className="h-4 w-4" /> Send payment proof on WhatsApp
                </Button>
                {!applied.whatsappUrl && <p className="text-xs text-amber-400">WhatsApp number not configured yet — please contact the team.</p>}
                <Button variant="ghost" onClick={() => setPhase("pay")}><ArrowLeft className="h-4 w-4" /> Back to payment</Button>
              </div>
              <p className="mt-4 font-mono text-[11px] text-muted">Application ID: {applied.applicationId}</p>
            </div>
          )}

          {/* ---- SUBMITTED (waiting) ---- */}
          {phase === "submitted" && applied && (
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 ring-1 ring-accent/30"><Clock className="h-8 w-8 text-accent" /></div>
              <h2 className="mt-4 text-xl font-bold">Payment proof submitted</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Thanks! We&apos;ve received your application. Your payment is now <span className="font-medium text-neutral-200">waiting for manual verification</span>. Once verified, your certificate will be issued and you&apos;ll be notified.
              </p>
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm">
                <BadgeCheck className="h-4 w-4 text-accent" /> Application ID: <span className="font-mono font-semibold">{applied.applicationId}</span>
              </div>
              <p className="mt-3 text-xs text-muted">Did not open WhatsApp? <button onClick={sendProof} className="font-medium text-accent underline">Try again</button></p>
            </div>
          )}
        </motion.div>
      </Container>
    </Section>
  );
}
