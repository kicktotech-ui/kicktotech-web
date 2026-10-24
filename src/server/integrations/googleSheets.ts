import crypto from "node:crypto";
import { listApplications } from "@/server/applications";
import { isHackathonRecord, type ApplicationRecord } from "@/server/data";
import { getMongoDb } from "@/server/data/mongodb";

export const DEFAULT_SPREADSHEET_ID = "1jeMYVFs4l_cx8-pkfgfSI1vUd4fYTWnwMyV0u0Ksuvw";
export const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit?usp=sharing`;

export const SHEET_HEADERS = [
  "Unique ID",
  "Application ID",
  "Participant Name",
  "Email",
  "Phone",
  "College",
  "Course",
  "Year",
  "Team Name",
  "Fee (INR)",
  "Payment ID",
  "Order ID",
  "Registration Date",
];

export interface GoogleSheetsSyncResult {
  success: boolean;
  syncedCount: number;
  method: "webhook" | "service_account" | "none";
  error?: string;
  spreadsheetUrl: string;
}

/**
 * Returns the configured Google Sheets Webhook URL or Service Account config.
 * Checks both environment variables and MongoDB stored settings.
 */
export async function getGoogleSheetsConfig() {
  let webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
  let spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() || DEFAULT_SPREADSHEET_ID;

  // Fallback to database stored setting if environment variable is not defined
  if (!webhookUrl) {
    try {
      const db = await getMongoDb();
      const doc = await db.collection("settings").findOne({ _id: "google_sheets_config" as unknown as import("mongodb").ObjectId });
      if (doc?.webhookUrl && typeof doc.webhookUrl === "string") {
        webhookUrl = doc.webhookUrl.trim();
      }
      if (doc?.spreadsheetId && typeof doc.spreadsheetId === "string") {
        spreadsheetId = doc.spreadsheetId.trim();
      }
    } catch {
      // In-memory or pre-init fallback
    }
  }

  const clientEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ||
    process.env.FIREBASE_CLIENT_EMAIL?.trim();

  const privateKey =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_PRIVATE_KEY;

  const hasServiceAccount = Boolean(clientEmail && privateKey);
  const hasWebhook = Boolean(webhookUrl && webhookUrl.startsWith("http"));

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`,
    webhookUrl,
    hasWebhook,
    clientEmail,
    privateKey,
    hasServiceAccount,
    isConfigured: hasWebhook || hasServiceAccount,
  };
}

/**
 * Mint a Google OAuth2 access token for Google Sheets API v4 using a Service Account JWT.
 */
