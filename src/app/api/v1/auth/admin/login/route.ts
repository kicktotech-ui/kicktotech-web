import { route, ok, parseJson } from "@/server/http";
import { loginSchema } from "@/server/validation";
import { loginAdmin } from "@/server/auth/service";
import { rateLimit, clientIp } from "@/server/rateLimit";
import { config } from "@/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req, { requestId }) => {
  const ip = clientIp(req);
  rateLimit(`admin-login:${ip}`);
  const input = await parseJson(req, loginSchema);
  const result = await loginAdmin(input, { ip, requestId });
  const res = ok({ user: result, token: result.token }, { requestId });

  res.cookies.set(config.cookies.admin, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
    maxAge: config.sessionTtlHours * 3600,
  });

  return res;
});
