import { route, ok } from "@/server/http";
import { readSession, publicUser } from "@/server/auth/session";
import { permissionsFor, isAdminRole } from "@/server/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req, { requestId }) => {
  const ctx = await readSession("admin");
  if (!ctx || ctx.user.type !== "admin" || !isAdminRole(ctx.user.role)) {
    return ok({ user: null, permissions: [] }, { requestId });
  }
  return ok({ user: publicUser(ctx.user), permissions: permissionsFor(ctx.user.role) }, { requestId });
});
