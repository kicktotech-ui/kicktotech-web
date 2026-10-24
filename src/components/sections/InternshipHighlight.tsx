import { Sparkles, Clock, BadgeCheck, Trophy, ArrowRight } from "lucide-react";
import { Container, Section, Badge } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { DomainCard } from "@/components/cards/DomainCard";
import { internshipProgram } from "@/data/mock/internship";
import { formatINR } from "@/lib/utils";
import { isInternshipMaintenance } from "@/config/features";

export function InternshipHighlight() {
  const { domains, priceRupees, durationLabel } = internshipProgram;
  const maintenance = isInternshipMaintenance();

  return (
    <Section className="relative overflow-hidden">
      <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-electric/10 blur-[120px]" />
      <Container>
        <Reveal className="mx-auto max-w-3xl text-center">
          {maintenance ? (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>Admissions Paused • Priority Event Active</span>
            </div>
          ) : (
            <Badge className="mb-4">
              <Sparkles className="h-3.5 w-3.5" /> {internshipProgram.seatsLabel}
            </Badge>
          )}
          <h2 className="text-balance text-3xl font-bold sm:text-4xl md:text-5xl">
            Kickstart your <span className="text-gradient">tech career</span>
          </h2>
          <p className="mt-4 text-pretty text-muted">
            {maintenance
              ? "New batch admissions are paused while our priority event PromptWars × KICK To TECH Hackathon is active. Check out the hackathon below."
              : "A project-first internship across two in-demand domains. Learn from industry standards, build real work, and earn a verifiable certificate."}
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

        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {maintenance ? (
            <>
              <Button href="/hackathon" size="lg" className="w-full sm:w-auto">
                <Trophy className="h-4 w-4 text-yellow-300" />
                Explore PromptWars Hackathon <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href="/internship" variant="outline" size="lg" className="w-full sm:w-auto">
                Internship Status & Updates
              </Button>
            </>
          ) : (
            <Button href="/internship" size="lg">Explore internship domains</Button>
          )}
        </div>
      </Container>
    </Section>
  );
}
