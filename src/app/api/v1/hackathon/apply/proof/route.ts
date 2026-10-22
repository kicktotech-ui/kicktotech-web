import { route, ok, parseJson } from "@/server/http";
import { paymentProofSchema } from "@/server/validation";
import { submitHackathonPaymentProof } from "@/server/hackathonApplications";
import { requireAuthenticatedStudent } from "@/server/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Protected: The authenticated student submits proof of payment.
 *
 * This transitions the application to PAYMENT_PROOF_SUBMITTED. It does NOT
 * trigger the confirmation email — that is sent only after an admin verifies
 * the actual payment via the admin applications endpoint.
 *
 * Idempotent: duplicate clicks will not cause errors.
 */
export const POST = route(async (req, { requestId }) => {
  const authUser = await requireAuthenticatedStudent(req);
  const { applicationId } = await parseJson(req, paymentProofSchema);
  const { application } = await submitHackathonPaymentProof(applicationId, authUser.email);
  return ok(
    {
      applicationId: application.applicationId,
      status: application.status,
    },
    { requestId },
  );
});
