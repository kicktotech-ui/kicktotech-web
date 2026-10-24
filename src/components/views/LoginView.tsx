"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldAlert, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/providers";
import { isAdminEmail } from "@/lib/authRules";
import { AuthShell } from "@/components/layout/AuthShell";
import { FormField, Input } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";

/* ============================================================================
   LoginView — Native Session & MongoDB student login.
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdminBlocked(false);

    if (isAdminEmail(email)) {
      setAdminBlocked(true);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        setLoading(false);
        const errMsg =
          typeof body?.error === "string"
            ? body.error
            : body?.error?.message || "Login failed. Please check your credentials.";
        setError(errMsg);
        return;
      }

      await refresh();
      setLoading(false);
      router.push(redirect);
    } catch (err) {
      setLoading(false);
      setError((err as Error)?.message || "Network error. Please try again.");
    }
  }

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
