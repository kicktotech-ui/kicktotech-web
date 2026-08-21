import { route, ok } from "@/server/http";
import { requireAdmin } from "@/server/auth/guard";
import { publicUser } from "@/server/auth/session";
import { permissionsFor } from "@/server/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req, { requestId }) => {
  const { user, role } = await requireAdmin();
  return ok({ user: publicUser(user), permissions: permissionsFor(role) }, { requestId });
});
