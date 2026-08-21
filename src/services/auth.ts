import type { AuthResult, Profile, Result, Role } from "@/types";
import { api, ApiError } from "@/lib/api";

/**
 * Student AuthService — the ONLY boundary the public UI talks to for auth.
 *
 * Now backed by the REAL backend (/api/v1/auth/student/*) using HTTP-only
 * cookie sessions. No passwords or tokens are stored client-side. The public
 * `AuthService` interface is unchanged, so AuthProvider / LoginView / SignupView
 * did not need to change.
 */
export interface AuthService {
  login(email: string, password: string): Promise<AuthResult>;
  signup(input: SignupInput): Promise<AuthResult>;
  logout(): Promise<void>;
  requestPasswordReset(email: string): Promise<Result<null>>;
  getCurrentUser(): Promise<Profile | null>;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: Extract<Role, "student" | "company">;
  college?: string;
  company?: string;
}

interface ApiUser {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone?: string;
  college?: string;
  company?: string;
  createdAt: string;
}

function toProfile(u: ApiUser): Profile {
  return {
    uid: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    college: u.college,
    company: u.company,
    createdAt: u.createdAt,
  };
}

const realAuthService: AuthService = {
  async login(email, password) {
    try {
      const { user } = await api.post<{ user: ApiUser }>("/auth/student/login", { email, password });
      return { user: toProfile(user) };
    } catch (e) {
      return { user: null, error: e instanceof ApiError ? e.message : "Login failed. Please try again." };
    }
  },

  async signup(input) {
    try {
      const { user } = await api.post<{ user: ApiUser }>("/auth/student/register", input);
      return { user: toProfile(user) };
    } catch (e) {
      return { user: null, error: e instanceof ApiError ? e.message : "Could not create account." };
    }
  },

  async logout() {
    try {
      await api.post("/auth/student/logout");
    } catch {
      /* best-effort; cookie is cleared server-side */
    }
  },

  async requestPasswordReset(email) {
    if (!email) return { ok: false, error: "Please enter your email." };
    // Backend endpoint arrives in a later phase; respond safely for now.
    return { ok: true, data: null };
  },

  async getCurrentUser() {
    try {
      const { user } = await api.get<{ user: ApiUser }>("/auth/student/me");
      return toProfile(user);
    } catch {
      return null; // 401 → not signed in
    }
  },
};

export const authService: AuthService = realAuthService;
