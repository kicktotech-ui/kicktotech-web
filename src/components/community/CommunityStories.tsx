"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Quote, Linkedin, ArrowUpRight } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { contentService } from "@/services";
import { Container, Section, SectionHeading } from "@/components/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { AsyncBoundary } from "@/components/feedback/AsyncBoundary";
import { EmptyState } from "@/components/feedback/states";
import { easePremium } from "@/lib/motion";
import type { TeamMember } from "@/types";

/**
 * Real member stories — text is drawn from each person's real bio (no invented
 * quotes). Surfaces members whose source bios read as mission statements.
 */
const STORY_IDS = ["mayur-patil", "kanchan-patil", "kaustubh-pawar"];

/**
 * Role label shown on the Community story card only (does NOT change the
 * member's canonical role in the team data used elsewhere).
 */
const ROLE_OVERRIDE: Record<string, string> = { "kaustubh-pawar": "CEO" };

function StoryCard({ member, index }: { member: TeamMember; index: number }) {
  const flip = index % 2 === 1;
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: easePremium }}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-accent/40 hover:shadow-card sm:flex-row ${
        flip ? "sm:flex-row-reverse" : ""
      }`}
    >
      {/* accent seam */}
      <span
        className={`pointer-events-none absolute top-0 z-10 hidden h-full w-px bg-gradient-to-b from-transparent via-accent/40 to-transparent sm:block ${
          flip ? "right-[clamp(15rem,28%,17rem)]" : "left-[clamp(15rem,28%,17rem)]"
        }`}
        aria-hidden
      />

      {/* portrait — fixed column, never stretches the layout */}
      <div className="relative h-64 w-full flex-shrink-0 overflow-hidden sm:h-auto sm:w-60 md:w-64">
        <Image
          src={member.photo ?? "/brand/logo.png"}
          alt={member.name}
          fill
          sizes="(max-width:640px) 100vw, 256px"
          className="object-cover brightness-90 transition-all duration-500 group-hover:scale-[1.04] group-hover:brightness-110"
          style={{ objectPosition: member.objectPosition ?? "center 20%" }}
        />
        <span
          className={`absolute inset-0 bg-gradient-to-t from-ink-900/70 via-transparent to-transparent sm:bg-gradient-to-r ${
            flip ? "sm:from-transparent sm:to-ink-900/50" : "sm:from-transparent sm:to-ink-900/50"
          }`}
        />
      </div>

      {/* story */}
      <div className="flex flex-1 flex-col justify-center p-7 sm:p-9">
        <Quote className="h-8 w-8 flex-shrink-0 text-accent/40 transition-transform duration-300 group-hover:-translate-y-0.5" />
        <p className="mt-3 text-pretty leading-relaxed text-primary-foreground/90 transition-transform duration-300 group-hover:translate-x-0.5">
          {member.bio}
        </p>
        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-glow" />
            <div>
              <p className="font-bold text-accent">{member.name}</p>
              <p className="text-sm text-muted">{ROLE_OVERRIDE[member.id] ?? member.role}</p>
            </div>
          </div>
          {member.linkedin && (
            <a
              href={member.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${member.name} on LinkedIn`}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#0A66C2] text-white transition-transform hover:-translate-y-0.5"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export function CommunityStories() {
  const { data, status, error, reload } = useAsync(() => contentService.getTeam(), []);
  const stories = (data ?? [])
    .filter((m) => STORY_IDS.includes(m.id) && m.bio)
    .sort((a, b) => STORY_IDS.indexOf(a.id) - STORY_IDS.indexOf(b.id));

  return (
    <Section>
      <Container>
        <SectionHeading
          eyebrow="Voices"
          title="Built by people. Powered by community."
          description="The community grows because real people invest in it. Here's what drives a few of them."
        />

        <div className="mx-auto mt-14 max-w-4xl">
          <AsyncBoundary
            status={status}
            error={error}
            onRetry={reload}
            loading={
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-56 rounded-3xl" />
                ))}
              </div>
            }
            empty={<EmptyState title="Stories coming soon" />}
          >
            <div className="space-y-6">
              {stories.map((m, i) => (
                <StoryCard key={m.id} member={m} index={i} />
              ))}
            </div>
          </AsyncBoundary>
        </div>
      </Container>
    </Section>
  );
}
