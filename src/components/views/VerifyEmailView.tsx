"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers";
import { AuthShell } from "@/components/layout/AuthShell";

export function VerifyEmailView() {
  const router = useRouter();
  const { user, refresh } = useAuth();

  useEffect(() => {
    refresh().then(() => {
      const timer = setTimeout(() => {
        router.push("/hackathon/register");
      }, 1500);
      return () => clearTimeout(timer);
    });
  }, [refresh, router]);

  return (
    <AuthShell title="Account active" subtitle="Your Kick To Tech student account is ready.">
      <div className="flex flex-col items-center py-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 ring-2 ring-accent/30">
          <CheckCircle2 className="h-10 w-10 text-accent" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-accent">Account Active</h2>
        <p className="mt-2 text-sm text-primary-foreground/90">
          {user?.name ? `Welcome, ${user.name}!` : "Welcome to Kick To Tech!"}
        </p>
        <p className="mt-4 text-xs text-muted">
          Redirecting to registration…
        </p>
        <Loader2 className="mt-3 h-4 w-4 animate-spin text-accent" />
      </div>
    </AuthShell>
  );
}
