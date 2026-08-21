import { route, ok, parseJson } from "@/server/http";
import { loginSchema } from "@/server/validation";
import { loginStudent } from "@/server/auth/service";
import { rateLimit, clientIp } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req, { requestId }) => {
  const ip = clientIp(req);
  rateLimit(`login:${ip}`);
  const input = await parseJson(req, loginSchema);
  const user = await loginStudent(input, { ip, requestId });
  return ok({ user }, { requestId });
});
