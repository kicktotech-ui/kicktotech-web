import { route, ok } from "@/server/http";
import { logout } from "@/server/auth/service";
import { readSession } from "@/server/auth/session";
import { clientIp } from "@/server/rateLimit";
import { config } from "@/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req, { requestId }) => {
  const actor = (await readSession("admin", req))?.user.email;
  await logout("admin", { actor, requestId, ip: clientIp(req) }, req);
  const res = ok({ loggedOut: true }, { requestId });
  res.cookies.delete(config.cookies.admin);
  return res;
});
