"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
  Info,
  CheckCircle2,
  Sparkles,
  Calendar,
  Lock,
  Headphones,
} from "lucide-react";
import { Container } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion";

interface InternshipMaintenanceViewProps {
  mode?: "page" | "registration" | "portal";
}

export function InternshipMaintenanceView({ mode = "page" }: InternshipMaintenanceViewProps) {
  const isRegistration = mode === "registration";

  return (
    <div className="relative min-h-[80vh] overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28">
      {/* Background ambient tech lighting & grid pattern */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(94,240,230,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(94,240,230,0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_25%,#000_50%,transparent_100%)]" />
        <div className="absolute left-1/2 top-0 h-[400px] w-[650px] -translate-x-1/2 rounded-full bg-gradient-to-b from-accent/15 via-electric/10 to-transparent blur-[140px]" />
        <div className="absolute right-0 top-1/4 h-72 w-72 rounded-full bg-purple-500/10 blur-[130px]" />
      </div>

      <Container className="relative">
        <Reveal className="mx-auto max-w-3xl text-center">
          {/* Eyebrow Badge */}
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur-md shadow-[0_0_24px_rgba(245,158,11,0.18)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            <span className="tracking-wide">Priority Event Active • Temporary Admissions Pause</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-primary-foreground leading-[1.1]">
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

          {/* Reassuring Subtitle & Description */}
          <p className="mt-5 text-pretty text-base sm:text-lg leading-relaxed text-primary-foreground/75 max-w-2xl mx-auto">
            {isRegistration ? (
              <>
                New batch admissions are paused while our entire mentorship and engineering team is
                dedicated to the live <strong className="text-accent font-semibold">PromptWars × KICK To TECH Hackathon</strong>.
                Existing registrations and verified credentials remain 100% safe, permanent, and accessible.
              </>
            ) : (
              <>
                To ensure maximum mentorship quality and platform resources, public internship admissions
                are paused during our flagship <strong className="text-accent font-semibold">PromptWars × KICK To TECH Hackathon</strong>.
                All enrolled students and issued certificates remain 100% secure, active, and verifiable.
              </>
            )}
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              href="/hackathon"
              size="lg"
              className="w-full sm:w-auto font-bold shadow-xl shadow-accent/25 hover:shadow-accent/40"
            >
              <Trophy className="h-4 w-4 mr-2 text-ink-900" />
              Explore PromptWars Hackathon
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
            <Button
              href="/verify_cert"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-line/80 bg-ink-800/70 hover:bg-ink-800 hover:border-emerald-400/50 text-primary-foreground font-semibold"
            >
              <ShieldCheck className="h-4 w-4 mr-2 text-emerald-400" />
              Verify a Certificate
            </Button>
            <Button
              href="/contact"
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto text-primary-foreground/75 hover:text-primary-foreground hover:bg-white/5"
            >
              Contact Support
            </Button>
          </div>
        </Reveal>

        {/* Feature Cards Grid (Deep Dark Glassmorphism, Zero Milky White Space) */}
        <div className="mt-14 sm:mt-18 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Hackathon Spotlight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-b from-ink-800/95 via-ink-800/80 to-ink-900/95 p-6 sm:p-7 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-accent hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(34,227,214,0.18)]"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-accent/20 blur-2xl transition-opacity group-hover:opacity-100" />
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/40 bg-accent/15 text-accent shadow-glow">
                  <Trophy className="h-6 w-6 text-yellow-300" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  Live Event
                </span>
              </div>

              <h2 className="mt-5 text-xl font-bold text-primary-foreground group-hover:text-accent transition-colors">
                PromptWars × KTT
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-primary-foreground/75">
                Join our flagship in-person & virtual AI hackathon. Compete for cash prizes, industry mentorship, and fast-track internship offers.
              </p>

              {/* Inclusions pill list */}
              <ul className="mt-4 space-y-2 text-xs text-primary-foreground/80">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span><strong>₹30,000</strong> Prize Pool & Awards</span>
                </li>
                <li className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>28 October 2026 • JSPM University, Pune</span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>₹99 Participant Kit & Refreshments</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-accent/20">
              <Button href="/hackathon/register" size="sm" className="w-full font-bold shadow-md shadow-accent/20">
                Register for Hackathon <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </motion.div>

          {/* Card 2: Certificate Safety & Live Verification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line/80 bg-gradient-to-b from-ink-800/90 via-ink-800/70 to-ink-900/95 p-6 sm:p-7 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-emerald-400/50 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(52,211,153,0.14)]"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-500/15 blur-2xl transition-opacity group-hover:opacity-100" />
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  100% Secure
                </span>
              </div>

              <h2 className="mt-5 text-xl font-bold text-primary-foreground group-hover:text-emerald-300 transition-colors">
                Certificates Safe & Live
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-primary-foreground/75">
                Every past and present internship certificate remains securely anchored in Cloud Firestore with active public QR verification.
              </p>

              {/* Inclusions pill list */}
              <ul className="mt-4 space-y-2 text-xs text-primary-foreground/80">
                <li className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Tamper-proof Cryptographic Verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Public Instant QR ID Lookup</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Recognized across top hiring partners</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-line/50">
              <Button
                href="/verify_cert"
                variant="outline"
                size="sm"
                className="w-full border-line/80 bg-ink-800/60 hover:border-emerald-400/50 hover:bg-emerald-500/10 text-primary-foreground font-semibold"
              >
                Check Verification Portal <ShieldCheck className="h-3.5 w-3.5 ml-1 text-emerald-400" />
              </Button>
            </div>
          </motion.div>

          {/* Card 3: Enrolled Intern Support Desk */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line/80 bg-gradient-to-b from-ink-800/90 via-ink-800/70 to-ink-900/95 p-6 sm:p-7 shadow-xl backdrop-blur-xl sm:col-span-2 lg:col-span-1 transition-all duration-300 hover:border-purple-400/50 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(168,85,247,0.14)]"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-purple-500/15 blur-2xl transition-opacity group-hover:opacity-100" />
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-400">
                  <PhoneCall className="h-6 w-6" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-400/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-300">
                  <Headphones className="h-3 w-3" />
                  Active Desk
                </span>
              </div>

              <h2 className="mt-5 text-xl font-bold text-primary-foreground group-hover:text-purple-300 transition-colors">
                Existing Intern Support
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-primary-foreground/75">
                Already enrolled in an ongoing batch? Our academic coordinators, mentor review desk, and project channels continue operating normally.
              </p>

              {/* Inclusions pill list */}
              <ul className="mt-4 space-y-2 text-xs text-primary-foreground/80">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>Direct Mentor Review & Project Feedback</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>Discord & WhatsApp Batch Channels Active</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>Fast Coordinator Response via Email & Call</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-line/50">
              <Button
                href="/contact"
                variant="outline"
                size="sm"
                className="w-full border-line/80 bg-ink-800/60 hover:border-purple-400/50 hover:bg-purple-500/10 text-primary-foreground font-semibold"
              >
                Get Support <ArrowRight className="h-3.5 w-3.5 ml-1 text-purple-400" />
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Informational Callout Banner (Deep Dark Tech Bar, Zero White Space) */}
        <div className="mt-10 sm:mt-14 overflow-hidden rounded-2xl border border-line/80 bg-gradient-to-r from-ink-800/90 via-ink-800/60 to-ink-900/90 p-5 sm:p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="rounded-xl border border-accent/30 bg-accent/10 p-2.5 text-accent shadow-glow shrink-0">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary-foreground">
                  Notice on Reopening Next Internship Cohort
                </p>
                <p className="mt-1 text-xs text-primary-foreground/75 leading-relaxed">
                  Internship batch admissions will resume immediately after the conclusion of PromptWars.
                  Stay connected on our community channels for upcoming batch dates, domain tracks, and curriculum updates.
                </p>
              </div>
            </div>
            <Button
              href="/community"
              variant="outline"
              size="sm"
              className="shrink-0 border-line/80 bg-ink-800/60 hover:border-accent/40 text-primary-foreground font-semibold"
            >
              Join Community <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
