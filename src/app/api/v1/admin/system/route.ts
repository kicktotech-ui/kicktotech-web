import { route, ok } from "@/server/http";
import { requireAdmin } from "@/server/auth/guard";
import { firebaseStore } from "@/server/data/firebase";
import type { SystemService } from "@/lib/admin/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Real system health — performs a live read-only Firestore probe. */
export const GET = route(async (_req, { requestId }) => {
  await requireAdmin("system.read");

  let firestore: SystemService;
  try {
    const count = await firebaseStore().countCertificates();
    firestore = { name: "Database", state: "OPERATIONAL", detail: `Firestore connected · ${count} certificates` };
  } catch {
    firestore = { name: "Database", state: "NOT_CONNECTED", detail: "Firestore unreachable — check credentials" };
  }

  const services: SystemService[] = [
    { name: "Frontend", state: "OPERATIONAL", detail: "Next.js app running" },
    { name: "API", state: "OPERATIONAL", detail: "/api/v1 serving requests" },
    firestore,
    { name: "Authentication", state: "DEV_MODE", detail: "Session auth (Firebase Auth integration pending)" },
    { name: "Email", state: "NOT_CONNECTED", detail: "Transactional email — later phase" },
    { name: "Storage", state: "NOT_CONNECTED", detail: "Certificate storage — later phase" },
    { name: "Payments", state: "NOT_CONNECTED", detail: "Payment provider — later phase" },
    { name: "Real-time", state: "NOT_CONNECTED", detail: "Firestore onSnapshot wiring — later phase" },
  ];
  return ok(services, { requestId });
});
