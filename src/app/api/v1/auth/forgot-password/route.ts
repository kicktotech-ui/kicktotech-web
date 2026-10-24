import { route, ok, parseJson } from "@/server/http";
import { forgotPasswordSchema } from "@/server/validation";
import { getStore } from "@/server/data";
import { createPasswordResetToken } from "@/server/auth/service";
import { sendPasswordResetEmail } from "@/server/email/brevo";
import { rateLimit, clientIp } from "@/server/rateLimit";
import { getPublicBaseUrl } from "@/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public: Request a password reset email.
 *
 * Implements:
 * - Rate limiting (anti-abuse)
 * - User enumeration prevention (always returns a neutral success message)
 * - Cryptographically signed, single-use, 1-hour expiration token
 * - Branded transactional email dispatch via Brevo
 */
export const POST = route(async (req, { requestId }) => {
  const ip = clientIp(req);
  rateLimit(`forgot-pwd:${ip}`, 5, 300_000);

  const { email } = await parseJson(req, forgotPasswordSchema);
  const store = getStore();
  const user = await store.findUserByEmail(email);

  if (user && user.status === "active") {
    try {
      const token = createPasswordResetToken(user);
      const resetUrl = `${getPublicBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;

      const emailResult = await sendPasswordResetEmail({
        to: { email: user.email, name: user.name },
        resetUrl,
      });

      if (!emailResult.success) {
        console.warn(`[forgot-password] Email delivery warning for ${user.email}:`, emailResult.error);
      }
    } catch (err) {
      console.error(`[forgot-password] Failed to dispatch reset email for ${user.email}:`, err);
    }
  }

  // Consistent message to prevent email enumeration
  return ok(
    {
      message: "If an account with this email exists, password reset instructions have been sent to your inbox.",
    },
    { requestId },
  );
});
