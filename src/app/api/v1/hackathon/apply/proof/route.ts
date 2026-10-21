import { route, ok, parseJson } from "@/server/http";
import { paymentProofSchema } from "@/server/validation";
import { submitPaymentProof } from "@/server/applications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public: the user confirms they've paid and will send proof via WhatsApp.
 * Reuses the same submitPaymentProof function as internship — the proof
 * submission is event-agnostic (it only needs the applicationId).
 */
export const POST = route(async (req, { requestId }) => {
  const { applicationId } = await parseJson(req, paymentProofSchema);
  const application = await submitPaymentProof(applicationId);
  return ok({ applicationId: application.applicationId, status: application.status }, { requestId });
});
