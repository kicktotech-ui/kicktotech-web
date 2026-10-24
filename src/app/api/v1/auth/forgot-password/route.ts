import { route, ok, parseJson, fail } from "@/server/http";
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
 */
export const POST = route(async (req, { requestId }) => {
  const ip = clientIp(req);
  rateLimit(`forgot-pwd:${ip}`, 5, 300_000);

  const { email } = await parseJson(req, forgotPasswordSchema);
  const store = getStore();
  const user = await store.findUserByEmail(email);

  if (!user) {
    return fail("NOT_FOUND", "No account found with this email address. Please check your spelling or register an account.");
  }

  if (user.status !== "active") {
    return fail("FORBIDDEN", "This account is currently disabled. Please contact support at contact@kicktotech.in.");
  }

  let emailResult;
  try {
    const token = createPasswordResetToken(user);
    const resetUrl = `${getPublicBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;

    emailResult = await sendPasswordResetEmail({
      to: { email: user.email, name: user.name },
      resetUrl,
    });
  } catch (err) {
    console.error(`[forgot-password] Error dispatching reset email for ${user.email}:`, err);
    return fail("SERVER_ERROR", "Could not dispatch password reset email. Please try again shortly.");
  }

  if (!emailResult.success) {
    console.error(`[forgot-password] Email delivery failure for ${user.email}:`, emailResult.error);
    return fail("SERVER_ERROR", emailResult.error || "Failed to send reset email. Please try again shortly.");
  }

  return ok(
    {
      message: `Password reset instructions have been sent to ${user.email}. Please check your inbox and spam folder.`,
    },
    { requestId },
  );
});
