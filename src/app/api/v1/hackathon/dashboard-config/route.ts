import { route, ok } from "@/server/http";
import { getHackathonDashboardConfig } from "@/server/hackathonDashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/hackathon/dashboard-config
 * Public read endpoint for the live Hackathon Dashboard configuration
 * (event details, live schedule, announcements, resources).
 */
export const GET = route(async (_req, { requestId }) => {
  const config = await getHackathonDashboardConfig();
  return ok(config, { requestId });
});
