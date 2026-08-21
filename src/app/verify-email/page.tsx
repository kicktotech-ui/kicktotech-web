import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailView } from "@/components/views/VerifyEmailView";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email to activate your Kick To Tech account.",
};

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailView />
    </Suspense>
  );
}
