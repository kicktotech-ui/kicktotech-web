import { route, ok, parseJson } from "@/server/http";
import { hackathonApplicationSchema } from "@/server/validation";
import { submitHackathonApplication } from "@/server/hackathonApplications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public: create (or idempotently reuse) a Hack2Skill hackathon application
 * and return the manual UPI payment info (₹99). This does NOT take payment —
 * it records the application in PAYMENT_PENDING and hands back UPI + WhatsApp
 * details.
 */
export const POST = route(async (req, { requestId }) => {
  const input = await parseJson(req, hackathonApplicationSchema);
  const { application, duplicate, payment, whatsappUrl } = await submitHackathonApplication(input);
  return ok(
    {
      applicationId: application.applicationId,
      status: application.status,
      duplicate,
      payment,
      whatsappUrl,
    },
    { status: duplicate ? 200 : 201, requestId },
  );
});
