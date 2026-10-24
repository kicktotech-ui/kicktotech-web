"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, GraduationCap, Building2, Eye, EyeOff } from "lucide-react";
import { isAdminEmail } from "@/lib/authRules";
import { useAuth } from "@/components/providers";
import { AuthShell } from "@/components/layout/AuthShell";
import { FormField, Input } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Role = "student" | "company";

export function SignupView() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>("student");
  const [account, setAccount] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [extra, setExtra] = useState({ phone: "", college: "", company: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Validation ---
  const nameValid = account.name.trim().length >= 2;
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(account.email);
  const passwordValid = account.password.length >= 6;
  const accountValid = nameValid && emailValid && passwordValid;

  const phoneValid = /^\+?\d[\d\s-]{7,}$/.test(extra.phone.trim());
  const collegeValid = role !== "student" || (extra.college.trim().length >= 3 && /[a-zA-Z]/.test(extra.college));
  const companyValid = role !== "company" || (extra.company.trim().length >= 2 && /[a-zA-Z]/.test(extra.company));
  const detailsValid = phoneValid && collegeValid && companyValid;

  function goToRole() {
    if (!accountValid) return;
    if (isAdminEmail(account.email)) {
      setError("Admin accounts can't be created through the student portal. Please use the Admin Login.");
      return;
    }
    setError(null);
    setStep(1);
  }

  function goToDetails() {
    setError(null);
    setStep(2);
  }

  async function submit() {
    if (!detailsValid) {
      setError("Please fill in all required fields correctly.");
      return;
    }
    if (isAdminEmail(account.email)) {
      setError("Admin accounts can't be created through the student portal.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/student/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: account.name.trim(),
          email: account.email.trim().toLowerCase(),
          password: account.password,
          role,
          phone: extra.phone.trim() || undefined,
          college: role === "student" ? extra.college.trim() : undefined,
          company: role === "company" ? extra.company.trim() : undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        setLoading(false);
        const errMsg =
          typeof body?.error === "string"
            ? body.error
            : body?.error?.message || "Registration failed. Please check your information.";
        setError(errMsg);
        return;
      }

      await refresh();
      setLoading(false);
      router.push("/hackathon/register");
    } catch (err) {
      setLoading(false);
      setError((err as Error)?.message || "Network error. Please try again.");
    }
  }

  return (
    <AuthShell
      eyebrow="Student Portal"
      title="Create your account"
      subtitle="Join Pune's student tech community."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-accent">Sign in</Link></>}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                s <= step ? "bg-accent" : "bg-line",
              )}
            />
          ))}
        </div>

        {step === 0 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <FormField label="Full Name" htmlFor="signup-name">
              <Input
                id="signup-name"
                value={account.name}
                onChange={(e) => setAccount({ ...account, name: e.target.value })}
                placeholder="Mayur Patil"
                required
              />
            </FormField>
            <FormField label="Email" htmlFor="signup-email">
              <Input
                id="signup-email"
                type="email"
                value={account.email}
                onChange={(e) => setAccount({ ...account, email: e.target.value })}
                placeholder="you@example.com"
                required
              />
            </FormField>
            <FormField label="Password" htmlFor="signup-password">
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={account.password}
                  onChange={(e) => setAccount({ ...account, password: e.target.value })}
                  placeholder="At least 6 characters"
                  required
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-accent"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <Button className="w-full" size="lg" disabled={!accountValid} onClick={goToRole}>
              Next: Select Role
            </Button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <p className="text-sm text-muted">Select how you want to engage with Kick To Tech:</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { r: "student" as Role, label: "Student", icon: GraduationCap, desc: "Internships, workshops & hackathons" },
                { r: "company" as Role, label: "Company", icon: Building2, desc: "Hire talent & collaborate" },
              ].map(({ r, label, icon: Icon, desc }) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    role === r
                      ? "border-accent bg-accent/10 shadow-lg shadow-accent/5"
                      : "border-line bg-surface/50 hover:border-line-strong",
                  )}
                >
                  <Icon className={cn("h-6 w-6 mb-2", role === r ? "text-accent" : "text-muted")} />
                  <p className="font-semibold text-primary-foreground">{label}</p>
                  <p className="mt-1 text-xs text-muted leading-relaxed">{desc}</p>
                </button>
              ))}
            </div>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-3">
              <Button variant="outline" className="w-1/3" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button className="flex-1" size="lg" onClick={goToDetails}>
                Next: Your Details
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <FormField label="Phone Number" htmlFor="signup-phone">
              <Input
                id="signup-phone"
                type="tel"
                value={extra.phone}
                onChange={(e) => setExtra({ ...extra, phone: e.target.value })}
                placeholder="+91 98765 43210"
                required
              />
            </FormField>
            {role === "student" && (
              <FormField label="College / University" htmlFor="signup-college">
                <Input
                  id="signup-college"
                  value={extra.college}
                  onChange={(e) => setExtra({ ...extra, college: e.target.value })}
                  placeholder="e.g. JSPM University, Pune"
                  required
                />
              </FormField>
            )}
            {role === "company" && (
              <FormField label="Company Name" htmlFor="signup-company">
                <Input
                  id="signup-company"
                  value={extra.company}
                  onChange={(e) => setExtra({ ...extra, company: e.target.value })}
                  placeholder="e.g. Acme Tech Solutions"
                  required
                />
              </FormField>
            )}
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-3">
              <Button variant="outline" className="w-1/3" onClick={() => setStep(1)} disabled={loading}>
                Back
              </Button>
              <Button className="flex-1" size="lg" disabled={!detailsValid || loading} onClick={submit}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</> : "Create Account"}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </AuthShell>
  );
}
