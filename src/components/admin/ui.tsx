"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* KICK TO TECH — Admin design system primitives (light, operational theme). */

// ---- Button ---------------------------------------------------------------

type Variant = "primary" | "secondary" | "danger" | "info" | "success" | "ghost";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-[#f5c400] text-black hover:bg-[#e6b800] border border-[#e0b400]",
  secondary: "bg-adm-surface text-adm-fg border border-adm-border hover:bg-adm-surface2",
  danger: "bg-[#dc2626] text-white hover:bg-[#c01f1f] border border-[#c01f1f]",
  info: "bg-[#0057ff] text-white hover:bg-[#0048d6] border border-[#0048d6]",
  success: "bg-[#16a34a] text-white hover:bg-[#128a3e] border border-[#128a3e]",
  ghost: "bg-transparent text-adm-muted hover:bg-adm-surface2 hover:text-adm-fg border border-transparent",
};
const SIZES: Record<Size, string> = { sm: "h-8 px-3 text-xs gap-1.5", md: "h-9.5 px-4 text-sm gap-2" };

interface BtnBase {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}
type ButtonProps = BtnBase & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkProps = BtnBase & { href: string };

export function Button(props: ButtonProps | LinkProps) {
  const { variant = "secondary", size = "md", className, children } = props;
  const classes = cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057ff]/40 disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTS[variant], size === "md" ? "h-9 px-4 text-sm gap-2" : SIZES.sm, className,
  );
  if ("href" in props && props.href) {
    return <Link href={props.href} className={classes}>{children}</Link>;
  }
  const { variant: _v, size: _s, className: _c, children: _ch, href: _h, ...rest } = props as ButtonProps & { href?: string };
  return <button className={classes} {...rest}>{children}</button>;
}

// ---- Card -----------------------------------------------------------------

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl border border-adm-border bg-adm-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)]", className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-adm-border px-5 py-4">
      <div>
        <h3 className="text-sm font-bold text-adm-fg">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-adm-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---- Badge ----------------------------------------------------------------

export type Tone = "neutral" | "blue" | "yellow" | "green" | "red" | "purple";
const TONES: Record<Tone, string> = {
  neutral: "bg-adm-surface2 text-adm-muted ring-adm-border",
  blue: "bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400",
  yellow: "bg-yellow-400/15 text-yellow-700 ring-yellow-500/25 dark:text-yellow-400",
  green: "bg-green-500/12 text-green-700 ring-green-500/25 dark:text-green-400",
  red: "bg-red-500/12 text-red-700 ring-red-500/25 dark:text-red-400",
  purple: "bg-purple-500/12 text-purple-700 ring-purple-500/25 dark:text-purple-400",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset", TONES[tone], className)}>
      {children}
    </span>
  );
}

/** Maps common statuses to a tone so badges stay consistent across the app. */
export function statusTone(status: string): Tone {
  const s = status.toUpperCase();
  if (["ACTIVE", "PAID", "APPROVED", "COMPLETED", "ISSUED", "PRESENT", "SUCCESS", "OPERATIONAL", "USED", "SENT", "GENERATED", "LIVE"].includes(s)) return "green";
  if (["PENDING", "UNDER_REVIEW", "PAYMENT_PENDING", "IN_PROGRESS", "LATE", "MOCK", "UPCOMING", "DRAFT", "ELIGIBLE", "SCHEDULED", "AVAILABLE"].includes(s)) return "yellow";
  if (["REJECTED", "FAILED", "CANCELLED", "REFUNDED", "ABSENT", "REVOKED", "EXPIRED", "URGENT", "NOT_CONNECTED"].includes(s)) return "red";
  if (["NEW", "APPLIED", "INFO", "DEV_MODE", "PAUSED"].includes(s)) return "blue";
  return "neutral";
}

// ---- Page header + section title ------------------------------------------

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-adm-fg sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-adm-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---- States ---------------------------------------------------------------

export function EmptyState({ title, description, icon, action }: { title: string; description?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-adm-border bg-adm-surface2/50 px-6 py-16 text-center">
      {icon && <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-adm-surface2 text-adm-muted">{icon}</div>}
      <h3 className="text-sm font-bold text-adm-fg">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-adm-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-adm-surface2", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4 animate-spin text-current", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ---- Form Controls --------------------------------------------------------

const inputBaseClasses = "w-full rounded-lg border border-adm-border bg-adm-surface2 px-3 text-sm text-adm-fg placeholder:text-adm-muted focus:border-[#0057ff] focus:outline-none focus:ring-1 focus:ring-[#0057ff]/50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-10", inputBaseClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("py-2.5 min-h-[80px]", inputBaseClasses, className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn("h-10 appearance-none pr-10", inputBaseClasses, className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-adm-muted" />
    </div>
  );
}

export function Field({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-adm-fg">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-red-500">{error}</span>}
    </label>
  );
}
