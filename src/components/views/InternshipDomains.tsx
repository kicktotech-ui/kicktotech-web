"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Coffee, ShieldCheck, BarChart3, ArrowRight, Check, Clock, BadgeCheck, type LucideIcon } from "lucide-react";
import type { InternshipDomain } from "@/types";
import { Button } from "@/components/ui/Button";
import { internshipProgram } from "@/data/mock/internship";
import { formatINR } from "@/lib/utils";
import { easePremium } from "@/lib/motion";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = { Brain, Coffee, ShieldCheck, BarChart3 };

export function InternshipDomains({ domains }: { domains: InternshipDomain[] }) {
  const [activeId, setActiveId] = useState(domains[0]?.id);
  const active = domains.find((d) => d.id === activeId) ?? domains[0];
  const activeIndex = domains.findIndex((d) => d.id === active.id);
  const ActiveIcon = ICONS[active.icon] ?? Brain;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
      {/* Selector */}
      <div
        className="no-scrollbar flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
        role="tablist"
        aria-label="Internship domains"
      >
        {domains.map((d, i) => {
          const Icon = ICONS[d.icon] ?? Brain;
          const selected = d.id === active.id;
          return (
            <button
              key={d.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(d.id)}
              className={cn(
                "group relative flex min-w-[240px] flex-shrink-0 items-center gap-3.5 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 lg:min-w-0",
                selected
                  ? "border-accent/50 bg-surface-strong shadow-glow"
                  : "border-line bg-ink-800/40 hover:-translate-y-0.5 hover:border-accent/30 hover:bg-ink-800/70",
              )}
            >
              {/* active accent bar */}
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full transition-all duration-300",
                  selected ? "opacity-100" : "opacity-0",
                )}
                style={{ backgroundColor: d.accent }}
                aria-hidden
              />
              <span
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
                style={{ backgroundColor: `${d.accent}1f`, color: d.accent }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{d.title}</span>
                <span className="block truncate text-xs text-muted">{d.tagline}</span>
              </span>
              <span className={cn("font-mono text-xs transition-colors", selected ? "text-accent" : "text-muted/50")}>
                {String(i + 1).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-8 sm:p-10">
        <span
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl"
          style={{ backgroundColor: active.accent }}
          aria-hidden
        />
        {/* counter */}
        <span className="pointer-events-none absolute right-7 top-7 font-mono text-xs text-muted">
          {String(activeIndex + 1).padStart(2, "0")} / {String(domains.length).padStart(2, "0")}
        </span>

        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: easePremium }}
            className="relative"
          >
            <div className="flex items-center gap-4">
              <span
                className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${active.accent}1f`, color: active.accent }}
              >
                <ActiveIcon className="h-8 w-8" />
              </span>
              <div className="min-w-0">
                <h3 className="text-2xl font-bold">{active.title}</h3>
                <p className="text-sm" style={{ color: active.accent }}>{active.tagline}</p>
              </div>
            </div>

            <p className="mt-6 max-w-xl leading-relaxed text-muted">{active.description}</p>

            {/* info chips */}
            <div className="mt-6 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/5 px-3 py-1.5 text-xs">
                <Clock className="h-3.5 w-3.5 text-accent" /> {internshipProgram.durationLabel.split("(")[0].trim()}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/5 px-3 py-1.5 text-xs">
                <BadgeCheck className="h-3.5 w-3.5 text-accent" /> {formatINR(internshipProgram.priceRupees)} fee
              </span>
            </div>

            <div className="mt-7">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">What you&apos;ll learn</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {active.skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/5 px-3 py-1.5 text-sm">
                    <Check className="h-3.5 w-3.5" style={{ color: active.accent }} /> {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 flex justify-end border-t border-line pt-6">
              <Button href={`/internship/register?domain=${active.id}`} size="lg">
                Choose this track <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
