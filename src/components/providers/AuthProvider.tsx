"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Profile } from "@/types";
import { createPermissions } from "@/services/permissions";

/* ============================================================================
   AuthProvider — Native Session & MongoDB Source of Truth.
   Replaces Firebase Auth with server-backed HTTP-only sessions.
   ========================================================================== */

export interface AuthShimUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  getIdToken: () => Promise<string>;
}

interface AuthContextValue {
  /** The student profile. */
  user: Profile | null;
  /** Backward-compatible shim for legacy components. */
  firebaseUser: AuthShimUser | null;
  /** True while initializing. */
  loading: boolean;
  /** Whether the user's email is verified. */
  emailVerified: boolean;
  /** Permissions (UX-only, not security). */
  permissions: ReturnType<typeof createPermissions>;
  /** Refresh current user profile. */
  refresh: () => Promise<void>;
  /** Sign out. */
  logout: () => Promise<void>;
  /** Manually set user. */
  setUser: (u: Profile | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/student/me");
      if (res.ok) {
        const body = await res.json();
        const u = body?.data?.user;
        if (u) {
          const profile: Profile = {
            uid: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            college: u.college,
            company: u.company,
            role: (u.role || "student") as Profile["role"],
            createdAt: u.createdAt || new Date().toISOString(),
            emailVerified: true,
          };
          setUser(profile);
          setEmailVerified(true);
          return;
        }
      }
      setUser(null);
      setEmailVerified(false);
    } catch (e) {
      console.warn("[auth] Error loading current user:", e);
      setUser(null);
      setEmailVerified(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const refresh = useCallback(async () => {
    await fetchCurrentUser();
  }, [fetchCurrentUser]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/v1/auth/student/logout", { method: "POST" });
    } catch (e) {
      console.warn("[auth] Logout error:", e);
    }
    setUser(null);
    setEmailVerified(false);
  }, []);

  const firebaseUser: AuthShimUser | null = useMemo(() => {
    if (!user) return null;
    return {
      uid: user.uid,
      email: user.email,
      emailVerified: true,
      getIdToken: async () => "",
    };
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      loading,
      emailVerified,
      permissions: createPermissions(user?.role),
      refresh,
      logout,
      setUser,
    }),
    [user, firebaseUser, loading, emailVerified, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
