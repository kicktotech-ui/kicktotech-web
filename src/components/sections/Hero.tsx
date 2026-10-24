"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MagneticButton } from "@/components/motion";
import { EcosystemVisual } from "./EcosystemVisual";
import { easePremium } from "@/lib/motion";
import { isInternshipMaintenance } from "@/config/features";

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: easePremium },
  }),
};

export function Hero() {
  const maintenance = isInternshipMaintenance();

  return (
    <section className="relative overflow-hidden">
      {/* ambient glow behind the network */}
      <div className="pointer-events-none absolute right-0 top-0 h-[40rem] w-[40rem] -translate-y-1/4 translate-x-1/4 rounded-full bg-accent/10 blur-[150px]" />

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:pb-24 lg:pt-20">
        {/* Left: content */}
        <div className="text-center lg:text-left">
          <motion.span
            custom={0} variants={fade} initial="hidden" animate="show"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent"
          >
            {maintenance ? (
              <>
                <Trophy className="h-3.5 w-3.5 text-yellow-300" /> Priority Event • PromptWars Hackathon 2026
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Pune&apos;s Student Tech Community
              </>
            )}
          </motion.span>

          <motion.h1
            custom={1} variants={fade} initial="hidden" animate="show"
            className="mt-6 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Where students build{" "}
            <span className="text-gradient">skills, connections</span> and careers.
          </motion.h1>

          <motion.p
            custom={2} variants={fade} initial="hidden" animate="show"
            className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg lg:mx-0"
          >
            KICK To TECH — An Edutech start-up Building student talent infrastructure — connecting students,
            colleges, and companies through workshops, hackathons, mentorship, and
            industry-grade internships.
          </motion.p>

          <motion.div
            custom={3} variants={fade} initial="hidden" animate="show"
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start sm:justify-center"
          >
            <MagneticButton>
              {maintenance ? (
                <Button href="/hackathon" size="lg">
                  <Trophy className="h-4 w-4 text-yellow-300" />
                  Explore PromptWars Hackathon <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button href="/internship" size="lg">
                  Explore Internships <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </MagneticButton>
            <Button href="/join" variant="outline" size="lg">
              Join the Community
            </Button>
          </motion.div>

          <motion.ul
            custom={4} variants={fade} initial="hidden" animate="show"
            className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 border-t border-line pt-8 text-sm text-muted lg:justify-start"
          >
            {["Project-first internships", "Industry mentorship", "Verifiable certificates"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {t}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Right: ecosystem network */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.25, ease: easePremium }}
        >
          <EcosystemVisual />
        </motion.div>
      </div>
    </section>
  );
}
