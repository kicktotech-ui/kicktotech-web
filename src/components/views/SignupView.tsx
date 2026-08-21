"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, GraduationCap, Building2, Eye, EyeOff } from "lucide-react";
import { isAdminEmail } from "@/lib/authRules";
import { firebaseSignUp, firebaseSendVerificationEmail } from "@/lib/firebase/firebaseAuth";
import { createStudentProfile } from "@/lib/firebase/firestore";
import { AuthShell } from "@/components/layout/AuthShell";
import { FormField, Input } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/* ============================================================================
   SignupView — REAL Firebase Authentication registration.

   Flow:
     Step 1: Name + Email + Password
     Step 2: Role (Student / Company)
     Step 3: Phone + College/Company
     → createUserWithEmailAndPassword()
     → createStudentProfile() in Firestore
     → sendEmailVerification()
     → redirect to /verify-email
   ========================================================================== */

type Role = "student" | "company";

export function SignupView() {
  const router = useRouter();
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

    // 1. Create Firebase Authentication account
    const authResult = await firebaseSignUp(account.email, account.password);
    if (!authResult.success || !authResult.user) {
      setLoading(false);
      setError(authResult.error ?? "Could not create account.");
      return;
    }

    const uid = authResult.user.uid;

    // 2. Create Firestore student profile (NO password stored)
    const profileCreated = await createStudentProfile(uid, {
      fullName: account.name.trim(),
      email: account.email.trim().toLowerCase(),
      phone: extra.phone.trim(),
      college: role === "student" ? extra.college.trim() : undefined,
      company: role === "company" ? extra.company.trim() : undefined,
      role,
    });

    if (!profileCreated) {
      // Auth account was created but profile failed — still proceed
      console.error("Student profile creation failed, but auth account exists");
    }

    // 3. Send Firebase email verification
    const verifyResult = await firebaseSendVerificationEmail();
    if (!verifyResult.success) {
      console.error("Failed to send verification email:", verifyResult.error);
    }

    setLoading(false);

    // 4. Redirect to verification screen (NOT dashboard)
    router.push("/verify-email");
  }

  return (
    <AuthShell
      eyebrow="Student Portal"
      title="Create your account"
      subtitle="Join Pune's student tech community."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-accent">Sign in</Link></>}
    >
      {/* progress */}
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted">
        <span>Step {step + 1} of 3</span>
        <span>{["Account", "Role", "Details"][step]}</span>
      </div>
      <div className="mb-7 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-accent" : "bg-line")} />
        ))}
      </div>

      <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
        {/* STEP 1: Account */}
        {step === 0 && (
          <div className="space-y-4">
            <FormField label="Full name" htmlFor="s-name" error={account.name.length > 0 && !nameValid ? "Enter at least 2 characters." : undefined}>
              <Input id="s-name" value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} placeholder="Your name" autoComplete="name" />
            </FormField>
            <FormField label="Email" htmlFor="s-email" error={account.email.length > 0 && !emailValid ? "Enter a valid email address." : undefined}>
              <Input id="s-email" type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} placeholder="you@example.com" autoComplete="email" />
            </FormField>
            <FormField label="Password" htmlFor="s-pass" hint="At least 6 characters.">
              <div className="relative">
                <Input
                  id="s-pass"
                  type={showPassword ? "text" : "password"}
                  value={account.password}
                  onChange={(e) => setAccount({ ...account, password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="new-password"
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
            {error && (
              <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-300">
                {error} <Link href="/admin/login" className="font-semibold text-accent hover:underline">Admin Login →</Link>
              </div>
            )}
            <Button className="mt-2 w-full" size="lg" onClick={goToRole} disabled={!accountValid}>Continue</Button>
          </div>
        )}

        {/* STEP 2: Role */}
        {step === 1 && (
          <div className="space-y-5">
            <p className="text-sm font-medium text-primary-foreground/90">I am a</p>
            <div className="grid grid-cols-2 gap-3">
              {([["student", GraduationCap, "Student"], ["company", Building2, "Company"]] as const).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  aria-pressed={role === value}
                  className={cn("flex flex-col items-center gap-2.5 rounded-2xl border p-6 transition-all duration-300", role === value ? "border-accent bg-accent/10 shadow-glow" : "border-line hover:-translate-y-0.5 hover:border-accent/40")}
                >
                  <Icon className={cn("h-7 w-7 transition-colors", role === value ? "text-accent" : "text-muted")} />
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              ))}
            </div>
            <Button className="w-full" size="lg" onClick={goToDetails}>Continue</Button>
            <button type="button" onClick={() => setStep(0)} className="mx-auto block text-sm font-medium text-muted transition-colors hover:text-accent">Back</button>
          </div>
        )}

        {/* STEP 3: Details */}
        {step === 2 && (
          <div className="space-y-4">
            <FormField label="Phone" htmlFor="s-phone" error={extra.phone.length > 0 && !phoneValid ? "Enter a valid phone number." : undefined}>
              <Input id="s-phone" value={extra.phone} onChange={(e) => setExtra({ ...extra, phone: e.target.value })} placeholder="+91 98765 43210" autoComplete="tel" />
            </FormField>
            {role === "student" ? (
              <FormField label="College" htmlFor="s-college" error={extra.college.length > 0 && !collegeValid ? "Enter a valid college name (at least 3 characters)." : undefined}>
                <Input id="s-college" value={extra.college} onChange={(e) => setExtra({ ...extra, college: e.target.value })} placeholder="Your college or university" />
              </FormField>
            ) : (
              <FormField label="Company" htmlFor="s-company" error={extra.company.length > 0 && !companyValid ? "Enter a valid company name." : undefined}>
                <Input id="s-company" value={extra.company} onChange={(e) => setExtra({ ...extra, company: e.target.value })} placeholder="Your company" />
              </FormField>
            )}
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <Button className="mt-2 w-full" size="lg" onClick={submit} disabled={loading || !detailsValid}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</> : "Create account"}
            </Button>
            <button type="button" onClick={() => setStep(1)} className="mx-auto block text-sm font-medium text-muted transition-colors hover:text-accent">Back</button>
          </div>
        )}
      </motion.div>
    </AuthShell>
  );
}
