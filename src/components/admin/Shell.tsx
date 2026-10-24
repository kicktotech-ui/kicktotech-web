"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  PanelLeftClose, PanelLeft, Search, Command, Bell, LogOut, Menu, X, ChevronRight, HelpCircle,
} from "lucide-react";
import { navGroups, flatNav, segmentLabels } from "./nav";
import { CommandPalette } from "./CommandPalette";
import { useAdminAuth } from "./AdminAuth";
import { useAdminTheme, ThemeSwitcher } from "./theme";
import { cn } from "@/lib/utils";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout } = useAdminAuth();
  const { resolved } = useAdminTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    if (pathname === href) return true;
    if (flatNav.some((item) => item.href === pathname)) return false;
    return pathname.startsWith(href + "/");
  };

  const crumbs = pathname.split("/").filter(Boolean);

  return (
    <div suppressHydrationWarning className={cn("ktt-admin flex min-h-screen bg-adm-bg text-adm-fg antialiased", resolved === "dark" && "dark")}>
      {/* Sidebar (desktop) */}
      <aside className={cn("sticky top-0 hidden h-screen flex-shrink-0 flex-col border-r border-adm-border bg-adm-surface transition-[width] duration-200 lg:flex", collapsed ? "w-[68px]" : "w-64")}>
        <SidebarInner collapsed={collapsed} isActive={isActive} />
        <button onClick={() => setCollapsed((c) => !c)} className="m-2 mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-adm-muted hover:bg-adm-surface2 hover:text-adm-fg" aria-label="Toggle sidebar">
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Collapse</>}
        </button>
      </aside>

      {/* Sidebar (mobile drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[110] lg:hidden">
          <div className="absolute inset-0 bg-[rgba(0,8,14,0.55)]" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-adm-border bg-adm-surface">
            <div className="flex items-center justify-between px-4 py-3">
              <Brand />
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu"><X className="h-5 w-5 text-adm-muted" /></button>
            </div>
            <SidebarInner collapsed={false} isActive={isActive} hideBrand />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-adm-border bg-adm-surface/90 px-4 backdrop-blur">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5 text-adm-muted" /></button>

          <nav className="hidden items-center gap-1.5 text-sm text-adm-muted sm:flex" aria-label="Breadcrumb">
            {crumbs.map((seg, i) => {
              const href = "/" + crumbs.slice(0, i + 1).join("/");
              const label = segmentLabels[seg] ?? decodeURIComponent(seg);
              const last = i === crumbs.length - 1;
              return (
                <span key={href} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-adm-muted/60" />}
                  {last ? <span className="font-semibold text-adm-fg">{label}</span> : <Link href={href} className="hover:text-adm-fg">{label}</Link>}
                </span>
              );
            })}
          </nav>

          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-adm-border bg-adm-surface2 px-3 text-sm text-adm-muted hover:text-adm-fg md:w-64"
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Search...</span>
            <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-adm-border bg-adm-surface px-1.5 py-0.5 text-[10px] font-medium md:inline-flex"><Command className="h-3 w-3" />K</kbd>
          </button>

          <ThemeSwitcher />

          <button className="relative rounded-lg p-2 text-adm-muted hover:bg-adm-surface2 hover:text-adm-fg" aria-label="Notifications" onClick={() => router.push("/admin/notifications")}>
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#dc2626]" />
          </button>
          <a href="https://kicktotech.in" target="_blank" rel="noreferrer" className="rounded-lg p-2 text-adm-muted hover:bg-adm-surface2 hover:text-adm-fg" aria-label="Help"><HelpCircle className="h-5 w-5" /></a>

          <div className="flex items-center gap-2 border-l border-adm-border pl-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: admin?.avatarColor ?? "#0057ff" }}>
              {admin?.name?.[0] ?? "A"}
            </span>
            <div className="hidden text-left leading-tight md:block">
              <p className="text-xs font-semibold text-adm-fg">{admin?.name}</p>
              <p className="text-[11px] text-adm-muted">{admin?.role.replace("_", " ")}</p>
            </div>
            <button onClick={() => { logout(); router.push("/admin/login"); }} className="ml-1 rounded-lg p-2 text-adm-muted hover:bg-red-500/10 hover:text-[#dc2626]" aria-label="Sign out"><LogOut className="h-4.5 w-4.5" /></button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      <Image src="/brand/logo.png" alt="Kick To Tech" width={34} height={34} priority className="h-[34px] w-[34px] flex-shrink-0 rounded-lg object-contain" />
      {!collapsed && (
        <span className="leading-tight">
          <span className="block text-sm font-black tracking-tight text-adm-fg">KICK TO TECH</span>
          <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#0057ff]">Admin Console</span>
        </span>
      )}
    </Link>
  );
}

function SidebarInner({ collapsed, isActive, hideBrand }: { collapsed: boolean; isActive: (h: string) => boolean; hideBrand?: boolean }) {
  return (
    <>
      {!hideBrand && <div className={cn("flex h-14 items-center border-b border-adm-border", collapsed ? "justify-center px-2" : "px-4")}><Brand collapsed={collapsed} /></div>}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-adm-muted">{group.label}</p>}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        collapsed && "justify-center px-0",
                        active ? "bg-adm-fg text-adm-bg" : "text-adm-muted hover:bg-adm-surface2 hover:text-adm-fg",
                      )}
                    >
                      <item.icon className={cn("h-4.5 w-4.5 flex-shrink-0", active ? "text-[#f5c400]" : "")} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
