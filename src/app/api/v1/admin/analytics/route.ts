import { route, ok } from "@/server/http";
import { requireAdmin } from "@/server/auth/guard";
import { getStore } from "@/server/data";
import type { DashboardData } from "@/lib/admin/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Real dashboard analytics computed from the database.
 */
export const GET = route(async (_req, { requestId }) => {
  await requireAdmin("analytics.read");
  const store = getStore();

  const domainAccents: Record<string, string> = {
    python: "#0057ff", java: "#ea580c", "data-analytics": "#7c3aed", cybersecurity: "#16a34a",
  };
  const slugs = Object.keys(domainAccents);

  let interns = 0;
  let certsTotal = 0;
  let perDomain: number[] = [0, 0, 0, 0];

  try {
    const results = await Promise.allSettled([
      store.countStudents().catch(() => 0),
      store.countCertificates().catch(() => 0),
      Promise.all(slugs.map((s) => store.countCertificatesByDomain(s).catch(() => 0))),
    ]);
    if (results[0].status === "fulfilled") interns = results[0].value;
    if (results[1].status === "fulfilled") certsTotal = results[1].value;
    if (results[2].status === "fulfilled") perDomain = results[2].value;
  } catch (err) {
    console.warn("[analytics] count aggregate warning:", err);
  }

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
