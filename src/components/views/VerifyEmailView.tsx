"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, CheckCircle2, RefreshCw, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers";
import {
  firebaseSendVerificationEmail,
  firebaseRefreshUser,
  firebaseLogout,
} from "@/lib/firebase/firebaseAuth";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";

/* ============================================================================
   VerifyEmailView — Real Firebase email verification flow.

   - Polls Firebase every 4 seconds for emailVerified status change
   - Checks on page focus regain
   - Manual "I've verified my email" button
   - Resend with 45-second cooldown
   - No simulated verification. Firebase Auth is the source of truth.
   ========================================================================== */

const POLL_INTERVAL_MS = 4000;
const RESEND_COOLDOWN_SECONDS = 45;

export function VerifyEmailView() {
  const router = useRouter();
  const { firebaseUser, user, refresh, logout } = useAuth();
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const email = firebaseUser?.email ?? user?.email ?? "";

  // Check verification status
  const checkVerification = useCallback(async () => {
    if (verified) return;
    setChecking(true);
    try {
      const { emailVerified, user: refreshedUser } = await firebaseRefreshUser();
      if (emailVerified && refreshedUser) {
        setVerified(true);
        // Call backend with server-side delivery state and concurrency protection
        try {
          const token = await refreshedUser.getIdToken(true);
          await fetch("/api/v1/auth/student/welcome", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
        } catch (e) {
          console.error("Failed to sync verification state via welcome endpoint:", e);
        }
        // Refresh auth context
        await refresh();
        // Stop polling
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch (e) {
      console.error("Verification check failed:", e);
    } finally {
      setChecking(false);
    }
  }, [verified, refresh]);

  // Poll for verification
  useEffect(() => {
    if (verified || !firebaseUser) return;

    pollRef.current = setInterval(checkVerification, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [verified, firebaseUser, checkVerification]);

  // Check on page focus
  useEffect(() => {
    if (verified) return;
    const onFocus = () => void checkVerification();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [verified, checkVerification]);

  // Redirect to dashboard after verification success
  useEffect(() => {
    if (!verified) return;
    const timer = setTimeout(() => {
      router.push("/internship/dashboard");
    }, 2500);
    return () => clearTimeout(timer);
  }, [verified, router]);

  // Redirect if user is not logged in
  useEffect(() => {
    if (!firebaseUser && !user) {
      // small delay to let auth initialize
      const t = setTimeout(() => {
        router.replace("/login");
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [firebaseUser, user, router]);

  // Already verified on mount? Redirect immediately
  useEffect(() => {
    if (firebaseUser?.emailVerified) {
      setVerified(true);
    }
  }, [firebaseUser?.emailVerified]);

  // Resend verification email
  async function resend() {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendMessage(null);
    const result = await firebaseSendVerificationEmail();
    setResendLoading(false);

    if (result.success) {
      setResendMessage("Verification email sent. Check your inbox and spam folder.");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      // Start cooldown countdown
      cooldownRef.current = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      setResendMessage(result.error ?? "Failed to send verification email.");
    }
  }

  // Cleanup cooldown timer
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  // --- VERIFIED STATE ---
  if (verified) {
    return (
      <AuthShell title="Email verified" subtitle="Your account is now active.">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 ring-2 ring-accent/30">
            <CheckCircle2 className="h-10 w-10 text-accent" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-accent">Email Verified</h2>
          <p className="mt-2 text-sm text-primary-foreground/90">
            Your KICK TO TECH account is now active.
          </p>
          {user?.name && (
            <p className="mt-1 text-sm text-muted">
              Welcome, {user.name}.
            </p>
          )}
          <p className="mt-4 text-xs text-muted">
            Redirecting to your dashboard…
          </p>
          <Loader2 className="mt-2 h-4 w-4 animate-spin text-accent" />
        </div>
      </AuthShell>
    );
  }

  // --- WAITING FOR VERIFICATION STATE ---
  return (
    <AuthShell title="Check your email" subtitle="We've sent a verification link to activate your account.">
      <div className="flex flex-col items-center py-4 text-center">
        {/* Mail icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/30">
          <Mail className="h-8 w-8 text-accent" />
        </div>

        {/* Email address */}
        {email && (
          <p className="mt-4 text-sm text-muted">
            We&apos;ve sent a verification link to:
          </p>
        )}
        {email && (
          <p className="mt-1 font-mono text-sm font-semibold text-primary-foreground">
            {email}
          </p>
        )}

        {/* Progress steps */}
        <div className="mt-6 w-full space-y-3 text-left">
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-accent" />
            <span className="text-primary-foreground/90">Email sent</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-accent" />
            <span className="text-primary-foreground/90">Verification required</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-muted/50" />
            <span className="text-muted">Account activation pending</span>
          </div>
        </div>

        {/* I've verified button */}
        <Button
          className="mt-6 w-full"
          size="lg"
          onClick={checkVerification}
          disabled={checking}
        >
          {checking ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</>
          ) : (
            "I've verified my email"
          )}
        </Button>

        {/* Resend section */}
        <div className="mt-5 w-full space-y-2">
          <p className="text-xs text-muted">
            Didn&apos;t receive the email? Check your spam/junk folder.
          </p>
          <button
            onClick={resend}
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
          {resendMessage && (
            <p className="text-xs text-accent/80">{resendMessage}</p>
          )}
        </div>

        {/* Logout / use another account */}
        <button
          onClick={handleLogout}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-primary-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Use another account
        </button>
      </div>
    </AuthShell>
  );
}
