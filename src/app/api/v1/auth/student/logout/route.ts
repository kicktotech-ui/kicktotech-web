import { route, ok } from "@/server/http";
import { logout } from "@/server/auth/service";
import { readSession } from "@/server/auth/session";
import { clientIp } from "@/server/rateLimit";
import { config } from "@/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req, { requestId }) => {
  const actor = (await readSession("student", req))?.user.email;
  await logout("student", { actor, requestId, ip: clientIp(req) });
  const res = ok({ loggedOut: true }, { requestId });
  res.cookies.delete(config.cookies.student);
  return res;
});
