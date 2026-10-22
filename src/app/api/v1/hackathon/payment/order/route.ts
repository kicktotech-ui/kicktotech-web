import { route, ok, parseJson } from "@/server/http";
import { razorpayOrderCreateSchema } from "@/server/validation";
import { createHackathonPaymentOrder } from "@/server/hackathonApplications";
import { requireAuthenticatedStudent } from "@/server/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Protected: Create or retrieve a Razorpay Order for an existing Hack2Skill application.
 *
 * Enforces authenticated student session and validates ownership of the registration.
 * The amount (₹99 / 9900 paise) is strictly enforced on the server.
 */
export const POST = route(async (req, { requestId }) => {
  const authUser = await requireAuthenticatedStudent(req);
  const { applicationId } = await parseJson(req, razorpayOrderCreateSchema);

  const order = await createHackathonPaymentOrder(applicationId, authUser.email);

  return ok(order, { requestId });
});
