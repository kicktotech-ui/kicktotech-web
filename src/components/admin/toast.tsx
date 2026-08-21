"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { useAdminTheme } from "./theme";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "warning" | "error" | "info";
interface Toast { id: number; kind: ToastKind; message: string }

interface ToastApi {
  success: (m: string) => void;
  warning: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS = {
  success: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  error: <XCircle className="h-4 w-4 text-red-600" />,
  info: <Info className="h-4 w-4 text-[#0057ff]" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { resolved } = useAdminTheme();

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const api: ToastApi = {
    success: (m) => push("success", m),
    warning: (m) => push("warning", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={cn("ktt-admin pointer-events-none fixed bottom-5 right-5 z-[120] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2", resolved === "dark" && "dark")}>
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "ktt-admin pointer-events-auto flex items-start gap-3 rounded-lg border bg-adm-surface px-4 py-3 shadow-lg",
              "animate-[fadeInUp_.2s_ease] border-adm-border",
            )}
          >
            <span className="mt-0.5">{ICONS[t.kind]}</span>
            <p className="flex-1 text-sm text-adm-fg">{t.message}</p>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-adm-muted hover:text-adm-fg" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
