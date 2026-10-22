"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Compact, polished popup prompting unauthenticated students to log in
 * to their existing KICK To TECH account before registering for PromptWars.
 *
 * Redirects to the official `/login` page with return destination preserved.
 */
export function HackathonLoginModal({ open, onClose }: Props) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Keyboard dismiss (Escape)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Trap focus and prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => closeBtnRef.current?.focus());
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const handleLogin = useCallback(() => {
    onClose();
    router.push(`/login?redirect=${encodeURIComponent("/hackathon/register")}`);
  }, [router, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-required-title"
          aria-describedby="login-required-description"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal Card */}
          <motion.div
            ref={modalRef}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-2xl"
          >
            {/* Ambient subtle glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/10 blur-2xl"
            />

            {/* Close button */}
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-xl p-2 text-muted transition-colors hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Lock Icon */}
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 ring-1 ring-accent/30 text-accent">
              <Lock className="h-6 w-6" />
            </div>

            {/* Title */}
            <h3 id="login-required-title" className="mt-5 text-xl font-bold sm:text-2xl text-foreground">
              Login Required
            </h3>

            {/* Message */}
            <p id="login-required-description" className="mt-2.5 text-sm leading-relaxed text-muted sm:text-base">
              To register for PromptWars × KICK To TECH, please log in to your KICK To TECH account first. Once you&apos;re signed in, you can continue with your hackathon registration.
            </p>

            {/* Actions */}
            <div className="mt-7 flex flex-col gap-3">
              <Button
                size="lg"
                className="w-full justify-center"
                onClick={handleLogin}
              >
                Login to Continue <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full justify-center"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
