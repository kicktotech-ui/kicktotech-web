"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================================
   Toast — premium notification system for student-facing UI.
   No browser alert(). Animated, non-blocking, accessible.
   ========================================================================== */

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if used outside provider — no-op
    return { toast: () => {} };
  }
  return ctx;
}

let toastId = 0;

export function StudentToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, title: string, description?: string) => {
    const id = String(++toastId);
    setToasts((prev) => [...prev, { id, type, title, description }]);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const STYLES: Record<ToastType, string> = {
  success: "border-accent/30 bg-accent/10 text-accent",
  error: "border-red-400/30 bg-red-400/10 text-red-400",
  info: "border-blue-400/30 bg-blue-400/10 text-blue-400",
};

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const Icon = ICONS[t.type];
  return (
    <div
      role="alert"
      className={cn(
        "flex w-80 items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-xl",
        "animate-in slide-in-from-right-5 fade-in duration-300",
        STYLES[t.type],
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary-foreground">{t.title}</p>
        {t.description && <p className="mt-0.5 text-xs text-muted">{t.description}</p>}
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        className="flex-shrink-0 text-muted hover:text-primary-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
