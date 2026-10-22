"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  X, ArrowRight, Loader2, Eye, EyeOff, UserPlus, LogIn,
  Users, Check, AlertCircle,
} from "lucide-react";
import { authService } from "@/services/auth";
import { cn } from "@/lib/utils";

/* ---------- Types -------------------------------------------------------- */

type Tab = "signin" | "signup" | "guest";
type ModalState = "idle" | "loading" | "success" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* ---------- Component ---------------------------------------------------- */

export function HackathonAuthModal({ open, onClose }: Props) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<Tab>("guest");
  const [state, setState] = useState<ModalState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Sign in fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Sign up fields
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupCollege, setSignupCollege] = useState("");
  const [showSignupPw, setShowSignupPw] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setState("idle");
      setError(null);
      setTab("guest");
      // Trap focus after a tick
      requestAnimationFrame(() => closeBtnRef.current?.focus());
    }
  }, [open]);

  // Keyboard dismiss
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  /* ---------- Actions ---------------------------------------------------- */

  const proceedToRegister = useCallback(() => {
    router.push("/hackathon/register");
    onClose();
  }, [router, onClose]);

  const handleSignIn = useCallback(async () => {
    setError(null);
    if (!loginEmail.trim() || !EMAIL_RE.test(loginEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!loginPassword) {
      setError("Enter your password.");
      return;
    }
    setState("loading");
    const result = await authService.login(loginEmail, loginPassword);
    if (result.error) {
      setState("error");
      setError(result.error);
      return;
    }
    setState("success");
    setTimeout(proceedToRegister, reduce ? 0 : 800);
  }, [loginEmail, loginPassword, reduce, proceedToRegister]);

  const handleSignUp = useCallback(async () => {
    setError(null);
    if (!signupName.trim()) { setError("Enter your full name."); return; }
    if (!signupEmail.trim() || !EMAIL_RE.test(signupEmail)) { setError("Enter a valid email address."); return; }
    if (signupPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    setState("loading");
    const result = await authService.signup({
      name: signupName, email: signupEmail, password: signupPassword,
      phone: signupPhone || undefined, college: signupCollege || undefined, role: "student",
    });
    if (result.error) {
      setState("error");
      setError(result.error);
      return;
    }
    setState("success");
    setTimeout(proceedToRegister, reduce ? 0 : 800);
  }, [signupName, signupEmail, signupPassword, signupPhone, signupCollege, reduce, proceedToRegister]);

  /* ---------- Animation variants ----------------------------------------- */

  const backdrop = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: reduce ? 0 : 0.2 } },
    exit: { opacity: 0, transition: { duration: reduce ? 0 : 0.15 } },
  };

  const panel = {
    hidden: { opacity: 0, scale: reduce ? 1 : 0.95, y: reduce ? 0 : 20 },
    show: { opacity: 1, scale: 1, y: 0, transition: { duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, scale: reduce ? 1 : 0.97, y: reduce ? 0 : 10, transition: { duration: reduce ? 0 : 0.2 } },
  };

  /* ---------- Shared field styles ---------------------------------------- */

  const inputCls = "w-full rounded-xl border border-line bg-ink-800/60 px-4 py-2.5 text-sm text-primary-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40 transition-colors";

  /* ---------- Render ------------------------------------------------------ */

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="hackathon-auth-backdrop"
          variants={backdrop}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          aria-modal="true"
          role="dialog"
          aria-label="Hackathon registration options"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />

          {/* Panel */}
          <motion.div
            ref={modalRef}
            variants={panel}
            initial="hidden"
            animate="show"
            exit="exit"
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-ink-900 via-surface to-ink-900 shadow-2xl"
          >
            {/* Ambient glow */}
            <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/8 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-electric/6 blur-3xl" />

            {/* Close button */}
            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative p-6 sm:p-8">
              {/* Header */}
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold sm:text-2xl">Join the Hackathon</h2>
                <p className="mt-1.5 text-sm text-muted">Choose how you&apos;d like to register</p>
              </div>

              {/* Success State */}
              <AnimatePresence mode="wait">
                {state === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1, transition: { duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] } }}
                    className="flex flex-col items-center py-8 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, transition: { delay: reduce ? 0 : 0.1, duration: reduce ? 0 : 0.5, type: "spring", stiffness: 200, damping: 12 } }}
                      className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/15 ring-1 ring-green-500/30"
                    >
                      <Check className="h-8 w-8 text-green-400" />
                    </motion.div>
                    <p className="mt-4 text-lg font-semibold">{tab === "signin" ? "Signed in!" : "Account created!"}</p>
                    <p className="mt-1 text-sm text-muted">Redirecting to registration…</p>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {/* Tab selector */}
                    <div className="mb-6 grid grid-cols-3 gap-1 rounded-2xl border border-line bg-ink-800/40 p-1">
                      {([
                        { id: "guest" as const, icon: Users, label: "Guest" },
                        { id: "signin" as const, icon: LogIn, label: "Sign In" },
                        { id: "signup" as const, icon: UserPlus, label: "Sign Up" },
                      ]).map(({ id, icon: Icon, label }) => (
                        <button
                          key={id}
                          onClick={() => { setTab(id); setError(null); setState("idle"); }}
                          className={cn(
                            "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                            tab === id
                              ? "bg-accent text-accent-foreground shadow-sm"
                              : "text-muted hover:text-primary-foreground",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Error message */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-4 overflow-hidden"
                        >
                          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-xs text-red-400">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                            <span>{error}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Guest Tab */}
                    {tab === "guest" && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 text-center">
                          <p className="text-sm font-medium">No account required</p>
                          <p className="mt-1 text-xs text-muted">
                            Register for PromptWars × KICK To TECH directly. You can create an account later.
                          </p>
                        </div>
                        <button
                          onClick={proceedToRegister}
                          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(34,227,214,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
                        >
                          Continue as Guest
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    )}

                    {/* Sign In Tab */}
                    {tab === "signin" && (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="auth-login-email" className="mb-1.5 block text-xs font-medium text-muted">Email</label>
                          <input id="auth-login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@example.com" className={inputCls} autoComplete="email" />
                        </div>
                        <div>
                          <label htmlFor="auth-login-pw" className="mb-1.5 block text-xs font-medium text-muted">Password</label>
                          <div className="relative">
                            <input id="auth-login-pw" type={showLoginPw ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" className={cn(inputCls, "pr-10")} autoComplete="current-password" />
                            <button type="button" onClick={() => setShowLoginPw(!showLoginPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary-foreground" aria-label={showLoginPw ? "Hide password" : "Show password"}>
                              {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={handleSignIn}
                          disabled={state === "loading"}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(34,227,214,0.25)] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          {state === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : <>Sign In & Register <ArrowRight className="h-4 w-4" /></>}
                        </button>
                      </div>
                    )}

                    {/* Sign Up Tab */}
                    {tab === "signup" && (
                      <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
                        <div>
                          <label htmlFor="auth-signup-name" className="mb-1.5 block text-xs font-medium text-muted">Full name *</label>
                          <input id="auth-signup-name" value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="Your full name" className={inputCls} />
                        </div>
                        <div>
                          <label htmlFor="auth-signup-email" className="mb-1.5 block text-xs font-medium text-muted">Email *</label>
                          <input id="auth-signup-email" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="you@example.com" className={inputCls} autoComplete="email" />
                        </div>
                        <div>
                          <label htmlFor="auth-signup-pw" className="mb-1.5 block text-xs font-medium text-muted">Password * (min 8 characters)</label>
                          <div className="relative">
                            <input id="auth-signup-pw" type={showSignupPw ? "text" : "password"} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="••••••••" className={cn(inputCls, "pr-10")} autoComplete="new-password" />
                            <button type="button" onClick={() => setShowSignupPw(!showSignupPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary-foreground" aria-label={showSignupPw ? "Hide password" : "Show password"}>
                              {showSignupPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label htmlFor="auth-signup-phone" className="mb-1.5 block text-xs font-medium text-muted">Phone (optional)</label>
                            <input id="auth-signup-phone" type="tel" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} placeholder="+91 98765 43210" className={inputCls} />
                          </div>
                          <div>
                            <label htmlFor="auth-signup-college" className="mb-1.5 block text-xs font-medium text-muted">College (optional)</label>
                            <input id="auth-signup-college" value={signupCollege} onChange={(e) => setSignupCollege(e.target.value)} placeholder="Your college" className={inputCls} />
                          </div>
                        </div>
                        <button
                          onClick={handleSignUp}
                          disabled={state === "loading"}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(34,227,214,0.25)] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          {state === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</> : <>Create Account & Register <ArrowRight className="h-4 w-4" /></>}
                        </button>
                      </div>
                    )}

                    {/* Footer hint */}
                    <p className="mt-5 text-center text-[11px] text-muted">
                      {tab === "guest"
                        ? "You can also sign in or create an account to save your registration."
                        : tab === "signin"
                          ? "Don\u2019t have an account? Switch to Sign Up or continue as Guest."
                          : "Already have an account? Switch to Sign In or continue as Guest."}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
