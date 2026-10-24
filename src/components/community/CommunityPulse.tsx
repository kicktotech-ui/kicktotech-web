"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";

/**
 * "Community Pulse" — a living cluster of real member portraits with soft
 * connecting lines and gentle activity. People-first and intentionally
 * DIFFERENT from the Home ecosystem hub diagram (no central logo hub, no
 * students/colleges/companies node labels).
 */

type Node = {
  name: string;
  role: string;
  photo: string;
  pos: string; // objectPosition
  x: number; // %
  y: number;
  size: number; // px @ desktop
};

// Curated from the real team roster (real photos, real roles).
const nodes: Node[] = [
  { name: "Mayur Patil", role: "Founder", photo: "/team/mayur-patil.png", pos: "center 20%", x: 50, y: 48, size: 108 },
  { name: "Kaustubh Pawar", role: "Co-Founder", photo: "/team/kaustubh-pawar.jpg", pos: "center 25%", x: 22, y: 28, size: 76 },
  { name: "Kanchan Patil", role: "Managing Director", photo: "/team/kanchan-patil.jpg", pos: "center 30%", x: 80, y: 26, size: 72 },
  { name: "Omkar Pawar", role: "Strategic Outreach", photo: "/team/omkar-pawar.jpeg", pos: "center 20%", x: 16, y: 68, size: 70 },
  { name: "Tauheed", role: "Industry Outreach", photo: "/team/tauheed.jpeg", pos: "center 25%", x: 82, y: 70, size: 74 },
  { name: "Luv Parab", role: "Graphics Lead", photo: "/team/luv-parab.png", pos: "center 20%", x: 44, y: 84, size: 62 },
  { name: "Nuzhat Fakir", role: "Research Assistant", photo: "/team/nuzhat-fakir.jpeg", pos: "center 25%", x: 66, y: 12, size: 60 },
];

// Soft links between member indices.
const links: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 6], [2, 6], [3, 5], [4, 5],
];

export function CommunityPulse() {
  const reduced = useReducedMotionSafe();
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      {/* ambient */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/10 via-transparent to-electric/10 blur-2xl" />

      {/* connection lines + travelling pulses */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="pulse-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22e3d6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {links.map(([a, b], i) => (
          <g key={i}>
            <line
              x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
              stroke="url(#pulse-line)" strokeWidth={0.4} strokeLinecap="round"
            />
            {!reduced && (
              <motion.circle
                r={0.7} fill="#7ff5ec"
                initial={{ opacity: 0 }}
                animate={{
                  cx: [nodes[a].x, nodes[b].x],
                  cy: [nodes[a].y, nodes[b].y],
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 2.4, delay: i * 0.5, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
              />
            )}
          </g>
        ))}
      </svg>

      {/* member avatars */}
      {nodes.map((n, i) => (
        <motion.button
          key={n.name}
          type="button"
          className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
          onHoverStart={() => setActive(i)}
          onHoverEnd={() => setActive(null)}
          onFocus={() => setActive(i)}
          onBlur={() => setActive(null)}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 + i * 0.08, type: "spring", stiffness: 180, damping: 15 }}
          aria-label={`${n.name}, ${n.role}`}
        >
          <motion.span
            className="relative block"
            animate={reduced ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 4 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* pulse ring for the featured (founder) node */}
            {i === 0 && !reduced && (
              <motion.span
                className="absolute inset-0 rounded-full border border-accent/50"
                animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <span
              className="block overflow-hidden rounded-full border-2 border-white/15 shadow-card transition-all duration-300 hover:border-accent"
              style={{ width: n.size, height: n.size }}
            >
              <Image
                src={n.photo}
                alt={n.name}
                width={n.size}
                height={n.size}
                priority={i < 5}
                className="h-full w-full object-cover"
                style={{ objectPosition: n.pos }}
              />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink-900 bg-emerald-400" />
          </motion.span>

          {/* contextual panel */}
          {active === i && (
            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-xl border border-line bg-ink-800/95 px-3 py-1.5 text-center shadow-lift backdrop-blur"
            >
              <span className="block text-xs font-bold text-primary-foreground">{n.name}</span>
              <span className="block text-[11px] text-accent">{n.role}</span>
            </motion.span>
          )}
        </motion.button>
      ))}
    </div>
  );
}
