import { route, ok } from "@/server/http";
import { requireStudent } from "@/server/auth/guard";
import { publicUser } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req, { requestId }) => {
  const user = await requireStudent();
  return ok({ user: publicUser(user) }, { requestId });
});
