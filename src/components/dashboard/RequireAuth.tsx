"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Lock, MailWarning } from "lucide-react";
import { useAuth } from "@/components/providers";
import type { Permission } from "@/services/permissions";
import { Container } from "@/components/ui";
import { Button } from "@/components/ui/Button";

/* ============================================================================
   RequireAuth — client-side route protection with email verification gate.

   Three gates checked in order:
     1. Not authenticated → redirect /login
     2. Authenticated but email NOT verified → redirect /verify-email
     3. Authenticated + verified but wrong permission → unauthorized page

   IMPORTANT: This is UX-only (hides UI + redirects). Real access control
   is enforced by Firestore rules / server-side guards.
   ========================================================================== */

export function RequireAuth({
  children,
  permission,
  requireVerified = true,
}: {
  children: ReactNode;
  permission?: Permission;
  /** Set to false to allow unverified users (e.g. the verify-email page itself). */
  requireVerified?: boolean;
}) {
  const { user, loading, emailVerified, permissions } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Gate 1: Not authenticated → login
  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  // Gate 2: Authenticated but email not verified → verify-email
  useEffect(() => {
    if (!loading && user && requireVerified && !emailVerified) {
      router.replace("/verify-email");
    }
  }, [loading, user, requireVerified, emailVerified, router]);

  // Loading state: branded spinner
  if (loading || !user) {
    return (
      <Container className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-3 text-sm text-muted">Checking your session…</p>
      </Container>
    );
  }

  // Email not verified
  if (requireVerified && !emailVerified) {
    return (
      <Container className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
          <MailWarning className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Email verification required</h1>
        <p className="mt-2 max-w-md text-muted">
          Please verify your email address before accessing this section.
        </p>
        <Button href="/verify-email" variant="outline" className="mt-6">Verify your email</Button>
      </Container>
    );
  }

  // Permission gate
  if (permission && !permissions.can(permission)) {
    return (
      <Container className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-accent">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Restricted area</h1>
        <p className="mt-2 max-w-md text-muted">
          Your account doesn&apos;t have access to this section. If you believe this is a mistake, contact an administrator.
        </p>
        <Button href="/internship/dashboard" variant="outline" className="mt-6">Go to your dashboard</Button>
      </Container>
    );
  }

  return <>{children}</>;
}
