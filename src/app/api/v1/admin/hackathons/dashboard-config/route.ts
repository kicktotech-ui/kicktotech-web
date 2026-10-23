import { route, ok, parseJson } from "@/server/http";
import { requireAdmin } from "@/server/auth/guard";
import { hackathonDashboardConfigSchema } from "@/server/validation";
import {
  getHackathonDashboardConfig,
  saveHackathonDashboardConfig,
} from "@/server/hackathonDashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/hackathons/dashboard-config
 * Read the current Hackathon Dashboard configuration for the admin editor.
 */
export const GET = route(async (_req, { requestId }) => {
  await requireAdmin("applications.read");
  const config = await getHackathonDashboardConfig();
  return ok(config, { requestId });
});

/**
 * POST /api/v1/admin/hackathons/dashboard-config
 * Update the Hackathon Dashboard configuration from the admin Hackathon Manager.
 * Changes immediately reflect on participant dashboards.
 */
export const POST = route(async (req, { requestId }) => {
  const admin = await requireAdmin("applications.update");
  const body = await parseJson(req, hackathonDashboardConfigSchema);
  const updated = await saveHackathonDashboardConfig(body, {
    actor: admin.user.email,
    requestId,
  });
  return ok(updated, { requestId });
});
