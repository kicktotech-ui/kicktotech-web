"use client";

import { useCallback } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  Sparkles, Trophy, ArrowRight, Users, CalendarDays, MapPin, Target,
  Lock, Rocket, ChevronRight, type LucideIcon,
} from "lucide-react";
import { Container, Section, Badge, SectionHeading } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { hackathons, type HackathonEntry } from "@/data/mock/hackathons";
import { easePremium } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Where "Join the Community" points — the real, existing community page. */
const COMMUNITY_HREF = "/join";

export function HackathonView() {
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.1, delayChildren: 0.04 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easePremium } },
  };

  const scrollToHackathons = useCallback(() => {
    const el = document.getElementById("hackathons");
    if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [reduce]);

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="relative flex min-h-[88vh] items-center overflow-hidden pt-24 sm:pt-28">
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

            <motion.div variants={item} className="mt-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-xs font-semibold text-accent">
                <span className="relative flex h-2 w-2">
                  {!reduce && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
                  )}
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                Upcoming Hackathons
              </span>
            </motion.div>

            <motion.h1
              variants={item}
              className="mt-6 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl"
            >
              Where <span className="text-gradient">Innovation</span> Meets Collaboration
            </motion.h1>

            <motion.p variants={item} className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted">
              A new generation of builders, creators, and problem-solvers is coming together. Get ready
              to turn ambitious ideas into meaningful projects.
            </motion.p>

            <motion.div variants={item} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={scrollToHackathons}>
                Explore Hackathons <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href={COMMUNITY_HREF} variant="outline" size="lg">
                Join the Community
              </Button>
            </motion.div>
          </motion.div>
        </Container>
      </section>

      {/* ================= HACKATHON CARDS ================= */}
      <Section id="hackathons" className="scroll-mt-24">
        <Container>
          <SectionHeading
            eyebrow="Upcoming"
            title="Upcoming Hackathons"
            description="Three editions are on the way. Details are being finalized — check back soon or join the community to be the first to know."
          />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {hackathons.map((h) => (
              <motion.div key={h.id} variants={item} className="h-full">
                <HackathonCard entry={h} communityHref={COMMUNITY_HREF} reduce={!!reduce} />
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </Section>

      {/* ================= CLOSING CTA ================= */}
      <Section className="pt-0">
        <Container>
          <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 to-transparent p-8 text-center sm:p-14">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/30">
                <Rocket className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-2xl font-bold sm:text-3xl">Be the first to know</h2>
              <p className="mx-auto mt-3 max-w-md text-pretty text-muted">
                Dates, themes, and registration will be announced soon. Join the community to get notified
                the moment the first hackathon goes live.
              </p>
              <Button href={COMMUNITY_HREF} size="lg" className="mt-7">
                Join the Community <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Container>
      </Section>
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
