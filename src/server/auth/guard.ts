import { AppError } from "../http";
import { readSession } from "./session";
import { hasPermission, isAdminRole, type Permission } from "../rbac";
import type { UserRecord, AdminRole } from "../data";

/**
 * Authorization guards. Enforced entirely server-side from the authenticated
 * session — never from email, route, or client-supplied role. Async because the
 * session/user now come from the (Firestore-capable) DataStore.
 */

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
