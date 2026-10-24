"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, UserPlus, CalendarPlus, Award, Bell, Download, BarChart3, ArrowRight } from "lucide-react";
import { flatNav } from "./nav";
import { internService, certificateService } from "@/services/admin";
import { FEATURES } from "@/config/features";
import type { Intern, Certificate } from "@/lib/admin/types";
import { useAdminTheme } from "./theme";
import { cn } from "@/lib/utils";

interface Action { id: string; label: string; icon: typeof UserPlus; href: string }
const ACTIONS: Action[] = [
  { id: "a1", label: "Create intern", icon: UserPlus, href: "/admin/interns" },
  { id: "a2", label: "Schedule session", icon: CalendarPlus, href: "/admin/sessions" },
  { id: "a3", label: "Generate certificate", icon: Award, href: "/admin/certification" },
  { id: "a4", label: "Send notification", icon: Bell, href: "/admin/notifications" },
  { id: "a5", label: "Export interns", icon: Download, href: "/admin/interns" },
  { id: "a6", label: "Open analytics", icon: BarChart3, href: "/admin/analytics" },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { resolved } = useAdminTheme();
  const [q, setQ] = useState("");
  const [interns, setInterns] = useState<Intern[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  useEffect(() => { if (!open) setQ(""); }, [open]);

  useEffect(() => {
    if (!open || q.trim().length < 2) { setInterns([]); setCerts([]); return; }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const internPromise = FEATURES.internshipMaintenance
          ? Promise.resolve({ rows: [] as Intern[], total: 0, page: 1, pageSize: 4 })
          : internService.query({ search: q, pageSize: 4 });

        const [i, c] = await Promise.all([
          internPromise,
          certificateService.query({ search: q, pageSize: 3 }),
        ]);
        if (active) { setInterns(i.rows); setCerts(c.rows); }
      } catch {
        /* ignore fetch errors during unmount */
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q, open]);

  const pages = useMemo(() => flatNav.filter((p) => p.label.toLowerCase().includes(q.toLowerCase())).slice(0, 6), [q]);
  const actions = useMemo(() => ACTIONS.filter((a) => a.label.toLowerCase().includes(q.toLowerCase())).slice(0, 6), [q]);

  const go = (href: string) => { onClose(); router.push(href); };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={cn("ktt-admin fixed inset-0 z-[130] flex items-start justify-center p-4 pt-[12vh]", resolved === "dark" && "dark")} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="fixed inset-0 bg-[rgba(0,8,14,0.55)] backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-adm-border bg-adm-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-adm-border px-4">
          <Search className="h-4 w-4 text-adm-muted" />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search interns, certificates, pages, actions..."
            className="h-12 flex-1 bg-transparent text-sm text-adm-fg placeholder:text-adm-muted focus:outline-none"
          />
          <kbd className="rounded border border-adm-border bg-adm-surface2 px-1.5 py-0.5 text-[10px] font-medium text-adm-muted">ESC</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          <Group label="Actions">
            {actions.map((a) => (
              <Row key={a.id} onClick={() => go(a.href)}>
                <a.icon className="h-4 w-4 text-[#0057ff]" /> <span>{a.label}</span>
              </Row>
            ))}
          </Group>
          <Group label="Pages">
            {pages.map((p) => (
              <Row key={p.href} onClick={() => go(p.href)}>
                <p.icon className="h-4 w-4 text-adm-muted" /> <span>{p.label}</span>
              </Row>
            ))}
          </Group>
          {interns.length > 0 && (
            <Group label="Interns">
              {interns.map((i) => (
                <Row key={i.id} onClick={() => go(`/admin/interns/${i.id}`)}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: i.avatarColor }}>{i.name[0]}</span>
                  <span>{i.name}</span><span className="text-xs text-adm-muted">{i.internId}</span>
                </Row>
              ))}
            </Group>
          )}
          {certs.length > 0 && (
            <Group label="Certificates">
              {certs.map((c) => (
                <Row key={c.id} onClick={() => go("/admin/certificates")}>
                  <Award className="h-4 w-4 text-adm-muted" /> <span>{c.internName}</span>
                  <span className="text-xs text-adm-muted">{c.certificateId}</span>
                </Row>
              ))}
            </Group>
          )}
          {pages.length === 0 && actions.length === 0 && interns.length === 0 && certs.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-adm-muted">No results for &ldquo;{q}&rdquo;</p>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-adm-border bg-adm-surface2 px-4 py-2 text-[11px] text-adm-muted">
          <span className="inline-flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> to select</span>
          <span className="inline-flex items-center gap-1">Navigate <ArrowRight className="h-3 w-3" /></span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children];
  if (arr.filter(Boolean).length === 0) return null;
  return (
    <div className="mb-1">
      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-adm-muted">{label}</p>
      {children}
    </div>
  );
}

function Row({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-adm-fg hover:bg-adm-surface2")}>
      {children}
    </button>
  );
}
