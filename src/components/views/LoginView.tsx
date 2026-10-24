"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldAlert, ArrowRight, Mail, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/providers";
import { isAdminEmail } from "@/lib/authRules";
import {
  firebaseSignIn,
  firebaseRefreshUser,
  firebaseSendVerificationEmail,
  firebaseLogout,
} from "@/lib/firebase/firebaseAuth";
import { AuthShell } from "@/components/layout/AuthShell";
import { FormField, Input } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";

/* ============================================================================
   LoginView — REAL Firebase Authentication login.

   Flow:
     1. signInWithEmailAndPassword()
     2. reload() → check emailVerified
     3. If !emailVerified → show verification-required panel
     4. If emailVerified → load profile → redirect to dashboard
   ========================================================================== */

export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const rawRedirect = params.get("redirect");
  const redirect =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/hackathon/register";
  const { refresh } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminBlocked, setAdminBlocked] = useState(false);

  // Verification-required state
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdminBlocked(false);
    setNeedsVerification(false);
    setResendMessage(null);

    // UX-only admin separation
    if (isAdminEmail(email)) {
      setAdminBlocked(true);
      return;
    }

    setLoading(true);

    // 1. Sign in with Firebase
    const signInResult = await firebaseSignIn(email, password);
    if (!signInResult.success || !signInResult.user) {
      setLoading(false);
      setError(signInResult.error ?? "Login failed. Please check your details.");
      return;
    }

    // 2. Reload user to get fresh emailVerified status
    const { emailVerified } = await firebaseRefreshUser();

    // 3. Check verification
    if (!emailVerified) {
      setLoading(false);
      setNeedsVerification(true);
      return;
    }

    // 4. Verified — refresh auth context and redirect
    await refresh();
    setLoading(false);
    router.push(redirect);
  }

  async function handleResend() {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendMessage(null);

    const result = await firebaseSendVerificationEmail();
    setResendLoading(false);

    if (result.success) {
      setResendMessage("Verification email sent. Check your inbox and spam folder.");
      setResendCooldown(45);
      const timer = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      setResendMessage(result.error ?? "Failed to send verification email.");
    }
  }

  async function handleCheckVerification() {
    setLoading(true);
    const { emailVerified } = await firebaseRefreshUser();
    if (emailVerified) {
      await refresh();
      router.push(redirect);
    } else {
      setLoading(false);
      setResendMessage("Email not yet verified. Please check your inbox.");
    }
  }

  async function handleUseAnother() {
    await firebaseLogout();
    setNeedsVerification(false);
    setEmail("");
    setPassword("");
    setError(null);
    setResendMessage(null);
  }

  // --- VERIFICATION REQUIRED PANEL ---
  if (needsVerification) {
    return (
      <AuthShell
        eyebrow="Student Portal"
        title="Email verification required"
        subtitle="Your account exists, but your email hasn't been verified yet."
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4">
            <Mail className="h-5 w-5 flex-shrink-0 text-accent" />
            <div className="text-sm">
              <p className="font-medium text-primary-foreground/90">Verification link sent to:</p>
              <p className="mt-0.5 font-mono text-xs text-muted">{email}</p>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckVerification}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</>
            ) : (
              "I've verified my email"
            )}
          </Button>

          <div className="text-center">
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {resendCooldown > 0
                ? `Resend available in ${resendCooldown}s`
                : "Resend verification email"}
            </button>
          </div>

          {resendMessage && (
            <p className="text-center text-xs text-accent/80">{resendMessage}</p>
          )}

          <div className="border-t border-line pt-4 text-center">
            <button
              onClick={handleUseAnother}
              className="text-sm font-medium text-muted transition-colors hover:text-primary-foreground"
            >
              Use another account
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  // --- NORMAL LOGIN FORM ---
  return (
    <AuthShell
      eyebrow="Student Portal"
      title="Student login"
      subtitle="Sign in to your Kick To Tech student account."
      footer={<>New here? <Link href="/signup" className="font-semibold text-accent">Create a student account</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormField label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setAdminBlocked(false); }}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </FormField>
        <FormField label="Password" htmlFor="password">
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-accent"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FormField>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-muted hover:text-accent">Forgot password?</Link>
        </div>

        {adminBlocked && (
          <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-300">
              <ShieldAlert className="h-4 w-4" /> This is an admin account.
            </p>
            <p className="mt-1 text-sm text-muted">Admin accounts can&apos;t sign in through the student portal. Please use the Admin Portal.</p>
            <Link href="/admin/login" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
              Go to Admin Login <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

        <Button className="w-full" size="lg" disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 border-t border-line pt-4 text-center">
        <Link href="/admin/login" className="text-xs font-medium text-muted transition-colors hover:text-accent">
          Are you an administrator? Use the Admin Portal →
        </Link>
      </div>
    </AuthShell>
  );
}
