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
import type { User as FirebaseUser } from "firebase/auth";
import type { Profile } from "@/types";
import {
  firebaseOnAuthStateChanged,
  firebaseLogout,
  firebaseRefreshUser,
} from "@/lib/firebase/firebaseAuth";
import { getStudentProfile, updateStudentProfile } from "@/lib/firebase/firestore";
import { createPermissions } from "@/services/permissions";

/* ============================================================================
   AuthProvider — Firebase Auth is the SOLE source of truth.

   Uses onAuthStateChanged() to track the real Firebase user. Loads the
   student's Firestore profile on auth. Exposes emailVerified status so
   routes can gate on verification. No localStorage auth. No fake users.
   ========================================================================== */

interface AuthContextValue {
  /** The merged student profile (Firestore data + Firebase state). */
  user: Profile | null;
  /** The raw Firebase Auth user object. */
  firebaseUser: FirebaseUser | null;
  /** True while Firebase is initializing or loading profile. */
  loading: boolean;
  /** Whether the Firebase user's email is verified. */
  emailVerified: boolean;
  /** Permissions (UX-only, not security). */
  permissions: ReturnType<typeof createPermissions>;
  /** Refresh the Firebase user and reload profile. */
  refresh: () => Promise<void>;
  /** Sign out. */
  logout: () => Promise<void>;
  /** Manually set user (for immediate state after signup/login). */
  setUser: (u: Profile | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * App-wide auth context backed by REAL Firebase Authentication.
 *
 * Auth state flow:
 *  1. onAuthStateChanged fires → we get FirebaseUser or null
 *  2. If user exists → load Firestore profile from students/{uid}
 *  3. Check emailVerified from Firebase Auth (source of truth)
 *  4. Expose merged Profile to the app
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  // Load Firestore profile for a Firebase user
  const loadProfile = useCallback(async (fbUser: FirebaseUser) => {
    try {
      const profile = await getStudentProfile(fbUser.uid);
      if (profile) {
        setUser({
          uid: fbUser.uid,
          name: profile.fullName,
          email: profile.email,
          phone: profile.phone,
          role: profile.role as Profile["role"],
          college: profile.college ?? undefined,
          company: profile.company ?? undefined,
          createdAt: typeof profile.createdAt === "string"
            ? profile.createdAt
            : new Date().toISOString(),
          emailVerified: fbUser.emailVerified,
        });

        // Trigger welcome-email endpoint if not yet successfully sent.
        // Server-side concurrency protection prevents duplicate sends.
        // Legacy profiles without welcomeEmailStatus are treated as "pending".
        if (fbUser.emailVerified && profile.welcomeEmailStatus !== "sent") {
          try {
            const token = await fbUser.getIdToken(true);
            await fetch("/api/v1/auth/student/welcome", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`
              }
            });
          } catch (e) {
            console.error("Failed to sync verification state via welcome endpoint:", e);
          }
        }
      } else {
        // Firebase user exists but no Firestore profile yet (edge case)
        // Create a minimal profile from Firebase Auth data
        setUser({
          uid: fbUser.uid,
          name: fbUser.displayName ?? "Student",
          email: fbUser.email ?? "",
          role: "student",
          createdAt: new Date().toISOString(),
          emailVerified: fbUser.emailVerified,
        });
      }
      setEmailVerified(fbUser.emailVerified);
    } catch (e) {
      console.error("Failed to load student profile:", e);
      // Still set the user from Firebase Auth data
      setUser({
        uid: fbUser.uid,
        name: fbUser.displayName ?? "Student",
        email: fbUser.email ?? "",
        role: "student",
        createdAt: new Date().toISOString(),
        emailVerified: fbUser.emailVerified,
      });
      setEmailVerified(fbUser.emailVerified);
    }
  }, []);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = firebaseOnAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await loadProfile(fbUser);
      } else {
        setUser(null);
        setEmailVerified(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [loadProfile]);

  // Refresh: reload Firebase user + re-read profile
  const refresh = useCallback(async () => {
    if (!firebaseUser) return;
    const { user: refreshed } = await firebaseRefreshUser();
    if (refreshed) {
      setFirebaseUser(refreshed);
      setEmailVerified(refreshed.emailVerified);
      await loadProfile(refreshed);
    }
  }, [firebaseUser, loadProfile]);

  // Logout: sign out of Firebase
  const logout = useCallback(async () => {
    await firebaseLogout();
    setUser(null);
    setFirebaseUser(null);
    setEmailVerified(false);
  }, []);

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
