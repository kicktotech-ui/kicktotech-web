import Image from "next/image";
import { Linkedin } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Reusable leadership hero card — the shared design behind the Founder card.
 * Used for Mayur (hero, with badges + quote) and for Kaustubh / Kanchan
 * (compact, with a short description). Same navy/cyan styling, circular photo
 * treatment, name/role hierarchy, and "Connect on LinkedIn" button.
 */
export interface LeaderCardProps {
  name: string;
  role: string;
  photo: string;
  objectPosition?: string;
  linkedin?: string;
  /** Italic pull-quote (used for the founder). */
  quote?: string;
  /** Plain descriptive text (used for co-leaders). */
  description?: string;
  /** Optional credential badges (founder only). */
  badges?: string[];
  /** Compact variant for side-by-side grid placement. */
  compact?: boolean;
}

export function LeaderCard({
  name,
  role,
  photo,
  objectPosition = "center 20%",
  linkedin,
  quote,
  description,
  badges,
  compact = false,
}: LeaderCardProps) {
  return (
    <div
      className={cn(
        "relative h-full overflow-hidden rounded-[2.5rem] border border-line bg-gradient-to-br from-primary/20 to-transparent",
        compact ? "p-8 sm:p-10" : "p-8 sm:p-12 lg:p-16",
      )}
    >
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <div
        className={cn(
          "relative flex flex-col items-center gap-8",
          compact ? "text-center" : "sm:gap-10 lg:flex-row lg:gap-16",
        )}
      >
        <div className="flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-0 scale-110 rounded-full bg-gradient-to-tr from-accent to-electric opacity-30 blur-2xl" />
            <div
              className={cn(
                "relative overflow-hidden rounded-full border-4 border-white/10 shadow-lift",
                compact ? "h-40 w-40 sm:h-44 sm:w-44" : "h-48 w-48 sm:h-56 sm:w-56",
              )}
            >
              <Image
                src={photo}
                alt={`${name}, ${role} of Kick To Tech`}
                fill
                sizes="224px"
                className="object-cover"
                style={{ objectPosition }}
              />
            </div>
          </div>
        </div>
        <div className={cn(compact ? "text-center" : "text-center lg:text-left")}>
          {badges && badges.length > 0 && (
            <div className={cn("flex flex-wrap justify-center gap-2", !compact && "lg:justify-start")}>
              {badges.map((b, i) => (
                <Badge key={b} tone={i === 0 ? undefined : "neutral"}>
                  {b}
                </Badge>
              ))}
            </div>
          )}
          {quote && (
            <blockquote
              className={cn(
                "border-l-2 border-accent pl-5 text-2xl font-bold italic leading-tight text-primary-foreground/90 sm:text-3xl",
                badges && badges.length > 0 ? "mt-6" : "",
              )}
            >
              &ldquo;{quote}&rdquo;
            </blockquote>
          )}
          {description && (
            <p className="mx-auto mt-2 max-w-xl text-pretty leading-relaxed text-muted">{description}</p>
          )}
          <div className="mt-6">
            <h3 className="text-2xl font-bold text-accent">{name}</h3>
            <p className="text-muted">{role}</p>
            {linkedin && (
              <a
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0A66C2] px-5 py-2.5 font-semibold text-white transition-transform hover:-translate-y-0.5"
              >
                <Linkedin className="h-4 w-4" /> Connect on LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
