import { route, ok, parseJson } from "@/server/http";
import { hackathonApplicationSchema } from "@/server/validation";
import { submitHackathonApplication } from "@/server/hackathonApplications";
import { requireAuthenticatedStudent } from "@/server/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Protected: Create (or idempotently reuse) a PromptWars × KICK To TECH hackathon
 * application for the authenticated student, returning manual UPI payment info (₹99).
 *
 * Enforces session/token authentication. Never trusts client-supplied identity.
 */
export const POST = route(async (req, { requestId }) => {
  const authUser = await requireAuthenticatedStudent(req);
  const input = await parseJson(req, hackathonApplicationSchema);
  const { application, duplicate, payment, whatsappUrl } = await submitHackathonApplication(
    input,
    authUser.email,
  );
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
