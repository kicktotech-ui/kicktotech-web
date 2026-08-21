import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, Users, Sparkles, ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Premium split-screen auth layout.
 * LEFT  — branded marketing panel (network backdrop + real community proof).
 * RIGHT — the form card.
 * The public API (title / subtitle / children / footer) is unchanged, so
 * login, signup, and forgot-password all upgrade without edits.
 */

const highlights = [
  { Icon: Users, text: "Join 1,000+ students, mentors & builders" },
  { Icon: Sparkles, text: "Workshops, hackathons & project-first learning" },
  { Icon: ShieldCheck, text: "Verifiable certificates employers can trust" },
];

// static decorative network
const NODES = [
  { x: 12, y: 20 }, { x: 32, y: 52 }, { x: 20, y: 82 }, { x: 52, y: 30 },
  { x: 68, y: 66 }, { x: 84, y: 24 }, { x: 88, y: 78 }, { x: 50, y: 88 },
];
const EDGES: [number, number][] = [
  [0, 3], [3, 1], [1, 2], [1, 4], [3, 5], [4, 6], [4, 7], [5, 6],
];

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_1fr]">
      {/* LEFT — brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-line bg-ink-800/40 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="pointer-events-none absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-accent/15 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-electric/10 blur-[130px]" />

        {/* network backdrop */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {EDGES.map(([a, b], i) => (
            <line key={i} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} stroke="#22e3d6" strokeWidth={0.12} opacity={0.4} />
          ))}
          {NODES.map((n, i) => (
            <circle key={i} cx={n.x} cy={n.y} r={0.6} fill="#22e3d6" opacity={0.7} />
          ))}
        </svg>

        <div className="relative">
          <Logo />
        </div>

        <Reveal className="relative">
          <p className="text-sm font-bold uppercase tracking-widest text-accent">Kick To Tech</p>
          <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] xl:text-5xl">
            Where students <span className="text-gradient">build skills, connections & careers.</span>
          </h2>
          <ul className="mt-8 space-y-4">
            {highlights.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-primary-foreground/90">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="relative flex gap-8">
          {[
            { v: "1,000+", l: "Members" },
            { v: "230+", l: "Students engaged" },
            { v: "4", l: "Internship tracks" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-2xl font-extrabold text-gradient">{s.v}</div>
              <div className="text-xs uppercase tracking-widest text-muted">{s.l}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* RIGHT — form */}
      <div className="relative flex flex-col justify-center px-5 py-14 sm:px-8">
        <div className="pointer-events-none absolute left-1/2 top-8 h-56 w-56 -translate-x-1/2 rounded-full bg-accent/10 blur-[120px] lg:hidden" />
        <Reveal className="relative mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="glass-strong rounded-3xl p-7 shadow-card sm:p-9">
            {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-accent">{eyebrow}</p>}
            <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
          <p className="mt-6 text-center text-xs text-muted">
            <Link href="/" className="inline-flex items-center gap-1.5 hover:text-accent">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to site
            </Link>
          </p>
        </Reveal>
      </div>
    </div>
  );
}
