import { route, ok, parseJson } from "@/server/http";
import { razorpayPaymentVerifySchema } from "@/server/validation";
import { verifyHackathonPayment } from "@/server/hackathonApplications";
import { requireAuthenticatedStudent } from "@/server/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Protected: Server-side payment verification for Razorpay Checkout.
 *
 * Checks:
 * - Validates cryptographic HMAC-SHA256 signature against RAZORPAY_KEY_SECRET.
 * - Confirms order ID matches the registration.
 * - Validates amount and currency with Razorpay API.
 * - Transitions application to PAYMENT_VERIFIED.
 * - Triggers Brevo Template ID 5 confirmation email (with duplicate guard).
 */
export const POST = route(async (req, { requestId }) => {
  const authUser = await requireAuthenticatedStudent(req);
  const input = await parseJson(req, razorpayPaymentVerifySchema);

  const result = await verifyHackathonPayment(input, authUser.email);

  return ok(
    {
      applicationId: result.application.applicationId,
      status: result.application.status,
      verified: result.verified,
      duplicate: result.duplicate,
    },
    { requestId },
  );
});
