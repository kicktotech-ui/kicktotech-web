import { Sparkles, Clock, BadgeCheck } from "lucide-react";
import { Container, Section, Badge } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { DomainCard } from "@/components/cards/DomainCard";
import { internshipProgram } from "@/data/mock/internship";
import { formatINR } from "@/lib/utils";

export function InternshipHighlight() {
  const { domains, priceRupees, durationLabel } = internshipProgram;
  return (
    <Section className="relative overflow-hidden">
      <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-electric/10 blur-[120px]" />
      <Container>
        <Reveal className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4">
            <Sparkles className="h-3.5 w-3.5" /> {internshipProgram.seatsLabel}
          </Badge>
          <h2 className="text-balance text-3xl font-bold sm:text-4xl md:text-5xl">
            Kickstart your <span className="text-gradient">tech career</span>
          </h2>
          <p className="mt-4 text-pretty text-muted">
            A project-first internship across two in-demand domains. Learn from industry
            standards, build real work, and earn a verifiable certificate.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5">
              <Clock className="h-4 w-4 text-accent" /> {durationLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5">
              <BadgeCheck className="h-4 w-4 text-accent" /> {formatINR(priceRupees)} program fee
            </span>
          </div>
        </Reveal>

        <StaggerGroup className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2">
          {domains.map((d) => (
            <StaggerItem key={d.id} className="h-full">
              <DomainCard domain={d} />
            </StaggerItem>
          ))}
        </StaggerGroup>

        <div className="mt-12 text-center">
          <Button href="/internship" size="lg">Explore internship domains</Button>
        </div>
      </Container>
    </Section>
  );
}
