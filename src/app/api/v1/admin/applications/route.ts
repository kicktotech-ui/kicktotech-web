import { route, ok, parseJson } from "@/server/http";
import { requireAdmin } from "@/server/auth/guard";
import { applicationDecisionSchema, adminCreateApplicationSchema } from "@/server/validation";
import {
  listApplications,
  verifyPayment,
  rejectPayment,
  grantInternshipAccess,
  updateApplicationDetails,
  createAdminApplication,
} from "@/server/applications";
import { isHackathonRecord } from "@/server/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List applications with pagination + filter (type: internship vs hackathon, domain, status). */
export const GET = route(async (req, { requestId }) => {
  await requireAdmin("applications.read");
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
  const status = url.searchParams.get("status") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const domain = (url.searchParams.get("domain") ?? "").trim().toLowerCase();
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
  if (status && status !== "ALL") {
    rows = rows.filter((r) => r.status === status);
  }
  if (domain && domain !== "all") {
    rows = rows.filter((r) => {
      const d = (r.domain || "").toLowerCase();
      if (domain === "python") return d.includes("python");
      if (domain === "java") return d.includes("java");
      if (domain === "data-analytics" || domain === "data") return d.includes("data") || d.includes("analytic");
      if (domain === "cybersecurity" || domain === "cyber") return d.includes("cyber") || d.includes("security");
      return d.includes(domain);
    });
  }
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
        r.prn ?? "",
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

/** Admin creates a new internship application directly. */
export const POST = route(async (req, { requestId }) => {
  const { user } = await requireAdmin("applications.update");
  const body = await parseJson(req, adminCreateApplicationSchema);
  const result = await createAdminApplication(body, { actor: user.email, requestId });
  return ok(result, { status: 201, requestId });
});

/** Admin payment & lifecycle decisions: verify, reject, grant_access, or update record. */
export const PATCH = route(async (req, { requestId }) => {
  const { user } = await requireAdmin("applications.update");
  const body = await parseJson(req, applicationDecisionSchema);
  const { applicationId, action, reason, patch } = body;

  if (action === "grant_access") {
    const result = await grantInternshipAccess(applicationId, { actor: user.email, requestId });
    return ok(result, { requestId });
  }

  if (action === "update") {
    const updated = await updateApplicationDetails(applicationId, patch ?? {}, { actor: user.email, requestId });
    return ok({ application: updated }, { requestId });
  }

  const application = action === "verify"
    ? await verifyPayment(applicationId, { actor: user.email, requestId })
    : await rejectPayment(applicationId, reason, { actor: user.email, requestId });

  return ok({ application }, { requestId });
});
