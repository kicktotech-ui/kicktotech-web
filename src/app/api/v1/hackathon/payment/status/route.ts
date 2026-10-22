import { route, ok, AppError } from "@/server/http";
import { getHackathonPaymentStatus } from "@/server/hackathonApplications";
import { requireAuthenticatedStudent } from "@/server/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Protected: Retrieve authoritative payment status for a hackathon registration.
 * Allows client recovery and polling if the browser connection drops during Checkout.
 */
export const GET = route(async (req, { requestId }) => {
  const authUser = await requireAuthenticatedStudent(req);
  const url = new URL(req.url);
  const applicationId = url.searchParams.get("applicationId")?.trim();

  if (!applicationId) {
    throw new AppError("VALIDATION_ERROR", "Missing required query parameter: applicationId.");
  }

  const status = await getHackathonPaymentStatus(applicationId, authUser.email);

  return ok(status, { requestId });
});
