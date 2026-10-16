import type { Metadata } from "next";
import { Clock, BadgeCheck, Layers, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { Container, Section, SectionHeading, Badge } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Accordion";
import { Reveal } from "@/components/motion";
import { InternshipDomains } from "@/components/views/InternshipDomains";
import { LearningJourney } from "@/components/sections/LearningJourney";
import { CredentialSection } from "@/components/sections/CredentialSection";
import { internshipProgram } from "@/data/mock/internship";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Internship",
  description:
    "A project-first, 5-week internship across Python and Java — with a verifiable certificate.",
};

const heroStats = [
  { Icon: Clock, value: "5 Weeks", label: "Duration" },
  { Icon: Layers, value: "2 Tracks", label: "Mentored domains" },
  { Icon: BadgeCheck, value: formatINR(internshipProgram.priceRupees), label: "Program fee" },
  { Icon: ShieldCheck, value: "Verifiable", label: "Certificate" },
];

const faqs = [
  { q: "Who can apply?", a: "Students and early-career learners keen to build real projects. No prior professional experience required." },
  { q: "How long is the program?", a: `${internshipProgram.durationLabel}. It's designed to be intensive but manageable alongside studies.` },
  { q: "What does it cost?", a: `The program fee is ${formatINR(internshipProgram.priceRupees)}. Payment is processed securely and confirmed before enrollment is finalized.` },
  { q: "Is the certificate verifiable?", a: "Yes. Every certificate can be checked publicly on our certificate verification page." },
];

export default function InternshipPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden pb-8 pt-16 sm:pt-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-accent/10 blur-[130px]" />
        <div className="pointer-events-none absolute right-10 top-40 h-64 w-64 rounded-full bg-electric/10 blur-[120px]" />
        <Container className="relative">
          <Reveal className="max-w-3xl">
            <Badge className="mb-5"><Sparkles className="h-3.5 w-3.5" /> {internshipProgram.seatsLabel}</Badge>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Kickstart your <span className="text-gradient">tech career.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted">
              A project-first internship across two in-demand domains — learn from industry
              standards, build real work, and earn a certificate employers can verify.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/internship/register" size="lg">Register now <ArrowRight className="h-4 w-4" /></Button>
              <Button href="/verify_cert" variant="outline" size="lg">Verify a certificate</Button>
            </div>
          </Reveal>

          {/* stat tiles */}
          <div className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {heroStats.map(({ Icon, value, label }) => (
              <div key={label} className="group rounded-2xl border border-line bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40">
                <Icon className="h-6 w-6 text-accent transition-transform duration-300 group-hover:scale-110" />
                <div className="mt-3 text-xl font-extrabold sm:text-2xl">{value}</div>
                <div className="mt-0.5 text-xs text-muted">{label}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* DOMAINS — interactive selector */}
      <Section className="pt-10">
        <Container>
          <SectionHeading eyebrow="Domains" title="Choose your track" description="Two focused domains, each mentored and project-driven. Explore what you'll learn." />
          <div className="mt-14">
            <InternshipDomains domains={internshipProgram.domains} />
          </div>
        </Container>
      </Section>

      {/* JOURNEY */}
      <LearningJourney />

      {/* CERTIFICATE / CREDENTIAL */}
      <CredentialSection />

      {/* FAQ */}
      <Section className="border-t border-line pt-0">
        <Container className="max-w-3xl pt-20">
          <SectionHeading eyebrow="FAQ" title="Questions, answered" />
          <div className="mt-10">
            <Accordion items={faqs} />
          </div>
          <div className="mt-12 overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 to-transparent p-8 text-center sm:p-12">
            <h3 className="text-2xl font-bold sm:text-3xl">Ready to build real skills?</h3>
            <p className="mx-auto mt-3 max-w-md text-muted">Limited seats. Pick your track and start your project-first journey.</p>
            <Button href="/internship/register" size="lg" className="mt-7">Register for the internship <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
