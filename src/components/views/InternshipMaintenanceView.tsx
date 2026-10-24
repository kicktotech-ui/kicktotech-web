"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  PhoneCall,
  Clock,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Container, Section, Badge } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion";

interface InternshipMaintenanceViewProps {
  mode?: "page" | "registration" | "portal";
}

export function InternshipMaintenanceView({ mode = "page" }: InternshipMaintenanceViewProps) {
  const isRegistration = mode === "registration";

  return (
    <div className="relative min-h-[75vh] overflow-hidden py-16 sm:py-24">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#0057ff]/15 via-purple-500/10 to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute right-10 top-40 h-80 w-80 rounded-full bg-electric/10 blur-[130px]" />

      <Container className="relative">
        <Reveal className="mx-auto max-w-3xl text-center">
          {/* Eyebrow Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            <span>Priority Event in Progress • Temporary Pause</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            {isRegistration ? (
              <>
                Internship Registration is <span className="text-gradient">Temporarily Paused</span>
              </>
            ) : (
              <>
                Internships Paused for <span className="text-gradient">PromptWars 2026</span>
              </>
            )}
          </h1>

          {/* Description */}
          <p className="mt-6 text-pretty text-lg leading-relaxed text-muted">
            {isRegistration ? (
              <>
                New internship registrations are temporarily on hold as our entire mentor and engineering
                team is dedicated to the upcoming <strong>PromptWars × KICK To TECH Hackathon</strong>.
                You can join the hackathon or verify existing credentials below.
              </>
            ) : (
              <>
                To provide the highest quality experience, internship batch admissions are temporarily
                paused while our team conducts the live <strong>PromptWars × KICK To TECH 2026 Hackathon</strong>.
                All existing registrations and certificates remain 100% safe, active, and verifiable.
              </>
            )}
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/hackathon" size="lg" className="w-full sm:w-auto shadow-lg shadow-accent/20">
              <Trophy className="h-4 w-4 text-yellow-300" />
              Explore PromptWars Hackathon
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="/verify_cert" variant="outline" size="lg" className="w-full sm:w-auto">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Verify a Certificate
            </Button>
            <Button href="/contact" variant="ghost" size="lg" className="w-full sm:w-auto text-muted hover:text-foreground">
              Contact Support
            </Button>
          </div>
        </Reveal>

        {/* Feature Cards Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Hackathon Spotlight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="group relative overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-b from-surface/90 to-surface/40 p-6 backdrop-blur-xl shadow-xl transition-all duration-300 hover:border-accent hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 h-28 w-28 bg-accent/15 blur-2xl pointer-events-none" />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Trophy className="h-6 w-6 text-yellow-300" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">PromptWars × KTT</h2>
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">ACTIVE</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Live at JSPM University, Pune on 28 October 2026. ₹99 entry fee, cash awards, certificates, and direct industry networking.
            </p>
            <div className="mt-5">
              <Button href="/hackathon/register" size="sm" className="w-full">
                Register for Hackathon <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </motion.div>

          {/* Card 2: Certificate Safety */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="group relative overflow-hidden rounded-2xl border border-line bg-surface/70 p-6 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/40 hover:-translate-y-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-foreground">Certificates Safe & Live</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              All previous internship certificates remain permanently stored and publicly verifiable with instant QR verification.
            </p>
            <div className="mt-5">
              <Button href="/verify_cert" variant="outline" size="sm" className="w-full">
                Check Verification Portal
              </Button>
            </div>
          </motion.div>

          {/* Card 3: Enrolled Intern Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="group relative overflow-hidden rounded-2xl border border-line bg-surface/70 p-6 backdrop-blur-xl sm:col-span-2 lg:col-span-1 transition-all duration-300 hover:border-purple-500/40 hover:-translate-y-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <PhoneCall className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-foreground">Existing Intern Support</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Already enrolled or have questions regarding past batches? Our support team is active and ready to assist you.
            </p>
            <div className="mt-5">
              <Button href="/contact" variant="outline" size="sm" className="w-full">
                Get Support
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Informational Callout Banner */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-line/80 bg-surface/50 p-6 backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-accent/10 p-2 text-accent">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Notice on Reopening Internships
                </p>
                <p className="mt-0.5 text-xs text-muted leading-relaxed">
                  Internship batch admissions will resume following the conclusion of PromptWars.
                  Stay tuned on our community channels for batch schedules and syllabus updates.
                </p>
              </div>
            </div>
            <Button href="/community" variant="outline" size="sm" className="shrink-0">
              Join Community
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
