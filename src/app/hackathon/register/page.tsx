import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Hack2SkillRegisterFlow } from "@/components/views/Hack2SkillRegisterFlow";
import { RequireAuth } from "@/components/dashboard/RequireAuth";

export const metadata: Metadata = {
  title: "PromptWars × KICK To TECH Registration",
  description: "Register for PromptWars × KICK To TECH — Build with AI, 28 October 2026 at JSPM University, Pune. ₹99 registration fee.",
};

export default function HackathonRegisterPage() {
  return (
    <>
      <PageHeader
        eyebrow="Register"
        title="PromptWars × KICK To TECH Registration"
        description="Complete your registration in a few quick steps and pay the ₹99 fee to secure your spot."
      />
      <Suspense fallback={null}>
        <RequireAuth>
          <Hack2SkillRegisterFlow />
        </RequireAuth>
      </Suspense>
    </>
  );
}
