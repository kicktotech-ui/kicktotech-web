import { route, ok } from "@/server/http";
import { requireAuthenticatedStudent } from "@/server/auth/guard";
import { getStore, isHackathonRecord, type ApplicationRecord } from "@/server/data";
import { getHackathonDashboardConfig } from "@/server/hackathonDashboard";
import type { HackathonParticipantRecord } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/student/dashboard
 * Protected endpoint returning all dashboard data for the authenticated student:
 * - Hackathon enrollment status & registration details (with unique KTT ID)
 * - Live Hackathon event details, schedule & resources
 * - Internship enrollment status & details
 */
export const GET = route(async (req, { requestId }) => {
  const authUser = await requireAuthenticatedStudent(req);
  const store = getStore();
  const allApplications = await store.listApplications();
  const normEmail = authUser.email.toLowerCase().trim();

  // 1. Calculate deterministic KTT IDs (KTT01, KTT02, ...) for all confirmed hackathon participants
  const confirmedHackathons = allApplications
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

  // 2. Filter applications matching the logged-in student
  const studentApps = allApplications.filter(
    (a) => (a.email || "").toLowerCase().trim() === normEmail,
  );

  // 3. Separate Hackathon vs Internship applications
  // Sort hackathons: confirmed/verified first, then newest first
  const hackathonApps = studentApps
    .filter((a) => isHackathonRecord(a as unknown as Record<string, unknown>))
    .sort((a, b) => {
      const aVerified = a.status === "PAYMENT_VERIFIED" || a.status === "CERTIFICATE_ISSUED" ? 1 : 0;
      const bVerified = b.status === "PAYMENT_VERIFIED" || b.status === "CERTIFICATE_ISSUED" ? 1 : 0;
      if (aVerified !== bVerified) return bVerified - aVerified;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  const internshipApps = studentApps.filter(
    (a) => !isHackathonRecord(a as unknown as Record<string, unknown>),
  );

  // Preferred active/latest registration
  let hackathonRecord: HackathonParticipantRecord | null = null;
  if (hackathonApps.length > 0) {
    const topHack = hackathonApps[0];
    const assignedKttId =
      kttIdMap.get(topHack.id) ||
      (topHack.applicationId ? kttIdMap.get(topHack.applicationId) : undefined);

    hackathonRecord = {
      id: topHack.id,
      applicationId: topHack.applicationId,
      kttId: assignedKttId,
      name: topHack.name,
      email: topHack.email,
      phone: topHack.phone,
      college: topHack.college,
      course: topHack.course,
      year: topHack.year,
      teamName: topHack.teamName || topHack.schoolName,
      amount: topHack.amount || 99,
      status: topHack.status,
      razorpayPaymentId: topHack.razorpayPaymentId,
      razorpayOrderId: topHack.razorpayOrderId,
      createdAt: topHack.createdAt,
    };
  }

  // A student is only officially enrolled in the hackathon when payment is verified
  const isHackathonConfirmed = hackathonRecord
    ? hackathonRecord.status === "PAYMENT_VERIFIED" || hackathonRecord.status === "CERTIFICATE_ISSUED"
    : false;

  const liveConfig = await getHackathonDashboardConfig();

  return ok(
    {
      user: {
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
      },
      hackathon: {
        enrolled: isHackathonConfirmed,
        isPendingPayment: Boolean(hackathonRecord && !isHackathonConfirmed),
        registration: hackathonRecord,
        config: liveConfig,
      },
      internship: {
        enrolled: internshipApps.length > 0,
        registration: internshipApps[0] ?? null,
      },
    },
    { requestId },
  );
});
