"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Check, Loader2, ArrowRight, ArrowLeft, ShieldCheck,
  CreditCard, AlertCircle, ExternalLink, CheckCircle2, RefreshCw,
  LayoutDashboard, Clock,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/components/providers";
import { Container, Section } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/forms/fields";
import { cn, formatINR } from "@/lib/utils";

const HACKATHON_FEE = 99;

const phases = ["Information", "Payment", "Confirmation"] as const;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface ApplyResponse {
  applicationId: string;
  status: string;
  duplicate: boolean;
}

type Phase = "form" | "checkout" | "cancelled" | "failed" | "verifying" | "confirmed";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (res: any) => void) => void;
    };
  }
}

/** Dynamically load the official Razorpay Checkout script once. */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const existing = document.getElementById("razorpay-checkout-script");
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function Hack2SkillRegisterFlow() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState(0);
  const [personal, setPersonal] = useState({ name: "", email: "", phone: "" });
  const [academic, setAcademic] = useState({ college: "", course: "", year: "", teamName: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<ApplyResponse | null>(null);
  const [paymentResult, setPaymentResult] = useState<{ paymentId?: string; orderId?: string } | null>(null);

  // Pre-load the official Razorpay checkout script on mount
  useEffect(() => {
    loadRazorpayScript();
  }, []);

  // Pre-fill fields from authenticated profile & existing application
  useEffect(() => {
    let active = true;
    if (user) {
      setPersonal((p) => ({
        name: p.name || user.name || "",
        email: user.email || p.email,
        phone: p.phone || user.phone || "",
      }));
      if (user.college) {
        setAcademic((a) => ({
          ...a,
          college: a.college || user.college || "",
        }));
      }

      async function checkExistingRegistration() {
        try {
          const res = await api.get<{
            hackathon?: {
              enrolled?: boolean;
              registration?: {
                id: string;
                applicationId: string;
                kttId?: string;
                name?: string;
                email?: string;
                phone?: string;
                college?: string;
                course?: string;
                year?: string;
                teamName?: string;
                status?: string;
              } | null;
            };
          }>("/student/dashboard");

          if (!active) return;
          const reg = res?.hackathon?.registration;
          if (reg) {
            if (reg.name) setPersonal((p) => ({ ...p, name: reg.name || p.name }));
            if (reg.phone) setPersonal((p) => ({ ...p, phone: reg.phone || p.phone }));
            if (reg.college) {
              setAcademic((a) => ({
                ...a,
                college: reg.college || a.college,
                course: reg.course || a.course,
                year: reg.year || a.year,
                teamName: reg.teamName || a.teamName,
              }));
            }

            if (reg.status === "PAYMENT_VERIFIED" || reg.status === "CERTIFICATE_ISSUED") {
              setApplied({
                applicationId: reg.applicationId,
                status: reg.status,
                duplicate: true,
              });
              setPhase("confirmed");
            } else if (reg.status === "PAYMENT_PENDING") {
              setApplied({
                applicationId: reg.applicationId,
                status: reg.status,
                duplicate: true,
              });
              if (reg.college) {
                setStep(2);
              }
            }
          }
        } catch {
          // ignore error and let student proceed with normal flow
        }
      }

      checkExistingRegistration();
    }

    return () => {
      active = false;
    };
  }, [user]);

  const markTouched = (key: string) => setTouched((t) => ({ ...t, [key]: true }));

  const activePhase =
    phase === "form" ? 0 : phase === "confirmed" ? 2 : 1;

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

  /** Poll the server for authoritative payment confirmation in case of network interruption */
  const pollPaymentStatus = useCallback(
    async (appId: string, headers: Record<string, string>, fallbackPaymentId?: string) => {
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await api.get<{
            isPaid: boolean;
            status: string;
            razorpayPaymentId?: string;
          }>(`/hackathon/payment/status?applicationId=${encodeURIComponent(appId)}`, { headers });

          if (res.isPaid) {
            clearInterval(interval);
            setPaymentResult({
              paymentId: res.razorpayPaymentId || fallbackPaymentId,
            });
            setPhase("confirmed");
            return;
          }
        } catch {
          // Keep polling until limit
        }

        if (attempts >= 8) {
          clearInterval(interval);
          setError(
            "Payment verification timed out. If your account was debited, your registration will be updated shortly via webhook. Please refresh or contact support.",
          );
          setPhase("failed");
        }
      }, 2500);
    },
    [],
  );

  /** Launch Razorpay Standard Checkout */
  const launchRazorpay = useCallback(
    async (appId: string) => {
      setSubmitting(true);
      setError(null);
      setPhase("checkout");

      try {
        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay) {
          setError("Could not load Razorpay Checkout. Please check your internet connection and try again.");
          setPhase("failed");
          setSubmitting(false);
          return;
        }

        // 1. Create or retrieve server-authorized Razorpay Order
        const headers: Record<string, string> = {};
        const order = await api.post<{
          orderId: string;
          amount: number;
          currency: string;
          keyId: string;
          applicationId: string;
          alreadyPaid?: boolean;
        }>("/hackathon/payment/order", { applicationId: appId }, { headers });

        if (order.alreadyPaid) {
          setPhase("confirmed");
          setSubmitting(false);
          return;
        }

        // 2. Open Razorpay Standard Checkout
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "KICK To TECH",
          description: "PromptWars × KICK To TECH Participant Kit & Refreshment Fee",
          order_id: order.orderId,
          prefill: {
            name: personal.name,
            email: user?.email || personal.email,
            contact: personal.phone,
          },
          notes: {
            applicationId: appId,
          },
          theme: {
            color: "#0057ff",
          },
          modal: {
            ondismiss: () => {
              // User dismissed or closed Checkout
              setPhase("cancelled");
              setSubmitting(false);
            },
          },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            setPhase("verifying");
            setSubmitting(true);
            try {
              const verifyRes = await api.post<{
                applicationId: string;
                status: string;
                verified: boolean;
              }>(
                "/hackathon/payment/verify",
                {
                  applicationId: appId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
                { headers },
              );

              if (verifyRes.verified) {
                setPaymentResult({
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                });
                setPhase("confirmed");
              } else {
                pollPaymentStatus(appId, headers, response.razorpay_payment_id);
              }
            } catch (err) {
              console.error("[checkout] Verification error, starting fallback check:", err);
              pollPaymentStatus(appId, headers, response.razorpay_payment_id);
            } finally {
              setSubmitting(false);
            }
          },
        });

        rzp.on("payment.failed", (res: any) => {
          console.warn("[checkout] Payment failed:", res.error);
          setError(
            res.error?.description ||
              "Your payment could not be processed. Please try another payment method.",
          );
          setPhase("failed");
          setSubmitting(false);
        });

        rzp.open();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Could not open checkout. Please try again.");
        setPhase("failed");
        setSubmitting(false);
      }
    },
    [personal, user, pollPaymentStatus],
  );

  /** Initial registration submission -> directly initiates Razorpay Checkout */
  const continueToPayment = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<ApplyResponse>(
        "/hackathon/apply",
        {
          name: personal.name,
          email: user?.email || personal.email,
          phone: personal.phone,
          college: academic.college,
          course: academic.course,
          year: academic.year,
          teamName: academic.teamName || undefined,
        },
      );
      setApplied(res);

      if (res.status === "PAYMENT_VERIFIED" || res.status === "CERTIFICATE_ISSUED") {
        setPhase("confirmed");
        return;
      }

      await launchRazorpay(res.applicationId);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start your registration. Please try again.");
      setSubmitting(false);
    }
  }, [personal, academic, user, launchRazorpay]);

  return (
    <Section className="pt-8">
      <Container className="max-w-3xl">
        {/* Phase indicator */}
        <ol className="mb-10 flex items-center justify-between">
          {phases.map((label, i) => (
            <li key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                    i < activePhase
                      ? "border-accent bg-accent text-accent-foreground"
                      : i === activePhase
                      ? "border-accent text-accent"
                      : "border-line text-muted",
                  )}
                >
                  {i < activePhase ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className="mt-2 hidden text-xs text-muted sm:block">{label}</span>
              </div>
              {i < phases.length - 1 && (
                <span
                  className={cn("mx-2 h-0.5 flex-1 rounded", i < activePhase ? "bg-accent" : "bg-line")}
                />
              )}
            </li>
          ))}
        </ol>

        <motion.div
          key={phase + step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-3xl p-6 sm:p-8"
        >
          {/* ---- INFORMATION (multi-step form) ---- */}
          {phase === "form" && (
            <>
              {step === 0 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-bold">Personal information</h2>
                  <FormField label="Full name" htmlFor="h-name" error={errOf("name")}>
                    <Input
                      id="h-name"
                      value={personal.name}
                      invalid={Boolean(errOf("name"))}
                      onBlur={() => markTouched("name")}
                      onChange={(e) => setPersonal({ ...personal, name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </FormField>
                  <FormField
                    label="Email ID"
                    htmlFor="h-email"
                    error={errOf("email")}
                    hint={user?.email ? "Linked to your signed-in KICK To TECH account." : undefined}
                  >
                    <Input
                      id="h-email"
                      type="email"
                      value={personal.email}
                      disabled={Boolean(user?.email)}
                      readOnly={Boolean(user?.email)}
                      invalid={Boolean(errOf("email"))}
                      onBlur={() => markTouched("email")}
                      onChange={(e) => setPersonal({ ...personal, email: e.target.value })}
                      placeholder="you@example.com"
                    />
                  </FormField>
                  <FormField label="Phone number" htmlFor="h-phone" error={errOf("phone")}>
                    <Input
                      id="h-phone"
                      type="tel"
                      value={personal.phone}
                      invalid={Boolean(errOf("phone"))}
                      onBlur={() => markTouched("phone")}
                      onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </FormField>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-bold">Academic details</h2>
                  <FormField label="College / Institution name" htmlFor="h-college" error={errOf("college")}>
                    <Input
                      id="h-college"
                      value={academic.college}
                      invalid={Boolean(errOf("college"))}
                      onBlur={() => markTouched("college")}
                      onChange={(e) => setAcademic({ ...academic, college: e.target.value })}
                      placeholder="Your college / institution"
                    />
                  </FormField>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Course (optional)" htmlFor="h-course">
                      <Input
                        id="h-course"
                        value={academic.course}
                        onChange={(e) => setAcademic({ ...academic, course: e.target.value })}
                        placeholder="e.g. B.Tech CSE"
                      />
                    </FormField>
                    <FormField label="Year of study (optional)" htmlFor="h-year">
                      <Input
                        id="h-year"
                        value={academic.year}
                        onChange={(e) => setAcademic({ ...academic, year: e.target.value })}
                        placeholder="e.g. 2nd year"
                      />
                    </FormField>
                  </div>
                  <FormField label="Team name (optional)" htmlFor="h-team" hint="If you already have a team, enter the name here.">
                    <Input
                      id="h-team"
                      value={academic.teamName}
                      onChange={(e) => setAcademic({ ...academic, teamName: e.target.value })}
                      placeholder="e.g. CodeCrafters"
                    />
                  </FormField>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Review your registration</h2>
                    {applied?.applicationId && (
                      <span className="font-mono text-xs text-accent">
                        Ref: {applied.applicationId}
                      </span>
                    )}
                  </div>

                  {applied?.status === "PAYMENT_PENDING" && (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-200">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-300">
                          Application Saved • Payment Pending
                        </p>
                        <p className="mt-0.5 text-xs text-amber-200/80">
                          Complete the ₹99 Participant Kit & Refreshment Fee below to confirm your seat and receive your Unique Participant ID.
                        </p>
                      </div>
                    </div>
                  )}

                  <dl className="divide-y divide-line rounded-2xl border border-line">
                    {[
                      ["Name", personal.name],
                      ["Email", personal.email],
                      ["Phone", personal.phone],
                      ["College", academic.college],
                      ...(academic.course ? [["Course", academic.course]] : []),
                      ...(academic.year ? [["Year", academic.year]] : []),
                      ...(academic.teamName ? [["Team name", academic.teamName]] : []),
                      ["Event", "PromptWars × KICK To TECH"],
                      ["Participant Kit & Refreshment Fee", formatINR(HACKATHON_FEE)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 p-4 text-sm">
                        <dt className="text-muted">{k}</dt>
                        <dd className="font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <p className="flex items-center gap-2 text-xs text-muted">
                    <ShieldCheck className="h-4 w-4 text-accent" />
                    Instant automated payment verification via Razorpay. Your confirmation email will be delivered automatically.
                  </p>
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0 || submitting}
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                {step < 2 ? (
                  <Button onClick={goNext} disabled={!canNext}>
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={continueToPayment} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Preparing checkout…
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" /> Pay {formatINR(HACKATHON_FEE)} with Razorpay
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}

          {/* ---- CHECKOUT / VERIFYING STATE ---- */}
          {(phase === "checkout" || phase === "verifying") && (
            <div className="flex flex-col items-center py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-accent" />
              <h2 className="mt-6 text-xl font-bold">
                {phase === "verifying" ? "Verifying your payment…" : "Connecting to Razorpay Checkout…"}
              </h2>
              <p className="mt-2 max-w-sm text-sm text-muted">
                {phase === "verifying"
                  ? "We are verifying your transaction with Razorpay. Please do not close or refresh this window."
                  : "Complete your payment in the Razorpay popup. UPI, Cards, NetBanking, and Wallets supported."}
              </p>
              {applied && (
                <p className="mt-4 font-mono text-xs text-muted">
                  Application ID: {applied.applicationId}
                </p>
              )}
            </div>
          )}

          {/* ---- CANCELLED / DISMISSED STATE ---- */}
          {phase === "cancelled" && applied && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30">
                <AlertCircle className="h-7 w-7 text-amber-400" />
              </div>
              <h2 className="mt-4 text-xl font-bold">Payment was not completed</h2>
              <p className="mt-2 max-w-md text-sm text-muted">
                You closed the payment window before completing the transaction. Your registration is saved as pending.
                You can retry whenever you are ready.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => launchRazorpay(applied.applicationId)}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Opening Razorpay…
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" /> Pay {formatINR(HACKATHON_FEE)} now
                    </>
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setPhase("form")}>
                  Review registration details
                </Button>
              </div>
              <p className="mt-6 font-mono text-xs text-muted">
                Application ID: {applied.applicationId}
              </p>
            </div>
          )}

          {/* ---- FAILED STATE ---- */}
          {phase === "failed" && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/30">
                <AlertCircle className="h-7 w-7 text-red-400" />
              </div>
              <h2 className="mt-4 text-xl font-bold">Payment could not be completed</h2>
              <p className="mt-2 max-w-md text-sm text-muted">
                {error || "An error occurred during payment processing. No funds were captured or your bank may decline the attempt."}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {applied && (
                  <Button
                    size="lg"
                    onClick={() => launchRazorpay(applied.applicationId)}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Retrying…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" /> Try again
                      </>
                    )}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setPhase("form")}>
                  Edit details
                </Button>
              </div>
              {applied && (
                <p className="mt-6 font-mono text-xs text-muted">
                  Application ID: {applied.applicationId}
                </p>
              )}
            </div>
          )}

          {/* ---- CONFIRMED STATE (Payment Verified & Brevo Template 5 sent) ---- */}
          {phase === "confirmed" && (
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/30"
              >
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </motion.div>
              <h2 className="mt-4 text-2xl font-bold">Payment Verified &amp; Registration Confirmed!</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Your payment of <span className="font-semibold text-primary-foreground">{formatINR(HACKATHON_FEE)}</span> has been authoritatively verified.
                Your official confirmation email (with event schedules and instructions) has been sent to{" "}
                <span className="font-semibold text-primary-foreground">{user?.email || personal.email}</span>.
              </p>

              {/* Verified metadata */}
              <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-3">
                {applied && (
                  <div className="rounded-xl border border-line bg-surface/50 px-4 py-2 font-mono text-xs">
                    <span className="text-muted">Application ID:</span>{" "}
                    <span className="font-semibold text-accent">{applied.applicationId}</span>
                  </div>
                )}
                {paymentResult?.paymentId && (
                  <div className="rounded-xl border border-line bg-surface/50 px-4 py-2 font-mono text-xs">
                    <span className="text-muted">Payment ID:</span>{" "}
                    <span className="font-semibold text-emerald-400">{paymentResult.paymentId}</span>
                  </div>
                )}
              </div>

              {/* PromptWars external registration notice — upgraded Next Step box */}
              <div className="mx-auto mt-8 w-full max-w-2xl rounded-2xl border-2 border-accent/50 bg-gradient-to-b from-accent/[0.12] via-accent/[0.06] to-surface/80 p-6 sm:p-8 text-left shadow-2xl shadow-accent/10 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="flex items-center gap-2.5 text-lg sm:text-xl font-bold text-accent">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-accent ring-1 ring-accent/40">
                      <ExternalLink className="h-5 w-5" />
                    </span>
                    Next Step: Complete Hack2Skill Platform Registration
                  </h3>
                  <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-accent/20 px-3 py-1 text-xs font-bold text-accent ring-1 ring-accent/40">
                    Mandatory Step
                  </span>
                </div>

                <p className="mt-4 text-sm sm:text-base leading-relaxed text-primary-foreground/90 font-medium">
                  Your payment of <span className="text-accent font-semibold">{formatINR(HACKATHON_FEE)}</span> is verified! To receive problem statements, access project submission, and get your team dashboard, complete this final step on the Hack2Skill platform:
                </p>

                {/* Steps guidance */}
                <div className="mt-5 space-y-3 rounded-xl border border-line bg-surface/60 p-4 sm:p-5">
                  <div className="flex items-start gap-3 text-xs sm:text-sm text-primary-foreground/90">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 font-bold text-accent">
                      1
                    </span>
                    <span>
                      Click the <strong className="text-accent font-semibold">Open PromptWars Registration Page</strong> button below.
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-xs sm:text-sm text-primary-foreground/90">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 font-bold text-accent">
                      2
                    </span>
                    <span>
                      Sign in or create your account using <strong className="text-primary-foreground font-semibold">{user?.email || personal.email}</strong>.
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-xs sm:text-sm text-primary-foreground/90">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-400">
                      ✓
                    </span>
                    <span>
                      Your ₹99 participant kit & refreshment fee is already verified with KICK To TECH. Join the event and form your team!
                    </span>
                  </div>
                </div>

                {/* Prominent Large Call To Action Button */}
                <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-accent/20">
                  <a
                    href="https://hack2skill.com/event/promptwars-x-kicktotech-promptwars-2026?utm_source=hack2skill&utm_medium=homepage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex w-full sm:w-auto items-center justify-center gap-3 rounded-xl bg-accent px-8 py-4 text-base sm:text-lg font-bold text-accent-foreground shadow-lg shadow-accent/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(34,227,214,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span>Open PromptWars Registration Page</span>
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                  <p className="text-xs text-muted">
                    Opens official portal in a new tab • Takes ~1 min
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => (window.location.href = "/internship/dashboard?tab=hackathon")}
                  className="shadow-lg shadow-accent/20"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Hackathon Dashboard
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => (window.location.href = "/hackathon")}
                >
                  Return to Hackathons Overview
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </Container>
    </Section>
  );
}
