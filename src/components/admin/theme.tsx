"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Sun, Moon, Monitor, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ThemePref = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "ktt-admin-theme";

interface ThemeApi {
  theme: ThemePref;
  resolved: ResolvedTheme;
  setTheme: (t: ThemePref) => void;
}

const ThemeContext = createContext<ThemeApi | null>(null);

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<ThemePref>("system");
  const [systemDark, setSystemDark] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemeState(saved);
      }
    } catch {
      // storage unavailable
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const resolved: ResolvedTheme = !mounted ? "light" : theme === "system" ? (systemDark ? "dark" : "light") : theme;

  const setTheme = useCallback((t: ThemePref) => {
    setThemeState(t);
    try { window.localStorage.setItem(STORAGE_KEY, t); } catch { /* storage unavailable */ }
  }, []);

  const api = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}

export function useAdminTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAdminTheme must be used within AdminThemeProvider");
  return ctx;
}

const OPTIONS: { value: ThemePref; label: string; hint: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", hint: "Always light", icon: Sun },
  { value: "dark", label: "Dark", hint: "Always dark", icon: Moon },
  { value: "system", label: "System", hint: "Match your OS", icon: Monitor },
];

/**
 * Appearance control — a compact popover with Light / Dark / System options,
 * the current choice highlighted. Keyboard + screen-reader friendly, closes on
 * outside click / Escape.
 */
export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, resolved, setTheme } = useAdminTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const CurrentIcon = theme === "system" ? Monitor : resolved === "dark" ? Moon : Sun;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Appearance"
        className="flex h-9 items-center gap-1.5 rounded-lg border border-adm-border bg-adm-surface2 px-2.5 text-adm-muted transition-colors hover:text-adm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057ff]/40"
      >
        <CurrentIcon className="h-4 w-4" />
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div role="menu" aria-label="Appearance" className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-adm-border bg-adm-surface p-1.5 shadow-xl">
          <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-adm-muted">Appearance</p>
          {OPTIONS.map((o) => {
            const active = theme === o.value;
            return (
              <button
                key={o.value}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => { setTheme(o.value); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  active ? "bg-adm-surface2 text-adm-fg" : "text-adm-muted hover:bg-adm-surface2 hover:text-adm-fg",
                )}
              >
                <o.icon className={cn("h-4 w-4", active && "text-[#f5c400]")} />
                <span className="flex-1">
                  <span className="block font-medium text-adm-fg">{o.label}</span>
                  <span className="block text-[11px] text-adm-muted">{o.hint}</span>
                </span>
                {active && <Check className="h-4 w-4 text-[#f5c400]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
