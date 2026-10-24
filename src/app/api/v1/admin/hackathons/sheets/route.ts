import { route, ok } from "@/server/http";
import { requireAdmin } from "@/server/auth/guard";
import {
  getGoogleSheetsConfig,
  syncAllConfirmedParticipantsToGoogleSheet,
  getConfirmedHackathonParticipantsWithIds,
} from "@/server/integrations/googleSheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Get Google Sheets sync configuration & current confirmed count. */
export const GET = route(async (req, { requestId }) => {
  await requireAdmin("applications.read", req);
  const cfg = getGoogleSheetsConfig();
  const { records } = await getConfirmedHackathonParticipantsWithIds();

  return ok(
    {
      isConfigured: cfg.isConfigured,
      hasWebhook: cfg.hasWebhook,
      hasServiceAccount: cfg.hasServiceAccount,
      spreadsheetId: cfg.spreadsheetId,
      spreadsheetUrl: cfg.spreadsheetUrl,
      confirmedCount: records.length,
    },
    { requestId },
  );
});

/** Trigger synchronization of all confirmed registrations to Google Sheets. */
export const POST = route(async (req, { requestId }) => {
  await requireAdmin("applications.update", req);
  const result = await syncAllConfirmedParticipantsToGoogleSheet();

  return ok({ ...result }, { requestId });
});
