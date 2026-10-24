import { route, ok, parseJson } from "@/server/http";
import { requireAdmin } from "@/server/auth/guard";
import {
  getGoogleSheetsConfig,
  syncAllConfirmedParticipantsToGoogleSheet,
  getConfirmedHackathonParticipantsWithIds,
  DEFAULT_SPREADSHEET_ID,
} from "@/server/integrations/googleSheets";
import { getMongoDb } from "@/server/data/mongodb";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const syncConfigSchema = z.object({
  webhookUrl: z.string().trim().optional(),
  spreadsheetId: z.string().trim().optional(),
});

/** Get Google Sheets sync configuration & current confirmed count. */
export const GET = route(async (req, { requestId }) => {
  await requireAdmin("applications.read", req);
  const cfg = await getGoogleSheetsConfig();
  const { records } = await getConfirmedHackathonParticipantsWithIds();

  return ok(
    {
      isConfigured: cfg.isConfigured,
      hasWebhook: cfg.hasWebhook,
      hasServiceAccount: cfg.hasServiceAccount,
      spreadsheetId: cfg.spreadsheetId,
      spreadsheetUrl: cfg.spreadsheetUrl,
      webhookUrl: cfg.webhookUrl || "",
      confirmedCount: records.length,
    },
    { requestId },
  );
});

/** Trigger synchronization of all confirmed registrations to Google Sheets. */
export const POST = route(async (req, { requestId }) => {
  const admin = await requireAdmin("applications.update", req);
  let body: z.infer<typeof syncConfigSchema> | null = null;
  try {
    body = await parseJson(req, syncConfigSchema);
  } catch {
    body = null;
  }

  if (body?.webhookUrl) {
    const db = await getMongoDb();
    await db.collection("settings").updateOne(
      { _id: "google_sheets_config" as unknown as import("mongodb").ObjectId },
      {
        $set: {
          webhookUrl: body.webhookUrl.trim(),
          spreadsheetId: body.spreadsheetId?.trim() || DEFAULT_SPREADSHEET_ID,
          updatedAt: new Date().toISOString(),
          updatedBy: admin.user.email,
        },
      },
      { upsert: true }
    );
  }

  const result = await syncAllConfirmedParticipantsToGoogleSheet();

  return ok({ ...result }, { requestId });
});
