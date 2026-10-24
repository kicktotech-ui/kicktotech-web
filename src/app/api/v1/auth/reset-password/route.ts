import { route, ok, parseJson } from "@/server/http";
import { resetPasswordSchema } from "@/server/validation";
import { resetPasswordWithToken } from "@/server/auth/service";
import { rateLimit, clientIp } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public: Reset password using an unexpired, signed reset token.
 *
 * Implements:
 * - Rate limiting (anti-abuse)
 * - Cryptographic signature & expiration verification
 * - Replay prevention (token invalidated as soon as password changes)
 * - PBKDF2-SHA512 password hashing with fresh random salt
 */
export const POST = route(async (req, { requestId }) => {
  const ip = clientIp(req);
  rateLimit(`reset-pwd:${ip}`, 10, 300_000);

  const { token, password } = await parseJson(req, resetPasswordSchema);
  await resetPasswordWithToken(token, password, { ip, requestId });

  return ok(
    {
      message: "Your password has been successfully updated. You can now log in with your new password.",
    },
    { requestId },
  );
});
