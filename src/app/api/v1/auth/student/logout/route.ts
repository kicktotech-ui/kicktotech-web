import { route, ok } from "@/server/http";
import { logout } from "@/server/auth/service";
import { readSession } from "@/server/auth/session";
import { clientIp } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req, { requestId }) => {
  const actor = (await readSession("student"))?.user.email;
  await logout("student", { actor, requestId, ip: clientIp(req) });
  return ok({ loggedOut: true }, { requestId });
});
