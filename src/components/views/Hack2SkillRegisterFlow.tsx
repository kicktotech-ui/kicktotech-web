"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Check, Loader2, ArrowRight, ArrowLeft, ShieldCheck, Copy,
  MessageCircle, Clock, BadgeCheck, ExternalLink, CheckCircle2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Container, Section } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/forms/fields";
import { cn, formatINR } from "@/lib/utils";

const HACKATHON_FEE = 99;

const formSteps = ["Personal", "Academic", "Review"] as const;
const phases = ["Information", "Payment", "Verification"] as const;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface PaymentInfo {
  upiId: string; payeeName: string; amount: number; currency: string; upiUri: string;
  whatsappNumber: string; whatsappConfigured: boolean;
}
interface ApplyResponse {
  applicationId: string; status: string; duplicate: boolean;
  payment: PaymentInfo; whatsappUrl: string | null;
}

type Phase = "form" | "pay" | "proof" | "submitted";

export function Hack2SkillRegisterFlow() {
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState(0);
  const [personal, setPersonal] = useState({ name: "", email: "", phone: "" });
  const [academic, setAcademic] = useState({ college: "", course: "", year: "", teamName: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sendingProof, setSendingProof] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<ApplyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const markTouched = (key: string) => setTouched((t) => ({ ...t, [key]: true }));

  const activePhase = phase === "form" ? 0 : phase === "pay" || phase === "proof" ? 1 : 2;

  // Per-field validation (authoritative check still runs server-side).
  const fieldError: Record<string, string | undefined> = {
    name: !personal.name.trim() ? "Enter your full name." : undefined,
    email: !personal.email.trim() ? "Enter your email address." : !EMAIL_RE.test(personal.email) ? "Enter a valid email address." : undefined,
    phone: !personal.phone.trim() ? "Enter your phone number." : personal.phone.trim().length < 6 ? "Enter a valid phone number." : undefined,
    college: !academic.college.trim() ? "Enter your college name." : undefined,
  };
  const errOf = (key: string) => (touched[key] ? fieldError[key] : undefined);

  const canNext =
    (step === 0 && !fieldError.name && !fieldError.email && !fieldError.phone) ||
    (step === 1 && !fieldError.college) ||
    step === 2;

  function goNext() {
    const stepKeys = step === 0 ? ["name", "email", "phone"] : step === 1 ? ["college"] : [];
    if (!canNext) {
      setTouched((t) => ({ ...t, ...Object.fromEntries(stepKeys.map((k) => [k, true])) }));
      return;
    }
    setStep((s) => s + 1);
  }

  const continueToPayment = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<ApplyResponse>("/hackathon/apply", {
        name: personal.name, email: personal.email, phone: personal.phone,
        college: academic.college, course: academic.course, year: academic.year,
        teamName: academic.teamName || undefined,
      });
      setApplied(res);
      setPhase("pay");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start your registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [personal, academic]);

  const copyUpi = useCallback(async () => {
    if (!applied) return;
    try {
      await navigator.clipboard.writeText(applied.payment.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  }, [applied]);

  const sendProof = useCallback(async () => {
    if (!applied || sendingProof) return; // prevent duplicate clicks
    setSendingProof(true);
    setError(null);
    // Record proof-submitted server-side (no email is triggered here).
    try {
      await api.post<{ status: string }>(
        "/hackathon/apply/proof",
        { applicationId: applied.applicationId },
      );
    } catch (e) {
      console.warn("[hack2skill] proof submission failed:", e);
    }
    if (applied.whatsappUrl) window.open(applied.whatsappUrl, "_blank");
    setPhase("submitted");
    setSendingProof(false);
  }, [applied, sendingProof]);

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
                  <FormField label="Full name" htmlFor="h-name" error={errOf("name")}>
                    <Input id="h-name" value={personal.name} invalid={Boolean(errOf("name"))} onBlur={() => markTouched("name")} onChange={(e) => setPersonal({ ...personal, name: e.target.value })} placeholder="Your full name" />
                  </FormField>
                  <FormField label="Email ID" htmlFor="h-email" error={errOf("email")}>
                    <Input id="h-email" type="email" value={personal.email} invalid={Boolean(errOf("email"))} onBlur={() => markTouched("email")} onChange={(e) => setPersonal({ ...personal, email: e.target.value })} placeholder="you@example.com" />
                  </FormField>
                  <FormField label="Phone number" htmlFor="h-phone" error={errOf("phone")}>
                    <Input id="h-phone" type="tel" value={personal.phone} invalid={Boolean(errOf("phone"))} onBlur={() => markTouched("phone")} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} placeholder="+91 98765 43210" />
                  </FormField>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-bold">Academic details</h2>
                  <FormField label="College / Institution name" htmlFor="h-college" error={errOf("college")}>
                    <Input id="h-college" value={academic.college} invalid={Boolean(errOf("college"))} onBlur={() => markTouched("college")} onChange={(e) => setAcademic({ ...academic, college: e.target.value })} placeholder="Your college / institution" />
                  </FormField>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Course (optional)" htmlFor="h-course">
                      <Input id="h-course" value={academic.course} onChange={(e) => setAcademic({ ...academic, course: e.target.value })} placeholder="e.g. B.Tech CSE" />
                    </FormField>
                    <FormField label="Year of study (optional)" htmlFor="h-year">
                      <Input id="h-year" value={academic.year} onChange={(e) => setAcademic({ ...academic, year: e.target.value })} placeholder="e.g. 2nd year" />
                    </FormField>
                  </div>
                  <FormField label="Team name (optional)" htmlFor="h-team" hint="If you already have a team, enter the name here.">
                    <Input id="h-team" value={academic.teamName} onChange={(e) => setAcademic({ ...academic, teamName: e.target.value })} placeholder="e.g. CodeCrafters" />
                  </FormField>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold">Review your registration</h2>
                  <dl className="divide-y divide-line rounded-2xl border border-line">
                    {[
                      ["Name", personal.name], ["Email", personal.email], ["Phone", personal.phone],
                      ["College", academic.college],
                      ...(academic.course ? [["Course", academic.course]] : []),
                      ...(academic.year ? [["Year", academic.year]] : []),
                      ...(academic.teamName ? [["Team name", academic.teamName]] : []),
                      ["Event", "PromptWars × KICK To TECH"],
                      ["Registration fee", formatINR(HACKATHON_FEE)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 p-4 text-sm"><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
                    ))}
                  </dl>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <p className="flex items-center gap-2 text-xs text-muted"><ShieldCheck className="h-4 w-4 text-accent" /> Payment is verified manually by our team. Your registration is confirmed only after payment verification.</p>
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft className="h-4 w-4" /> Back</Button>
                {step < 2 ? (
                  <Button onClick={goNext} disabled={!canNext}>Continue <ArrowRight className="h-4 w-4" /></Button>
                ) : (
                  <Button onClick={continueToPayment} disabled={submitting}>{submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Please wait…</> : <>Continue to payment <ArrowRight className="h-4 w-4" /></>}</Button>
                )}
              </div>
            </>
          )}

          {/* ---- PAYMENT (static QR image for ₹99) ---- */}
          {phase === "pay" && applied && (
            <div className="text-center">
              <h2 className="text-xl font-bold">Complete your payment</h2>
              <p className="mt-1 text-sm text-muted">PromptWars × KICK To TECH registration fee</p>
              <p className="mt-2 text-4xl font-extrabold text-accent">{formatINR(applied.payment.amount)}</p>
              <p className="mt-4 text-sm text-muted">Scan the QR with any UPI app</p>
              {/* Display the supplied ₹99 QR image exactly as-is */}
              <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-3 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/QR 99 HACKTHOAN.png"
                  alt="UPI payment QR code for the ₹99 Hack2Skill registration fee — scan and pay with any UPI app"
                  style={{ width: 280, height: "auto", display: "block" }}
                />
              </div>

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
              <h2 className="text-xl font-bold">Send your payment proof</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted">
                Send your <span className="font-medium text-primary-foreground/90">₹{applied.payment.amount} payment screenshot</span> to our team on WhatsApp.
                Your payment will be <span className="font-medium text-primary-foreground/90">manually verified</span> before your confirmation email is sent.
              </p>
              <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs text-amber-300">⚠️ Clicking this button does not confirm your payment. You must attach and send your payment screenshot in WhatsApp.</p>
              </div>
              <div className="mt-6 flex flex-col items-center gap-3">
                <Button size="lg" onClick={sendProof} disabled={!applied.whatsappUrl || sendingProof}>
                  {sendingProof ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening WhatsApp…</> : <><MessageCircle className="h-4 w-4" /> Send payment proof on WhatsApp</>}
                </Button>
                {!applied.whatsappUrl && <p className="text-xs text-amber-400">WhatsApp number not configured yet — please contact the team.</p>}
                <Button variant="ghost" onClick={() => setPhase("pay")}><ArrowLeft className="h-4 w-4" /> Back to payment</Button>
              </div>
              <p className="mt-4 font-mono text-[11px] text-muted">Application ID: {applied.applicationId}</p>
            </div>
          )}

          {/* ---- SUBMITTED (awaiting admin verification) ---- */}
          {phase === "submitted" && applied && (
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 ring-1 ring-accent/30"
              >
                <CheckCircle2 className="h-8 w-8 text-accent" />
              </motion.div>
              <h2 className="mt-4 text-xl font-bold">Payment proof submitted!</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Your payment declaration has been recorded. Please ensure you have sent your{" "}
                <span className="font-medium text-primary-foreground/90">₹{applied.payment.amount} payment screenshot</span>{" "}
                on WhatsApp for verification.
              </p>

              {/* Status lifecycle */}
              <div className="mx-auto mt-6 max-w-sm space-y-2 text-left text-xs">
                <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
                  <Check className="h-3.5 w-3.5 text-accent" /> <span>Registration submitted</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
                  <Check className="h-3.5 w-3.5 text-accent" /> <span>Payment proof declared</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 font-medium text-amber-300">
                  <Clock className="h-3.5 w-3.5" /> <span>Awaiting admin payment verification</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-muted">
                  <BadgeCheck className="h-3.5 w-3.5" /> <span>Confirmation email will be sent after verification</span>
                </div>
              </div>

              {/* Payment verification notice */}
              <div className="mx-auto mt-6 max-w-md rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-left">
                <p className="text-xs text-amber-300">
                  <span className="font-medium text-amber-200">⚠️ Important:</span>{" "}
                  Your payment will be manually verified by our team against the actual receiving account.
                  Your confirmation email (with hackathon details and next steps) will be sent only after
                  your payment has been verified by an admin.
                </p>
              </div>

              {/* PromptWars external registration notice — always shown */}
              <div className="mx-auto mt-4 max-w-md rounded-2xl border border-accent/30 bg-accent/5 p-5 text-left">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-accent">
                  <ExternalLink className="h-4 w-4" /> Next Step: Complete Hack2Skill Registration
                </h3>
                <p className="mt-2 text-xs text-muted">
                  To complete your hackathon participation, you must also register on the official PromptWars platform.
                  Visit the{" "}
                  <a href="https://hack2skill.com/event/promptwars-x-kicktotech-promptwars-2026?utm_source=hack2skill&utm_medium=homepage" target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline">PromptWars registration page</a> to register.
                </p>
              </div>

              <div className="mt-5 flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm">
                <BadgeCheck className="h-4 w-4 text-accent" /> Application ID: <span className="font-mono font-semibold">{applied.applicationId}</span>
              </div>
              <p className="mt-3 text-xs text-muted">Did not open WhatsApp? <button onClick={sendProof} disabled={sendingProof} className="font-medium text-accent underline disabled:opacity-50">Try again</button></p>
            </div>
          )}
        </motion.div>
      </Container>
    </Section>
  );
}
