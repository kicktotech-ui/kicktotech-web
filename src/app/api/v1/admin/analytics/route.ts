import { route, ok } from "@/server/http";
import { requireAdmin } from "@/server/auth/guard";
import { firebaseStore } from "@/server/data/firebase";
import type { DashboardData } from "@/lib/admin/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Real dashboard analytics computed from the LIVE Firestore data (read-only).
 * Auth/session is enforced via the session store; the numbers come from the
 * existing Firebase collections. If Firestore is unreachable the route wrapper
 * returns a real error envelope (UI shows a connection error) — never fake data.
 */
export const GET = route(async (_req, { requestId }) => {
  await requireAdmin("analytics.read");
  const store = firebaseStore();

  const domainAccents: Record<string, string> = {
    python: "#0057ff", java: "#ea580c", "data-analytics": "#7c3aed", cybersecurity: "#16a34a",
  };
  const slugs = Object.keys(domainAccents);

  const [interns, certsTotal, perDomain] = await Promise.all([
    store.countStudents(),
    store.countCertificates(),
    Promise.all(slugs.map((s) => store.countCertificatesByDomain(s))),
  ]);

  const data: DashboardData = {
    metrics: [
      { key: "interns", label: "Total interns", value: interns, format: "number", changePct: 0, trend: [] },
      { key: "certs", label: "Certificates", value: certsTotal, format: "number", changePct: 0, trend: [] },
    ],
    enrollmentTrend: [],
    revenueTrend: [],
    domainDistribution: slugs.map((slug, i) => ({
      domainId: slug as DashboardData["domainDistribution"][number]["domainId"],
      label: slug,
      value: perDomain[i],
      accent: domainAccents[slug],
    })),
    funnel: [
      { label: "Interns", value: interns },
      { label: "Certified", value: certsTotal },
    ],
  };
  return ok<DashboardData>(data, { requestId });
});
