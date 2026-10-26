import { AppError } from "../http";
import { readSession } from "./session";
import { hasPermission, isAdminRole, type Permission } from "../rbac";
import { getStore, type UserRecord, type AdminRole } from "../data";
import { unsign } from "../crypto";

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
 *  1. Bearer signed token in Authorization header
 *  2. Server session cookie (via readSession)
 *
 * Throws UNAUTHENTICATED (HTTP 401) if neither is valid.
 */
export async function requireAuthenticatedStudent(req: Request): Promise<AuthenticatedStudent> {
  const ctx = await readSession("student", req);
  if (!ctx || !ctx.user || ctx.user.status === "disabled") {
    throw new AppError("UNAUTHENTICATED", "You must be signed in to access this resource.");
  }
  return {
    id: ctx.user.id,
    email: ctx.user.email.toLowerCase().trim(),
    name: ctx.user.name,
    role: ctx.user.role,
  };
}

export async function requireStudent(req?: Request): Promise<UserRecord> {
  const ctx = await readSession("student", req);
  if (!ctx) throw new AppError("UNAUTHENTICATED", "You must be signed in.");
  return ctx.user;
}

export async function requireAdmin(permission?: Permission, req?: Request): Promise<{ user: UserRecord; role: AdminRole }> {
  const ctx = await readSession("admin", req);
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

