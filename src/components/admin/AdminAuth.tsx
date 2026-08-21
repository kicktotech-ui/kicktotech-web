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
    (async () => {
      const current = await authService.me();
      if (active) {
        setAdmin(current);
        setReady(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const login = async (email: string, password: string) => {
    const user = await authService.login(email, password);
    setAdmin(user);
  };
  const logout = () => {
    authService.logout();
    setAdmin(null);
  };
  const can = (permission: Permission) => (admin ? hasPermission(admin.role, permission) : false);

  return <AdminAuthContext.Provider value={{ admin, ready, login, logout, can }}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
