"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./ui";
import { useAdminTheme } from "./theme";
import { cn } from "@/lib/utils";

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
}

/** Wraps portaled overlay content so the admin theme tokens resolve on body. */
function Portal({ children }: { children: ReactNode }) {
  const { resolved } = useAdminTheme();
  if (typeof document === "undefined") return null;
  return createPortal(<div className={cn("ktt-admin", resolved === "dark" && "dark")}>{children}</div>, document.body);
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-[100] bg-[rgba(0,8,14,0.55)] backdrop-blur-[2px]" onClick={onClose} aria-hidden />;
}

export function Modal({ open, onClose, title, children, footer, size = "md" }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg";
}) {
  useEscape(open, onClose);
  if (!open) return null;
  const width = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-2xl" : "max-w-lg";
  return (
    <Portal>
      <Backdrop onClose={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
        <div className={cn("w-full overflow-hidden rounded-xl border border-adm-border bg-adm-surface shadow-2xl", width)}>
          <div className="flex items-center justify-between border-b border-adm-border px-5 py-4">
            <h2 className="text-sm font-bold text-adm-fg">{title}</h2>
            <button onClick={onClose} className="text-adm-muted hover:text-adm-fg" aria-label="Close"><X className="h-4.5 w-4.5" /></button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-5 py-5 text-adm-fg">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-adm-border bg-adm-surface2 px-5 py-3">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

export function Drawer({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <Portal>
      <Backdrop onClose={onClose} />
      <div className="fixed right-0 top-0 z-[101] flex h-full w-full max-w-md flex-col border-l border-adm-border bg-adm-surface shadow-2xl" role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-center justify-between border-b border-adm-border px-5 py-4">
          <h2 className="text-sm font-bold text-adm-fg">{title}</h2>
          <button onClick={onClose} className="text-adm-muted hover:text-adm-fg" aria-label="Close"><X className="h-4.5 w-4.5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 text-adm-fg">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-adm-border bg-adm-surface2 px-5 py-3">{footer}</div>}
      </div>
    </Portal>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", danger }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel?: string; danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
      </>}>
      <p className="text-sm text-adm-muted">{message}</p>
    </Modal>
  );
}
