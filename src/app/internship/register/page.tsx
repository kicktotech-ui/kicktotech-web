import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { RegisterFlow } from "@/components/views/RegisterFlow";

export const metadata: Metadata = {
  title: "Internship Registration",
  description: "Register for the Kick To Tech internship program in a few quick steps.",
};

export default function InternshipRegisterPage() {
  return (
    <>
      <PageHeader eyebrow="Register" title="Join the internship" description="A few quick steps to secure your spot across your chosen domain." />
      <Suspense fallback={null}>
        <RegisterFlow />
      </Suspense>
    </>
  );
}
