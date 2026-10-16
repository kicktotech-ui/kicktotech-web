"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GraduationCap,
  HeartHandshake,
  Building2,
  Award,
  type LucideIcon,
} from "lucide-react";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

/**
 * COMMUNITY NETWORK — a living map of the Kick To Tech community.
 *
 * Deliberately DIFFERENT from the Home ecosystem visual:
 *  - Home = a logo hub ringed by 6 category pills.
 *  - Community = a MULTI-LAYER human network: a central hub → category nodes →
 *    REAL member portraits, with multi-hop relationships between people and
 *    categories.
 *
 * Connections are DOM-measured (getBoundingClientRect relative to the panel) so
 * every line touches the exact edge of its two nodes and recomputes on resize.
 * Node centers stay static — "alive" comes from travelling particles, breathing
 * glow, and ring pulses (never translate), which keeps every line perfectly
 * attached. Hover a node: its connections + neighbours brighten, the rest fade.
 */

type Kind = "hub" | "category" | "member";

interface NetNode {
  id: string;
  kind: Kind;
  label: string; // hub/category label OR member name
  sub?: string; // category caption OR member role
  Icon?: LucideIcon; // category
  photo?: string; // member portrait
  objectPosition?: string;
  color: string;
  x: number; // % of panel
  y: number;
  size: number; // px @ desktop
  labelPos?: "top" | "bottom";
  mobileHidden?: boolean;
}

const C = {
  student: "#22e3d6",
  mentor: "#5ff0e6",
  college: "#3b82f6",
  career: "#60a5fa",
  member: "#7ff5ec",
} as const;

// Curated, evenly-spaced composition (axes = categories, diagonals = people).
const NODES: NetNode[] = [
  { id: "hub", kind: "hub", label: "Kick To Tech", color: C.student, x: 50, y: 50, size: 92 },

  { id: "students", kind: "category", label: "Students", sub: "Learn & build", Icon: GraduationCap, color: C.student, x: 50, y: 12, size: 54, labelPos: "top" },
  { id: "mentors", kind: "category", label: "Mentors", sub: "Guidance", Icon: HeartHandshake, color: C.mentor, x: 88, y: 50, size: 54, labelPos: "bottom" },
  { id: "careers", kind: "category", label: "Careers", sub: "Opportunities", Icon: Award, color: C.career, x: 50, y: 88, size: 54, labelPos: "bottom" },
  { id: "colleges", kind: "category", label: "Colleges", sub: "Partners", Icon: Building2, color: C.college, x: 12, y: 50, size: 54, labelPos: "bottom" },

  { id: "mayur", kind: "member", label: "Mayur Patil", sub: "Founder", photo: "/team/mayur-patil.png", objectPosition: "center 20%", color: C.member, x: 76, y: 76, size: 78 },
  { id: "kanchan", kind: "member", label: "Kanchan Patil", sub: "Managing Director", photo: "/team/kanchan-patil.jpg", objectPosition: "center 30%", color: C.member, x: 74, y: 24, size: 62 },
  { id: "tauheed", kind: "member", label: "Tauheed", sub: "Industry Outreach", photo: "/team/tauheed.jpeg", objectPosition: "center 25%", color: C.member, x: 24, y: 76, size: 62, mobileHidden: true },
  { id: "omkar", kind: "member", label: "Omkar Pawar", sub: "Strategic Outreach", photo: "/team/omkar-pawar.jpeg", objectPosition: "center 20%", color: C.member, x: 26, y: 24, size: 62, mobileHidden: true },
];

const LINKS: [string, string][] = [
  ["hub", "students"],
  ["hub", "mentors"],
  ["hub", "careers"],
  ["hub", "colleges"],
  ["hub", "mayur"],
  ["students", "kanchan"],
  ["students", "omkar"],
  ["mentors", "tauheed"],
  ["mentors", "kanchan"],
  ["colleges", "omkar"],
  ["careers", "mayur"],
  ["careers", "tauheed"],
  ["kanchan", "mayur"],
];

