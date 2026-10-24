import { route, ok, parseJson } from "@/server/http";
import { studentRegisterSchema } from "@/server/validation";
import { registerStudent } from "@/server/auth/service";
import { rateLimit, clientIp } from "@/server/rateLimit";
import { config } from "@/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req, { requestId }) => {
  const ip = clientIp(req);
  rateLimit(`register:${ip}`);
  const input = await parseJson(req, studentRegisterSchema);
  const result = await registerStudent(input, { ip, requestId });
  const res = ok({ user: result, token: result.token }, { status: 201, requestId });

  res.cookies.set(config.cookies.student, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
    maxAge: config.sessionTtlHours * 3600,
  });

  return res;
});
