"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle, KeyRound } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { FormField, Input } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/30 text-red-400">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-primary-foreground">Missing Reset Link</h2>
        <p className="mt-2 text-sm text-muted">
          This password reset link is invalid or incomplete. Please request a new password reset email.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-primary hover:bg-accent/90"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setState("loading");
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error?.message || "Failed to reset password. The link may have expired.");
        setState("idle");
        return;
      }

      setState("success");
    } catch (err) {
      console.error("[reset-password] Error:", err);
      setError("Network error. Please check your connection and try again.");
      setState("idle");
    }
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-400">
          <CheckCircle className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-accent">Password Updated!</h2>
        <p className="mt-2 text-sm text-muted">
          Your password has been successfully reset. You can now sign in with your new credentials.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-primary hover:bg-accent/90"
        >
          Proceed to Login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <FormField label="New Password" htmlFor="rp-password">
        <Input
          id="rp-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          autoComplete="new-password"
        />
      </FormField>

      <FormField label="Confirm New Password" htmlFor="rp-confirm">
        <Input
          id="rp-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your new password"
          required
          autoComplete="new-password"
        />
      </FormField>

      <Button className="w-full" size="lg" disabled={state === "loading"}>
        {state === "loading" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating password...
          </>
        ) : (
          "Save New Password"
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Create New Password"
      subtitle="Enter a strong new password for your Kick To Tech account."
      footer={
        <Link href="/login" className="font-semibold text-accent">
          Back to login
        </Link>
      }
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </AuthShell>
  );
}
