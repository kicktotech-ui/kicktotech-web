"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ShieldCheck, Check, ArrowRight, BadgeCheck } from "lucide-react";
import { Container, Section } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { easePremium } from "@/lib/motion";

/** Real founder / co-founder signature assets (transparent PNGs). */
const SIGNATURES = [
  { src: "/cert-assets/mayur-patil-signature.png", name: "Mayur Patil", role: "Founder" },
  { src: "/cert-assets/kaustubh-pawar-signature-new.png", name: "Kaustubh Pawar", role: "Co-Founder" },
];

const meta = [
  { label: "Certificate ID", value: "KTT-2026-XXXX", mono: true },
  { label: "Program", value: "Internship" },
  { label: "Duration", value: "5 Weeks" },
];

const features = [
  "Real-world project experience",
  "Industry mentorship",
  "Verifiable credential ID",
  "Internship completion record",
];

export function CredentialSection() {
  const reduced = useReducedMotionSafe();
  const { user } = useAuth();
  const recipient = user?.name?.trim() || "Your Name";

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : 0.08, delayChildren: 0.1 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easePremium } },
  };
  const sign: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : 8, clipPath: reduced ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)" },
    show: { opacity: 1, y: 0, clipPath: "inset(0 0% 0 0)", transition: { duration: 0.9, ease: easePremium } },
  };

  return (
    <Section className="relative overflow-hidden">
      {/* focus glow + faint grid, scoped to this section only */}
      <div className="pointer-events-none absolute right-0 top-1/2 h-[34rem] w-[34rem] -translate-y-1/2 translate-x-1/4 rounded-full bg-accent/10 blur-[140px]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:40px_40px]" aria-hidden />

      <Container className="relative">
        <div className="grid items-center gap-10 lg:grid-cols-[45fr_55fr] lg:gap-14">
          {/* LEFT — why the credential matters */}
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent">
              <ShieldCheck className="h-3.5 w-3.5" /> Verifiable credential
            </span>
            <h2 className="mt-5 text-balance text-3xl font-bold leading-tight sm:text-4xl">
              A certificate that <span className="text-gradient">actually means something.</span>
            </h2>
            <p className="mt-4 max-w-md text-pretty leading-relaxed text-muted">
              Your internship should leave you with more than a PDF — a verifiable record of the
              work, skills, and experience you completed with Kick To Tech.
            </p>

            <ul className="mt-7 space-y-3">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-primary-foreground/90">{f}</span>
                </li>
              ))}
            </ul>

            <Button href="/verify_cert" variant="outline" className="mt-8">
              Verify a certificate
            </Button>

            {/* subtle Experience → Credential connector (desktop only) */}
            <div className="pointer-events-none absolute right-[-3.5rem] top-1/2 hidden h-px w-14 -translate-y-1/2 lg:block" aria-hidden>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent to-accent/60" />
              {!reduced && (
                <motion.span
                  className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent shadow-glow"
                  animate={{ left: ["0%", "100%"], opacity: [0, 1, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
                />
              )}
            </div>
          </div>

          {/* RIGHT — the credential */}
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 26, scale: reduced ? 1 : 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: easePremium }}
            className="relative"
          >
            {/* ambient glow */}
            <div className="pointer-events-none absolute -inset-5 rounded-[2.25rem] bg-gradient-to-br from-accent/20 via-transparent to-electric/15 blur-2xl" aria-hidden />

            {/* card */}
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="group relative overflow-hidden rounded-[1.75rem] border border-accent/25 bg-gradient-to-br from-ink-800 to-ink-900 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-accent/45 hover:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85),0_0_50px_-20px_rgba(34,227,214,0.4)] sm:p-8"
            >
              {/* micro grid */}
              <span className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:26px_26px]" aria-hidden />
              {/* holographic sheen */}
              <span className="pointer-events-none absolute -inset-x-1 -top-1 h-40 bg-gradient-to-b from-white/[0.05] to-transparent" aria-hidden />
              {/* hover light sweep */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent transition-transform duration-[1100ms] ease-premium group-hover:translate-x-full" aria-hidden />
              {/* corner marks */}
              {["left-3 top-3 border-l border-t", "right-3 top-3 border-r border-t", "left-3 bottom-3 border-l border-b", "right-3 bottom-3 border-r border-b"].map((c) => (
                <span key={c} className={`pointer-events-none absolute h-4 w-4 rounded-[3px] border-accent/30 ${c}`} aria-hidden />
              ))}

              <div className="relative">
                {/* header: status + seal */}
                <motion.div variants={item} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-accent">
                    <motion.span
                      className="h-1.5 w-1.5 rounded-full bg-accent"
                      animate={reduced ? undefined : { opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    Verified Credential
                  </span>
                  {/* seal */}
                  <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-accent/40 bg-ink-900/70 text-accent">
                    {!reduced && <span className="absolute -inset-1 animate-spin-slow rounded-full border border-dashed border-accent/25" />}
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                </motion.div>

                {/* brand */}
                <motion.div variants={item} className="mt-6 flex items-center gap-2.5">
                  <Image src="/brand/logo.png" alt="Kick To Tech" width={28} height={28} className="h-7 w-7 rounded-lg object-contain" />
                  <div className="leading-tight">
                    <p className="text-sm font-bold tracking-wide">KICK TO TECH</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Digital Credential System</p>
                  </div>
                </motion.div>

                {/* title */}
                <motion.div variants={item} className="mt-7">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-muted">Certificate of Completion</p>
                  <h3 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">Kick To Tech Internship</h3>
                  <p className="mt-1.5 text-sm text-muted">5 Weeks</p>
                </motion.div>

                {/* recipient */}
                <motion.div variants={item} className="mt-6 border-l-2 border-accent/50 pl-4">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted">Presented to</p>
                  <p className="mt-1 text-xl font-bold text-primary-foreground sm:text-2xl">{recipient}</p>
                </motion.div>

                {/* metadata */}
                <motion.div variants={item} className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-6 sm:grid-cols-4">
                  {meta.map((m) => (
                    <div key={m.label}>
                      <p className="text-[10px] uppercase tracking-widest text-muted">{m.label}</p>
                      <p className={`mt-1 text-sm font-semibold ${m.mono ? "font-mono text-accent" : ""}`}>{m.value}</p>
                    </div>
                  ))}
                </motion.div>

                {/* signatures */}
                <motion.div variants={item} className="mt-8 grid grid-cols-2 gap-6 sm:gap-10">
                  {SIGNATURES.map((s) => (
                    <div key={s.name} className="text-center">
                      <motion.span variants={sign} className="mx-auto flex h-12 items-end justify-center">
                        <Image
                          src={s.src}
                          alt={`${s.name} signature`}
                          width={150}
                          height={48}
                          className="h-11 w-auto max-w-[150px] object-contain opacity-90 invert"
                        />
                      </motion.span>
                      <span className="mt-1 block h-px w-full bg-line" />
                      <p className="mt-2 text-sm font-bold leading-tight">{s.name}</p>
                      <p className="text-[11px] text-muted">{s.role} · Kick To Tech</p>
                    </div>
                  ))}
                </motion.div>

                {/* verification footer */}
                <motion.div variants={item} className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-ink-900/50 p-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                      <BadgeCheck className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-accent">Publicly verifiable</p>
                      <p className="font-mono text-xs text-muted">ID: KTT-2026-XXXX</p>
                    </div>
                  </div>
                  <Link
                    href="/verify_cert"
                    className="group/btn inline-flex items-center gap-1.5 rounded-full border border-accent/40 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
                  >
                    Verify credential
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
