import { route, ok, parseJson } from "@/server/http";
import { requireAdmin } from "@/server/auth/guard";
import { applicationDecisionSchema } from "@/server/validation";
import { listApplications, verifyPayment, rejectPayment } from "@/server/applications";
import { isHackathonRecord } from "@/server/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List applications with pagination + filter (type: internship vs hackathon). */
export const GET = route(async (req, { requestId }) => {
  await requireAdmin("applications.read");
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
  const status = url.searchParams.get("status") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const confirmed = url.searchParams.get("confirmed") === "true";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(5000, Math.max(1, Number(url.searchParams.get("pageSize") ?? 10)));

  let rows = await listApplications();

  // For all hackathons, deterministically assign unique participant IDs (KTT01, KTT02, ...)
  // to paid & confirmed registrations based on chronological registration order.
  const confirmedHackathons = rows
    .filter((r) => isHackathonRecord(r as unknown as Record<string, unknown>))
    .filter((r) => r.status === "PAYMENT_VERIFIED" || r.status === "CERTIFICATE_ISSUED")
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

  const kttIdMap = new Map<string, string>();
  confirmedHackathons.forEach((item, index) => {
    const seq = String(index + 1).padStart(2, "0");
    const kttId = `KTT${seq}`;
    kttIdMap.set(item.id, kttId);
    if (item.applicationId) kttIdMap.set(item.applicationId, kttId);
  });

  rows = rows.map((r) => {
    const assignedId = kttIdMap.get(r.id) || (r.applicationId ? kttIdMap.get(r.applicationId) : undefined);
    return assignedId ? { ...r, kttId: assignedId } : r;
  });

  if (type === "internship") {
    rows = rows.filter((r) => !isHackathonRecord(r as unknown as Record<string, unknown>));
  } else if (type === "hackathon") {
    rows = rows.filter((r) => isHackathonRecord(r as unknown as Record<string, unknown>));
  }
  if (confirmed) {
    rows = rows.filter((r) => r.status === "PAYMENT_VERIFIED" || r.status === "CERTIFICATE_ISSUED");
  }
  if (status) rows = rows.filter((r) => r.status === status);
  if (search) {
    rows = rows.filter((r) =>
      [
        r.name,
        r.email,
        r.phone,
        r.applicationId,
        r.kttId ?? "",
        r.college ?? "",
        r.teamName ?? "",
        r.schoolName ?? "",
        r.course ?? "",
        r.year ?? "",
        r.razorpayOrderId ?? "",
        r.razorpayPaymentId ?? "",
        r.domain ?? "",
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
