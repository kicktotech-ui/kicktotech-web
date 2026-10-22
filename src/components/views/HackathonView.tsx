"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  Sparkles, Trophy, ArrowRight, Users, CalendarDays, MapPin, Target,
  Lock, Rocket, ChevronRight, Zap,
  type LucideIcon,
} from "lucide-react";
import { Container, Section, Badge, SectionHeading } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers";
import { hackathons, type HackathonEntry } from "@/data/mock/hackathons";
import { easePremium } from "@/lib/motion";
import { cn, formatINR } from "@/lib/utils";
import { HackathonLoginModal } from "./HackathonLoginModal";

/** Where "Join the Community" points — the real, existing community page. */
const COMMUNITY_HREF = "/join";

const HACKATHON_FEE = 99;

export function HackathonView() {
  const router = useRouter();
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const handleRegisterClick = useCallback(() => {
    if (user) {
      router.push("/hackathon/register");
    } else {
      setLoginModalOpen(true);
    }
  }, [user, router]);

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.1, delayChildren: 0.04 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easePremium } },
  };

  // Find the hack2skill entry (the one with registration open)
  const hack2skill = hackathons.find((h) => h.id === "hack2skill");
  const otherHackathons = hackathons.filter((h) => h.id !== "hack2skill");

  const scrollToHackathons = useCallback(() => {
    const el = document.getElementById("hack2skill-featured");
    if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [reduce]);

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden pt-24 pb-8 sm:pt-28 sm:pb-10">
        {/* animated grid + glow background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(94,240,230,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(94,240,230,0.06)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,#000_55%,transparent_100%)]" />
          <motion.div
            className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-accent/15 blur-[120px]"
            animate={reduce ? undefined : { x: [0, 40, 0], y: [0, 24, 0] }}
            transition={reduce ? undefined : { duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-electric/10 blur-[130px]"
            animate={reduce ? undefined : { x: [0, -36, 0], y: [0, -28, 0] }}
            transition={reduce ? undefined : { duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <Container className="relative">
          <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl">
            <motion.p
              variants={item}
              className="text-xs font-bold uppercase tracking-[0.3em] text-accent"
            >
              Kick To Tech Community
            </motion.p>

            <motion.div variants={item} className="mt-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-xs font-semibold text-accent">
                <span className="relative flex h-2 w-2">
                  {!reduce && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
                  )}
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                Registration Open — PromptWars × KICK To TECH
              </span>
            </motion.div>

            <motion.h1
              variants={item}
              className="mt-4 sm:mt-5 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl"
            >
              Where <span className="text-gradient">Innovation</span> Meets Collaboration
            </motion.h1>

            <motion.p variants={item} className="mt-4 max-w-2xl text-pretty text-base sm:text-lg leading-relaxed text-muted">
              A new generation of builders, creators, and problem-solvers is coming together. Register for 
              PromptWars × KICK To TECH and turn ambitious ideas into real projects.
            </motion.p>

            <motion.div variants={item} className="mt-6 sm:mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={handleRegisterClick}>
                Register Now — {formatINR(HACKATHON_FEE)} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={scrollToHackathons}>
                Learn More
              </Button>
            </motion.div>
          </motion.div>
        </Container>
      </section>

      {/* ================= HACK2SKILL FEATURED SECTION ================= */}
      {hack2skill && (
        <Section id="hack2skill-featured" className="scroll-mt-20 pt-2 pb-16 sm:pt-4 sm:pb-20">
          <Container>
            <SectionHeading
              eyebrow="Featured"
              title="PromptWars × KICK To TECH"
              description="Where ideas meet AI. Imagine, innovate, and impact — build with AI-powered tools, compete for a ₹30,000 prize pool, and win internship opportunities."
            />

            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              className="mt-6 sm:mt-8"
            >
              {/* Poster + Info layout */}
              <motion.div variants={item} className="overflow-hidden rounded-3xl border border-accent/30 bg-surface">
                {/* Poster image */}
                {hack2skill.poster && (
                  <div className="relative w-full overflow-hidden">
                    <Image
                      src={hack2skill.poster}
                      alt="PromptWars × KICK To TECH — Build with AI, 28 October 2026, JSPM University, Pune"
                      width={1200}
                      height={630}
                      className="h-auto w-full object-contain"
                      priority
                    />
                  </div>
                )}

                {/* Event info below the poster */}
                <div className="p-6 sm:p-8 lg:p-10">
                  <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                    {/* Left: Description + meta */}
                    <div className="max-w-xl">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                          <Zap className="h-3.5 w-3.5" /> Registration Open
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-muted">
                          {formatINR(HACKATHON_FEE)} Participant Kit & Refreshment Fee
                        </span>
                      </div>
                      <h3 className="mt-4 text-2xl font-bold sm:text-3xl">PromptWars × KICK To TECH</h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                        {hack2skill.description}
                      </p>

                      {/* Event meta — showing only confirmed details */}
                      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                        {[
                          { Icon: CalendarDays, label: "Date", value: hack2skill.dateLabel ?? "To Be Announced" },
                          { Icon: MapPin, label: "Venue / Mode", value: hack2skill.modeLabel ?? "To Be Announced" },
                          { Icon: Target, label: "Theme", value: hack2skill.themeLabel ?? "To Be Announced" },
                          { Icon: Users, label: "Eligibility", value: hack2skill.eligibilityLabel ?? "To Be Announced" },
                        ].map(({ Icon, label, value }) => (
                          <div key={label} className="flex items-center gap-2.5 rounded-xl border border-line/50 bg-ink-800/40 px-4 py-3 text-sm">
                            <Icon className="h-4 w-4 flex-shrink-0 text-accent/80" aria-hidden />
                            <dt className="text-muted">{label}:</dt>
                            <dd className="font-medium text-primary-foreground/85">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    {/* Right: CTA block */}
                    <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-ink-800/60 p-6 text-center lg:min-w-[260px]">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 ring-1 ring-accent/30">
                        <Trophy className="h-7 w-7 text-accent" />
                      </div>
                      <div>
                        <p className="text-3xl font-extrabold text-accent">{formatINR(HACKATHON_FEE)}</p>
                        <p className="mt-1 text-xs text-muted">Participant Kit & Refreshment Fee</p>
                      </div>
                      <Button size="lg" className="w-full" onClick={handleRegisterClick}>
                        Register Now <ArrowRight className="h-4 w-4" />
                      </Button>
                      <p className="text-[11px] text-muted">Limited slots • Don&apos;t miss out!</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </Container>
        </Section>
      )}

      {/* ================= OTHER HACKATHON CARDS ================= */}
      {otherHackathons.length > 0 && (
        <Section id="hackathons" className="scroll-mt-24">
          <Container>
            <SectionHeading
              eyebrow="Coming Soon"
              title="More Hackathons"
              description="More editions are on the way. Details are being finalized — join the community to be the first to know."
            />

            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2"
            >
              {otherHackathons.map((h) => (
                <motion.div key={h.id} variants={item} className="h-full">
                  <HackathonCard entry={h} communityHref={COMMUNITY_HREF} reduce={!!reduce} />
                </motion.div>
              ))}
            </motion.div>
          </Container>
        </Section>
      )}

      {/* ================= CLOSING CTA ================= */}
      <Section className="pt-0">
        <Container>
          <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 to-transparent p-8 text-center sm:p-14">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/30">
                <Rocket className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-2xl font-bold sm:text-3xl">Ready to build something amazing?</h2>
              <p className="mx-auto mt-3 max-w-md text-pretty text-muted">
                Register for PromptWars × KICK To TECH now or join the community to stay updated on upcoming hackathons and events.
              </p>
              <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button size="lg" onClick={handleRegisterClick}>
                  Register for PromptWars <ArrowRight className="h-4 w-4" />
                </Button>
                <Button href={COMMUNITY_HREF} variant="outline" size="lg">
                  Join the Community <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>
      {/* Login Required Modal */}
      <HackathonLoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </>
  );
}

/* ----------------------------- Card ----------------------------- */

const META: { Icon: LucideIcon; label: keyof HackathonMeta }[] = [
  { Icon: CalendarDays, label: "date" },
  { Icon: MapPin, label: "mode" },
  { Icon: Target, label: "theme" },
  { Icon: Users, label: "eligibility" },
];

interface HackathonMeta {
  date: string;
  mode: string;
  theme: string;
  eligibility: string;
}

function HackathonCard({
  entry,
  communityHref,
  reduce,
}: {
  entry: HackathonEntry;
  communityHref: string;
  reduce: boolean;
}) {
  const meta: HackathonMeta = {
    date: entry.dateLabel ?? "To Be Announced",
    mode: entry.modeLabel ?? "To Be Announced",
    theme: entry.themeLabel ?? "To Be Announced",
    eligibility: entry.eligibilityLabel ?? "To Be Announced",
  };
  const metaLabel: Record<keyof HackathonMeta, string> = {
    date: "Date",
    mode: "Venue / Mode",
    theme: "Theme",
    eligibility: "Eligibility",
  };

  return (
    <motion.article
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ duration: 0.3, ease: easePremium }}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-colors duration-300 hover:border-accent/50"
    >
      {/* gradient visual header */}
      <div
        className="relative h-28 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${entry.accent}2e, transparent 70%)` }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-60 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:26px_26px]"
        />
        <span
          className="absolute left-6 top-6 flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-white/10"
          style={{ backgroundColor: `${entry.accent}26`, color: entry.accent }}
        >
          <Trophy className="h-6 w-6" />
        </span>
        <span className="absolute right-5 top-6">
          <Badge tone="neutral">
            <Sparkles className="h-3.5 w-3.5" /> {entry.status}
          </Badge>
        </span>
      </div>

      <div className="flex flex-1 flex-col p-7">
        <h3 className="text-lg font-bold">{entry.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{entry.description}</p>

        {/* consistent metadata block */}
        <dl className="mt-6 space-y-2.5">
          {META.map(({ Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-sm">
              <Icon className="h-4 w-4 flex-shrink-0 text-accent/80" aria-hidden />
              <dt className="text-muted">{metaLabel[label]}:</dt>
              <dd className="font-medium text-primary-foreground/85">{meta[label]}</dd>
            </div>
          ))}
        </dl>

        {/* registration + action pinned to the bottom */}
        <div className="mt-auto pt-6">
          <div className="flex items-center gap-2 border-t border-line pt-5 text-xs text-muted">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Registration opens soon
          </div>
          {entry.registrationOpen && entry.registerHref ? (
            <Button href={entry.registerHref} size="md" className="mt-4 w-full">
              Register <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="mt-4 flex flex-col gap-2.5">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-2.5 text-sm font-semibold text-muted"
              >
                Registration · Coming Soon
              </button>
              <Button href={communityHref} variant="outline" size="md" className="w-full">
                Join the Community <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}
