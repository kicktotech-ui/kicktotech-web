"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, Mail, ArrowRight, ShieldCheck, Award, Users, CreditCard } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminTheme } from "@/components/admin/theme";
import { Spinner, Input } from "@/components/admin/ui";
import { authService } from "@/services/admin";
import { cn } from "@/lib/utils";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdminAuth();
  const { resolved } = useAdminTheme();
  const [email, setEmail] = useState(authService.devEmail);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/admin");
    } catch {
      setError("Invalid credentials. Check your admin email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("ktt-admin grid min-h-screen bg-adm-bg lg:grid-cols-2", resolved === "dark" && "dark")}>
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-neutral-950 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#f5c400]/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <Image src="/brand/logo.png" alt="Kick To Tech" width={40} height={40} priority className="h-10 w-10 rounded-lg object-contain ring-1 ring-white/10" />
          <span className="text-sm font-black tracking-tight">KICK TO TECH</span>
        </div>
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f5c400]">Admin Console</p>
          <h1 className="mt-4 text-4xl font-black leading-[1.05]">Run the entire internship operation from one console.</h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-adm-muted">
            Applications, payments, activation, certification, and communication — in a single operational platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-adm-muted">
            <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-[#f5c400]" /> Applications</span>
            <span className="inline-flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#f5c400]" /> Payments</span>
            <span className="inline-flex items-center gap-2"><Award className="h-4 w-4 text-[#f5c400]" /> Certificates</span>
          </div>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-adm-muted">
          <ShieldCheck className="h-4 w-4 text-[#16a34a]" /> Secure admin access
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image src="/brand/logo.png" alt="Kick To Tech" width={40} height={40} priority className="h-10 w-10 rounded-lg object-contain" />
            <span className="text-sm font-black tracking-tight text-adm-fg">KICK TO TECH</span>
          </div>
          <h2 className="text-2xl font-bold text-adm-fg">Sign in to Admin</h2>
          <p className="mt-1 text-sm text-adm-muted">Use your Kick To Tech admin credentials.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-adm-fg">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-adm-muted" />
                <Input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                  className="h-11 pl-10 bg-adm-surface focus:ring-2 focus:ring-[#0057ff]/20"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-adm-fg">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-adm-muted" />
                <Input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••"
                  className="h-11 pl-10 bg-adm-surface focus:ring-2 focus:ring-[#0057ff]/20"
                />
              </div>
            </label>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-adm-muted">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-adm-border accent-[#0057ff]" />
                Remember me
              </label>
            </div>

            {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 ring-1 ring-red-500/25 dark:text-red-400">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#f5c400] text-sm font-bold text-black transition-colors hover:bg-[#e6b800] disabled:opacity-60"
            >
              {loading ? <Spinner /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