interface Link {
  id: string;
  a: string;
  b: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  delay: number;
}

export function CommunityNetwork() {
  const reduced = useReducedMotionSafe();
  const isMobile = useIsMobile();
  const interactive = !reduced;

  const panelRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [links, setLinks] = useState<Link[]>([]);
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [active, setActive] = useState<string | null>(null);

  // Visible nodes / links (thin out on mobile for breathing room).
  const nodes = useMemo(
    () => (isMobile ? NODES.filter((n) => !n.mobileHidden) : NODES),
    [isMobile],
  );
  const rawLinks = useMemo(() => {
    const visible = new Set(nodes.map((n) => n.id));
    return LINKS.filter(([a, b]) => visible.has(a) && visible.has(b));
  }, [nodes]);

  // Adjacency for hover highlighting.
  const neighbours = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const [a, b] of rawLinks) {
      (map[a] ??= new Set()).add(b);
      (map[b] ??= new Set()).add(a);
    }
    return map;
  }, [rawLinks]);

  // Measure real DOM geometry → connection endpoints that touch node edges.
  const measure = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const pr = panel.getBoundingClientRect();

    const center: Record<string, { x: number; y: number; r: number }> = {};
    for (const n of nodes) {
      const el = nodeRefs.current[n.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      center[n.id] = {
        x: r.left + r.width / 2 - pr.left,
        y: r.top + r.height / 2 - pr.top,
        r: Math.min(r.width, r.height) / 2,
      };
    }

    const next: Link[] = [];
    rawLinks.forEach(([a, b], i) => {
      const p = center[a];
      const q = center[b];
      if (!p || !q) return;
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      const color = NODES.find((n) => n.id === a)?.color ?? C.student;
      next.push({
        id: `${a}-${b}`,
        a,
        b,
        x1: p.x + ux * (p.r + 3),
        y1: p.y + uy * (p.r + 3),
        x2: q.x - ux * (q.r + 3),
        y2: q.y - uy * (q.r + 3),
        color,
        delay: i * 0.35,
      });
    });
    setLinks(next);
    setSize({ w: pr.width, h: pr.height });
  }, [nodes, rawLinks]);

  useEffect(() => {
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => measure());
    if (panelRef.current) ro.observe(panelRef.current);
    window.addEventListener("resize", measure);
    const t = setTimeout(measure, 400); // after fonts/layout settle
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const isDimNode = (id: string) =>
    active !== null && active !== id && !neighbours[active]?.has(id);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px]">
      {/* outer ambient glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-accent/15 via-transparent to-electric/15 blur-3xl" />

      <div
        ref={panelRef}
        className="glass-strong relative h-full w-full overflow-hidden rounded-[2.5rem] border border-line"
        onMouseLeave={() => interactive && setActive(null)}
      >
        {/* subtle technical grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:36px_36px]" />
        {/* soft radial lighting */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />

        {/* CONNECTIONS (measured) */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${size.w} ${size.h}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <filter id="net-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {links.map((l) => {
            const on = active === l.a || active === l.b;
            const dim = active !== null && !on;
            return (
              <g
                key={l.id}
                style={{ opacity: dim ? 0.16 : 1, transition: "opacity .35s" }}
              >
                <line
                  x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke={l.color}
                  strokeWidth={on ? 2.6 : 1.6}
                  strokeLinecap="round"
                  opacity={on ? 0.45 : 0.14}
                  filter="url(#net-glow)"
                  style={{ transition: "opacity .35s, stroke-width .35s" }}
                />
                <line
                  x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke={l.color}
                  strokeWidth={0.9}
                  strokeLinecap="round"
                  opacity={on ? 0.95 : 0.4}
                  style={{ transition: "opacity .35s" }}
                />
                {!reduced && (
                  <motion.circle
                    r={on ? 3 : 2.2}
                    fill="#eafffb"
                    initial={{ cx: l.x1, cy: l.y1, opacity: 0 }}
                    animate={{
                      cx: [l.x1, l.x2],
                      cy: [l.y1, l.y2],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: on ? 1.6 : 3,
                      repeat: Infinity,
                      repeatDelay: on ? 0.15 : 1.1,
                      delay: l.delay,
                      ease: "easeInOut",
                    }}
                    style={{ filter: `drop-shadow(0 0 5px ${l.color})` }}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* NODES */}
        {nodes.map((n, i) => {
          const on = active === n.id;
          const dim = isDimNode(n.id);
          return (
            <div
              key={n.id}
              className="absolute z-10"
              style={{ left: `${n.x}%`, top: `${n.y}%`, transform: "translate(-50%, -50%)" }}
            >
              <motion.div
                ref={(el) => {
                  nodeRefs.current[n.id] = el;
                }}
                onMouseEnter={() => interactive && setActive(n.id)}
                onFocus={() => interactive && setActive(n.id)}
                onBlur={() => interactive && setActive(null)}
                tabIndex={0}
                role="button"
                aria-label={n.sub ? `${n.label} — ${n.sub}` : n.label}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: dim ? 0.45 : 1, scale: on ? 1.1 : dim ? 0.94 : 1 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex cursor-pointer flex-col items-center outline-none"
              >
                {/* the node itself */}
                <span
                  className="relative flex items-center justify-center"
                  style={{ width: n.size, height: n.size }}
                >
                  {/* breathing / active pulse ring (scale only — never moves center) */}
                  {!reduced && (n.kind === "hub" || on) && (
                    <motion.span
                      className="absolute inset-0 rounded-full border"
                      style={{ borderColor: n.color }}
                      animate={{ scale: [1, 1.35], opacity: [0.55, 0] }}
                      transition={{
                        duration: on ? 1.3 : 2.6,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                  )}

                  {n.kind === "hub" ? (
                    <span className="relative flex h-full w-full items-center justify-center rounded-full border border-accent/50 bg-ink-800/95 shadow-glow-lg">
                      {!reduced && (
                        <span className="absolute -inset-1.5 animate-spin-slow rounded-full border border-dashed border-accent/25" />
                      )}
                      <Image
                        src="/brand/logo.png"
                        alt="Kick To Tech"
                        width={44}
                        height={44}
                        className="h-11 w-11 rounded-xl object-contain"
                      />
                    </span>
                  ) : n.kind === "member" ? (
                    <span
                      className={cn(
                        "block h-full w-full overflow-hidden rounded-full border-2 shadow-card transition-colors duration-300",
                        on ? "border-accent" : "border-white/15",
                      )}
                    >
                      <Image
                        src={n.photo!}
                        alt={n.label}
                        width={n.size}
                        height={n.size}
                        className="h-full w-full object-cover"
                        style={{ objectPosition: n.objectPosition }}
                      />
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "flex h-full w-full items-center justify-center rounded-full border bg-ink-800/95 shadow-card transition-colors duration-300",
                        on ? "border-accent/70" : "border-line",
                      )}
                      style={{
                        color: n.color,
                        boxShadow: on ? `0 0 18px ${n.color}66` : undefined,
                      }}
                    >
                      {n.Icon && <n.Icon className="h-5 w-5" />}
                    </span>
                  )}

                  {/* activity indicator on member portraits */}
                  {n.kind === "member" && (
                    <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-ink-900 bg-emerald-400" />
                  )}
                </span>

                {/* label */}
                <span
                  className={cn(
                    "pointer-events-none absolute left-1/2 z-20 w-max -translate-x-1/2 text-center",
                    n.labelPos === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
                  )}
                >
                  <span
                    className={cn(
                      "block text-[11px] font-bold leading-tight transition-colors sm:text-xs",
                      n.kind === "hub" ? "uppercase tracking-widest text-accent" : "text-primary-foreground",
                    )}
                  >
                    {n.label}
                  </span>
                  {n.sub && n.kind !== "hub" && (
                    <span
                      className={cn(
                        "block text-[10px] leading-tight transition-opacity duration-300",
                        on ? "text-accent" : "text-muted",
                      )}
                    >
                      {n.sub}
                    </span>
                  )}
                </span>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
