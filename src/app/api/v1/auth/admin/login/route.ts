import { route, ok, parseJson } from "@/server/http";
import { loginSchema } from "@/server/validation";
import { loginAdmin } from "@/server/auth/service";
import { rateLimit, clientIp } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req, { requestId }) => {
  const ip = clientIp(req);
  rateLimit(`admin-login:${ip}`);
  const input = await parseJson(req, loginSchema);
  const user = await loginAdmin(input, { ip, requestId });
  return ok({ user }, { requestId });
});
