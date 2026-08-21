"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Search, ChevronDown, Check, UserRound } from "lucide-react";
import { listMentors, getMentorById, type MentorRecord } from "@/lib/certificates/mentors";
import { cn } from "@/lib/utils";

function Avatar({ mentor, size = 32 }: { mentor: MentorRecord; size?: number }) {
  return mentor.photo ? (
    <Image src={mentor.photo} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex items-center justify-center rounded-full bg-adm-surface2 text-adm-muted" style={{ width: size, height: size }}><UserRound className="h-4 w-4" /></span>
  );
}

/**
 * Polished, searchable mentor selector. Avatar + name + role, keyboard
 * navigable, themed for light/dark. Emits the mentor id via onChange.
 */
export function MentorSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const mentors = useMemo(() => listMentors(), []);
  const selected = getMentorById(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mentors;
    return mentors.filter((m) => [m.name, m.designation, m.domain].some((v) => v.toLowerCase().includes(q)));
  }, [mentors, query]);

  useEffect(() => {
    if (!open) return;
    setQuery(""); setActive(0);
    const t = setTimeout(() => searchRef.current?.focus(), 20);
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", onDown); };
  }, [open]);

  function pick(id: string) { onChange(id); setOpen(false); }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); const m = results[active]; if (m) pick(m.id); }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-lg border border-adm-border bg-adm-surface px-3 py-2 text-left transition-colors hover:border-[#0057ff]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057ff]/30"
      >
        {selected ? <Avatar mentor={selected} /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-adm-surface2 text-adm-muted"><UserRound className="h-4 w-4" /></span>}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-adm-fg">{selected?.name ?? "Select a mentor"}</span>
          <span className="block truncate text-xs text-adm-muted">{selected?.designation ?? "No mentor selected"}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 flex-shrink-0 text-adm-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-adm-border bg-adm-surface shadow-xl" onKeyDown={onKeyDown}>
          <div className="flex items-center gap-2 border-b border-adm-border px-3">
            <Search className="h-4 w-4 text-adm-muted" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              placeholder="Search mentors..."
              className="h-10 flex-1 bg-transparent text-sm text-adm-fg placeholder:text-adm-muted focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto p-1.5">
            {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-adm-muted">No mentors match &ldquo;{query}&rdquo;</li>}
            {results.map((m, i) => {
              const isSel = m.id === value;
              return (
                <li key={m.id} role="option" aria-selected={isSel}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(m.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                      i === active ? "bg-adm-surface2" : "",
                    )}
                  >
                    <Avatar mentor={m} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-adm-fg">{m.name}</span>
                      <span className="block truncate text-xs text-adm-muted">{m.designation}</span>
                    </span>
                    {isSel && <Check className="h-4 w-4 flex-shrink-0 text-[#f5c400]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
