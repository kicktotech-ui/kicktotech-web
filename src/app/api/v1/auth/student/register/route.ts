import { route, ok, parseJson } from "@/server/http";
import { studentRegisterSchema } from "@/server/validation";
import { registerStudent } from "@/server/auth/service";
import { rateLimit, clientIp } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req, { requestId }) => {
  const ip = clientIp(req);
  rateLimit(`register:${ip}`);
  const input = await parseJson(req, studentRegisterSchema);
  const result = await registerStudent(input, { ip, requestId });
  return ok({ user: result, token: result.token }, { status: 201, requestId });
});
