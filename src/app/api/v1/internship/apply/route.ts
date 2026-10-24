import { route, ok, parseJson, fail } from "@/server/http";
import { applicationSchema } from "@/server/validation";
import { submitApplication } from "@/server/applications";
import { isInternshipMaintenance } from "@/config/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public: create (or idempotently reuse) an internship application and return
 * the manual UPI payment info. This does NOT take payment — it only records the
 * application in PAYMENT_PENDING and hands back UPI + WhatsApp details.
 */
export const POST = route(async (req, { requestId }) => {
  if (isInternshipMaintenance()) {
    return fail(
      "MAINTENANCE_MODE",
      "Internship registrations are temporarily paused while our team is prioritizing the PromptWars Hackathon. Please visit /hackathon for our active event.",
      undefined,
      requestId,
    );
  }

  const input = await parseJson(req, applicationSchema);
  const { application, duplicate, payment, whatsappUrl } = await submitApplication(input);
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
