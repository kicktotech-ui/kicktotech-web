import { route, ok } from "@/server/http";
import { readSession, publicUser } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req, { requestId }) => {
  const ctx = await readSession("student");
  if (!ctx || !ctx.user || ctx.user.status !== "active") {
    return ok({ user: null }, { requestId });
  }
  return ok({ user: publicUser(ctx.user) }, { requestId });
});
