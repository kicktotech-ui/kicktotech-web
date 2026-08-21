import type { AdminRole } from "./data";

/**
 * Server-authoritative RBAC. This is the real authorization source of truth —
 * never derived from email, request body, route, or any client-supplied value.
 */

export type Permission =
  | "users.read" | "users.create" | "users.update" | "users.delete"
  | "interns.read" | "interns.create" | "interns.update" | "interns.delete"
  | "applications.read" | "applications.update"
  | "certificates.read" | "certificates.issue" | "certificates.revoke"
  | "sessions.read" | "sessions.create" | "sessions.update"
  | "analytics.read"
  | "notifications.create" | "notifications.send"
  | "settings.manage"
  | "system.read";

const ALL: Permission[] = [
  "users.read", "users.create", "users.update", "users.delete",
  "interns.read", "interns.create", "interns.update", "interns.delete",
  "applications.read", "applications.update",
  "certificates.read", "certificates.issue", "certificates.revoke",
  "sessions.read", "sessions.create", "sessions.update",
  "analytics.read", "notifications.create", "notifications.send", "settings.manage",
  "system.read",
];

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((p) => p !== "users.delete" && p !== "settings.manage"),
  MANAGER: ["users.read", "interns.read", "interns.update", "applications.read", "applications.update", "certificates.read", "sessions.read", "sessions.create", "sessions.update", "analytics.read", "notifications.create"],
  MENTOR: ["interns.read", "sessions.read", "sessions.update"],
  FACULTY: ["interns.read", "sessions.read"],
  VIEWER: ["users.read", "interns.read", "applications.read", "certificates.read", "analytics.read", "system.read"],
};

export function permissionsFor(role: AdminRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return permissionsFor(role).includes(permission);
}

export const ADMIN_ROLES: AdminRole[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "MENTOR", "FACULTY", "VIEWER"];
export function isAdminRole(role: string): role is AdminRole {
  return (ADMIN_ROLES as string[]).includes(role);
}
