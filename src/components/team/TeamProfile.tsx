"use client";

import Image from "next/image";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Linkedin } from "lucide-react";
import type { TeamMember } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { easePremium } from "@/lib/motion";

/** Slide-in profile drawer with the real portrait + full bio. */
export function TeamProfile({ member, onClose }: { member: TeamMember | null; onClose: () => void }) {
  useEffect(() => {
    if (!member) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [member, onClose]);

  return (
    <AnimatePresence>
      {member && (
        <motion.div
          className="fixed inset-0 z-[100] flex justify-end bg-ink-900/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${member.name} profile`}
        >
          <motion.aside
            className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-ink-800 shadow-lift"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: easePremium }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              aria-label="Close profile"
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink-900/70 text-white backdrop-blur hover:bg-ink-900"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative aspect-[4/3] w-full flex-shrink-0 overflow-hidden">
              {member.photo ? (
                <Image
                  src={member.photo}
                  alt={member.name}
                  fill
                  sizes="448px"
                  className="object-cover"
                  style={{ objectPosition: member.objectPosition ?? "center top" }}
                  priority
                />
              ) : (
                <Avatar name={member.name} size={9999} className="!h-full !w-full !rounded-none" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-800 to-transparent" />
            </div>

            <div className="flex-1 p-7">
              <h2 className="text-2xl font-bold">{member.name}</h2>
              <p className="mt-1 font-semibold text-accent">{member.role}</p>
              {member.bio && <p className="mt-5 leading-relaxed text-muted">{member.bio}</p>}

              {member.skills && member.skills.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {member.skills.map((s) => (
                    <span key={s} className="rounded-full border border-line bg-white/5 px-3 py-1 text-xs text-muted">{s}</span>
                  ))}
                </div>
              )}

              {member.linkedin && (
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0A66C2] px-5 py-2.5 font-semibold text-white transition-transform hover:-translate-y-0.5"
                >
                  <Linkedin className="h-4 w-4" /> Connect on LinkedIn
                </a>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
