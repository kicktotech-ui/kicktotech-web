import { Brain, Coffee, ShieldCheck, BarChart3, type LucideIcon } from "lucide-react";
import type { InternshipDomain } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Brain,
  Coffee,
  ShieldCheck,
  BarChart3,
};

export function DomainCard({
  domain,
  selected,
  onSelect,
}: {
  domain: InternshipDomain;
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const Icon = ICONS[domain.icon] ?? Brain;
  const interactive = Boolean(onSelect);

  const content = (
    <>
      <div
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${domain.accent}1a`, color: domain.accent }}
      >
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-bold">{domain.title}</h3>
      <p className="mt-1 text-sm text-accent/90">{domain.tagline}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted">{domain.description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {domain.skills.map((s) => (
          <span key={s} className="rounded-full border border-line bg-white/5 px-2.5 py-1 text-xs text-muted">
            {s}
          </span>
        ))}
      </div>
      {domain.mentor && (
        <div className="mt-auto flex items-center gap-2.5 border-t border-line pt-4">
          <Avatar name={domain.mentor} src={domain.mentorImage} size={32} rounded="full" />
          <span className="text-xs text-muted">
            Mentor · <span className="text-primary-foreground/80">{domain.mentor}</span>
          </span>
        </div>
      )}
    </>
  );

  const base = cn(
    "flex h-full flex-col rounded-3xl border bg-surface p-7 text-left transition-all duration-300",
    selected ? "border-accent shadow-glow" : "border-line",
    interactive && "hover:-translate-y-1.5 hover:border-accent/50",
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={() => onSelect?.(domain.id)}
        aria-pressed={selected}
        className={cn(base, "w-full focus-visible:ring-2 focus-visible:ring-accent")}
      >
        {content}
      </button>
    );
  }

  return <div className={base}>{content}</div>;
}
