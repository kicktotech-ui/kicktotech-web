"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authService } from "@/services/admin";
import type { AdminUser, Permission } from "@/lib/admin/types";
import { hasPermission } from "@/services/admin";

interface AuthState {
  admin: AdminUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (permission: Permission) => boolean;
}

const AdminAuthContext = createContext<AuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    // Fast-restore cached admin profile on refresh so user is never abruptly logged out
    let cachedAdmin: AdminUser | null = null;
    try {
      const stored = localStorage.getItem("ktt_admin_user");
      if (stored) cachedAdmin = JSON.parse(stored);
    } catch {}

    if (cachedAdmin) {
      setAdmin(cachedAdmin);
      setReady(true);
    }

    (async () => {
      const current = await authService.me();
      if (active) {
        if (current) {
          setAdmin(current);
          try { localStorage.setItem("ktt_admin_user", JSON.stringify(current)); } catch {}
          setReady(true);
        } else if (!cachedAdmin) {
          setAdmin(null);
          setReady(true);
        } else {
          // If server could not verify, check if token was explicitly wiped
          const token = typeof window !== "undefined" ? localStorage.getItem("ktt_admin_token") : null;
          if (!token) {
            setAdmin(null);
            try { localStorage.removeItem("ktt_admin_user"); } catch {}
          }
          setReady(true);
        }
      }
    })();
    return () => { active = false; };
  }, []);

  const login = async (email: string, password: string) => {
    const user = await authService.login(email, password);
    setAdmin(user);
    try { localStorage.setItem("ktt_admin_user", JSON.stringify(user)); } catch {}
  };
  const logout = () => {
    authService.logout();
    setAdmin(null);
    try {
      localStorage.removeItem("ktt_admin_user");
      localStorage.removeItem("ktt_admin_token");
    } catch {}
  };
  const can = (permission: Permission) => (admin ? hasPermission(admin.role, permission) : false);

  return <AdminAuthContext.Provider value={{ admin, ready, login, logout, can }}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
