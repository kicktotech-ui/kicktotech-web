import { route, ok, parseJson } from "@/server/http";
import { paymentProofSchema } from "@/server/validation";
import { submitHackathonPaymentProof } from "@/server/hackathonApplications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public: the student confirms they've paid and submits proof.
 *
 * This transitions the application to PAYMENT_PROOF_SUBMITTED. It does NOT
 * trigger the confirmation email — that is sent only after an admin verifies
 * the actual payment via the admin applications endpoint.
 *
 * Idempotent: duplicate clicks will not cause errors.
 */
export const POST = route(async (req, { requestId }) => {
  const { applicationId } = await parseJson(req, paymentProofSchema);
  const { application } = await submitHackathonPaymentProof(applicationId);
  return ok(
    {
      applicationId: application.applicationId,
      status: application.status,
    },
    { requestId },
  );
});
