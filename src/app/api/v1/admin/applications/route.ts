import { route, ok, parseJson } from "@/server/http";
import { requireAdmin } from "@/server/auth/guard";
import { applicationDecisionSchema } from "@/server/validation";
import { listApplications, verifyPayment, rejectPayment } from "@/server/applications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List internship applications (manual-payment gate) with pagination + filter. */
export const GET = route(async (req, { requestId }) => {
  await requireAdmin("applications.read");
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
  const status = url.searchParams.get("status") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize") ?? 10)));

  let rows = await listApplications();
  if (type === "internship") {
    rows = rows.filter((r) => r.domain !== "hack2skill" && r.amount !== 99);
  } else if (type === "hackathon") {
    rows = rows.filter((r) => r.domain === "hack2skill" || r.amount === 99);
  }
  if (status) rows = rows.filter((r) => r.status === status);
  if (search) {
    rows = rows.filter((r) =>
      [
        r.name,
        r.email,
        r.phone,
        r.applicationId,
        r.college ?? "",
        r.teamName ?? "",
        r.schoolName ?? "",
        r.course ?? "",
        r.year ?? "",
        r.razorpayOrderId ?? "",
        r.razorpayPaymentId ?? "",
      ].some((v) => v.toLowerCase().includes(search)),
    );
  }
  const total = rows.length;
  const start = (page - 1) * pageSize;
  return ok({ rows: rows.slice(start, start + pageSize), total, page, pageSize }, { requestId });
});

/** Admin payment decision: verify or reject (manual). Backend-authoritative. */
export const PATCH = route(async (req, { requestId }) => {
  const { user } = await requireAdmin("applications.update");
  const { applicationId, action, reason } = await parseJson(req, applicationDecisionSchema);
  const application = action === "verify"
    ? await verifyPayment(applicationId, { actor: user.email, requestId })
    : await rejectPayment(applicationId, reason, { actor: user.email, requestId });
  return ok({ application }, { requestId });
});
