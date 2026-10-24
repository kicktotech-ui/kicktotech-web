"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { FormField, Input } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setState("loading");
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message || "Failed to send reset instructions. Please try again.");
        setState("idle");
        return;
      }
      setState("sent");
    } catch (err) {
      console.error("[forgot-password] Network error:", err);
      setError("Network error. Please check your connection and try again.");
      setState("idle");
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll send reset instructions to your email."
      footer={<><Link href="/login" className="font-semibold text-accent">Back to login</Link></>}
    >
      {state === "sent" ? (
        <div className="flex flex-col items-center py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/30">
            <MailCheck className="h-7 w-7 text-accent" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-accent">Instructions Sent</h2>
          <p className="mt-2 text-sm text-muted">
            If an account exists for <span className="font-medium text-primary-foreground">{email}</span>, password reset instructions have been dispatched.
          </p>
          <p className="mt-3 text-xs text-muted">
            Please check your inbox and spam/junk folder.
          </p>
          <Link
            href="/login"
            className="mt-6 text-sm font-semibold text-accent hover:underline"
          >
            ← Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <FormField label="Email" htmlFor="fp-email" error={error ?? undefined}>
            <Input
              id="fp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </FormField>
          <Button className="w-full" size="lg" disabled={state === "loading"}>
            {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
