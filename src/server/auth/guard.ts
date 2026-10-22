import { AppError } from "../http";
import { readSession } from "./session";
import { hasPermission, isAdminRole, type Permission } from "../rbac";
import type { UserRecord, AdminRole } from "../data";
import { getAdminAuth, isAdminConfigured } from "../firebase/admin";

/**
 * Authorization guards. Enforced entirely server-side from the authenticated
 * session — never from email, route, or client-supplied role.
 */

export interface AuthenticatedStudent {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

/**
 * Validates the authenticated student session for protected student endpoints.
 *
 * Checks:
 *  1. Bearer token in Authorization header (verified via Firebase Admin SDK)
 *  2. Server session cookie (via readSession)
 *
 * Throws UNAUTHENTICATED (HTTP 401) if neither is valid.
 */
export async function requireAuthenticatedStudent(req: Request): Promise<AuthenticatedStudent> {
  // 1. Check Firebase ID Token from Authorization header
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const idToken = authHeader.substring(7).trim();
    if (idToken && isAdminConfigured()) {
      try {
        const adminAuth = await getAdminAuth();
        const decoded = await adminAuth.verifyIdToken(idToken);
        if (decoded && decoded.email) {
          return {
            id: decoded.uid,
            email: decoded.email.toLowerCase().trim(),
            name: (decoded.name as string) || undefined,
          };
        }
      } catch (err) {
        console.warn("[guard] Firebase ID token verification failed:", err);
      }
    }
  }

  // 2. Check server-side session cookie
  try {
    const ctx = await readSession("student");
    if (ctx?.user && ctx.user.status === "active") {
      return {
        id: ctx.user.id,
        email: ctx.user.email.toLowerCase().trim(),
        name: ctx.user.name,
        role: ctx.user.role,
      };
    }
  } catch (err) {
    console.warn("[guard] Server session verification failed:", err);
  }

  // Neither passed
  throw new AppError("UNAUTHENTICATED", "You must be signed in to access this resource.");
}

export async function requireStudent(): Promise<UserRecord> {
  const ctx = await readSession("student");
  if (!ctx) throw new AppError("UNAUTHENTICATED", "You must be signed in.");
  return ctx.user;
}

export async function requireAdmin(permission?: Permission): Promise<{ user: UserRecord; role: AdminRole }> {
  const ctx = await readSession("admin");
  if (!ctx) throw new AppError("UNAUTHENTICATED", "Admin authentication required.");
  if (ctx.user.type !== "admin" || !isAdminRole(ctx.user.role)) {
    throw new AppError("FORBIDDEN", "You do not have administrator access.");
  }
  const role = ctx.user.role;
  if (permission && !hasPermission(role, permission)) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action.");
  }
  return { user: ctx.user, role };
}

