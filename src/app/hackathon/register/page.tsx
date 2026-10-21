import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Hack2SkillRegisterFlow } from "@/components/views/Hack2SkillRegisterFlow";

export const metadata: Metadata = {
  title: "Hack2Skill Registration",
  description: "Register for the Hack2Skill hackathon by KICK TO TECH. ₹99 registration fee.",
};

export default function HackathonRegisterPage() {
  return (
    <>
      <PageHeader
        eyebrow="Register"
        title="Hack2Skill Registration"
        description="Complete your registration in a few quick steps and pay the ₹99 fee to secure your spot."
      />
      <Suspense fallback={null}>
        <Hack2SkillRegisterFlow />
      </Suspense>
    </>
  );
}
