import { route, ok, parseJson } from "@/server/http";
import { paymentProofSchema } from "@/server/validation";
import { submitHackathonPaymentProof } from "@/server/hackathonApplications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public: the student confirms they've paid and submits proof.
 *
 * For Hack2Skill registrations this also triggers the confirmation email
 * (Brevo template #5) immediately — the student does not need to wait for
 * admin payment verification to receive Hack2Skill registration instructions.
 *
 * Idempotent: duplicate clicks will not send duplicate emails (guarded by
 * confirmationEmailSentAt on the application record).
 */
export const POST = route(async (req, { requestId }) => {
  const { applicationId } = await parseJson(req, paymentProofSchema);
  const { application, emailSent, emailAlreadySent } = await submitHackathonPaymentProof(applicationId);
  return ok(
    {
      applicationId: application.applicationId,
      status: application.status,
      emailSent,
      emailAlreadySent,
    },
    { requestId },
  );
});