async function getGoogleSheetsAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodeBase64Url = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const signInput = `${encodeBase64Url(header)}.${encodeBase64Url(claimSet)}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signInput);
  sign.end();
  const signature = sign.sign(privateKey.replace(/\\n/g, "\n"), "base64url");

  const jwt = `${signInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth token failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Format a confirmed participant into the exact 13-column array.
 */
export function formatParticipantRow(r: ApplicationRecord, kttId: string): (string | number)[] {
  return [
    kttId,
    r.applicationId || "",
    r.name || "",
    r.email || "",
    r.phone || "",
    r.college || "",
    r.course || "",
    r.year || "",
    r.teamName || r.schoolName || "",
    r.amount || 99,
    r.razorpayPaymentId || "",
    r.razorpayOrderId || "",
    r.createdAt || new Date().toISOString(),
  ];
}

/**
 * Get all confirmed hackathon participants sorted chronologically with sequential IDs.
 */
export async function getConfirmedHackathonParticipantsWithIds(): Promise<{
  rows: (string | number)[][];
  records: (ApplicationRecord & { kttId: string })[];
}> {
  const allApplications = await listApplications();

  const confirmedHackathons = allApplications
    .filter((r) => isHackathonRecord(r as unknown as Record<string, unknown>))
    .filter((r) => r.status === "PAYMENT_VERIFIED" || r.status === "CERTIFICATE_ISSUED")
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

  const records: (ApplicationRecord & { kttId: string })[] = [];
  const rows: (string | number)[][] = [];

  confirmedHackathons.forEach((item, index) => {
    const seq = String(index + 1).padStart(2, "0");
    const kttId = `KTT${seq}`;
    records.push({ ...item, kttId });
    rows.push(formatParticipantRow(item, kttId));
  });

  return { rows, records };
}

/**
 * Perform a full sync of all confirmed participants into the Google Spreadsheet.
 */
export async function syncAllConfirmedParticipantsToGoogleSheet(): Promise<GoogleSheetsSyncResult> {
  const cfg = await getGoogleSheetsConfig();
  const { rows } = await getConfirmedHackathonParticipantsWithIds();

  // 1. Try Google Apps Script Webhook (Priority 1: zero IAM friction, executes as Sheet owner)
  if (cfg.hasWebhook && cfg.webhookUrl) {
    try {
      const resp = await fetch(cfg.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_all",
          spreadsheetId: cfg.spreadsheetId,
          headers: SHEET_HEADERS,
          rows,
        }),
      });

      if (resp.ok) {
        return {
          success: true,
          syncedCount: rows.length,
          method: "webhook",
          spreadsheetUrl: cfg.spreadsheetUrl,
        };
      }
      console.warn(`[google-sheets] Webhook sync returned status ${resp.status}`);
      const errText = await resp.text().catch(() => "");
      return {
        success: false,
        syncedCount: rows.length,
        method: "webhook",
        error: `Google Apps Script returned HTTP ${resp.status}${errText ? `: ${errText.slice(0, 150)}` : ""}`,
        spreadsheetUrl: cfg.spreadsheetUrl,
      };
    } catch (whErr) {
      console.error("[google-sheets] Webhook sync failed:", whErr);
      return {
        success: false,
        syncedCount: rows.length,
        method: "webhook",
        error: `Webhook connection failed: ${whErr instanceof Error ? whErr.message : String(whErr)}`,
        spreadsheetUrl: cfg.spreadsheetUrl,
      };
    }
  }

  // 2. Try Google Sheets API v4 with Service Account
  if (cfg.hasServiceAccount && cfg.clientEmail && cfg.privateKey) {
    try {
      const token = await getGoogleSheetsAccessToken(cfg.clientEmail, cfg.privateKey);
      const allData = [SHEET_HEADERS, ...rows];

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheetId}/values/Sheet1!A1:M${allData.length}?valueInputOption=USER_ENTERED`;
      const apiResp = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: `Sheet1!A1:M${allData.length}`,
          majorDimension: "ROWS",
          values: allData,
        }),
      });

      if (apiResp.ok) {
        return {
          success: true,
          syncedCount: rows.length,
          method: "service_account",
          spreadsheetUrl: cfg.spreadsheetUrl,
        };
      }

      const errText = await apiResp.text();
      console.error(`[google-sheets] Google Sheets API PUT failed (${apiResp.status}): ${errText}`);
      return {
        success: false,
        syncedCount: rows.length,
        method: "service_account",
        error: `Sheets API ${apiResp.status}: ${errText}`,
        spreadsheetUrl: cfg.spreadsheetUrl,
      };
    } catch (saErr) {
      console.error("[google-sheets] Service account sync failed:", saErr);
      return {
        success: false,
        syncedCount: rows.length,
        method: "service_account",
        error: saErr instanceof Error ? saErr.message : String(saErr),
        spreadsheetUrl: cfg.spreadsheetUrl,
      };
    }
  }

  return {
    success: false,
    syncedCount: rows.length,
    method: "none",
    error: "No Google Sheets webhook or service account configured. Set GOOGLE_SHEETS_WEBHOOK_URL.",
    spreadsheetUrl: cfg.spreadsheetUrl,
  };
}

/**
 * Real-time sync: called immediately when a single participant's payment is confirmed.
 * Non-blocking fire-and-forget with error logging.
 */
export async function syncConfirmedHackathonParticipant(app: ApplicationRecord): Promise<void> {
  try {
    const cfg = await getGoogleSheetsConfig();
    if (!cfg.isConfigured) return;

    // Retrieve all to determine deterministic sequential ID
    const { rows, records } = await getConfirmedHackathonParticipantsWithIds();
    const matching = records.find(
      (r) => r.applicationId === app.applicationId || r.id === app.id,
    );

    const kttId = matching?.kttId || `KTT${String(records.length).padStart(2, "0")}`;
    const formattedRow = formatParticipantRow(app, kttId);

    // 1. Webhook mode
    if (cfg.hasWebhook && cfg.webhookUrl) {
      await fetch(cfg.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "append",
          spreadsheetId: cfg.spreadsheetId,
          headers: SHEET_HEADERS,
          row: formattedRow,
        }),
      });
      return;
    }

    // 2. Service account mode
    if (cfg.hasServiceAccount && cfg.clientEmail && cfg.privateKey) {
      const token = await getGoogleSheetsAccessToken(cfg.clientEmail, cfg.privateKey);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheetId}/values/Sheet1!A1:M1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [formattedRow],
        }),
      });
    }
  } catch (err) {
    console.error(`[google-sheets] Realtime participant sync failed for ${app.applicationId}:`, err);
  }
}
