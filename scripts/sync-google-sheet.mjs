/**
 * Standalone CLI script to sync all confirmed hackathon participants to the Google Sheet.
 *
 * Usage:
 *   GOOGLE_SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/.../exec" node scripts/sync-google-sheet.mjs
 * Or:
 *   node scripts/sync-google-sheet.mjs   (if GOOGLE_SHEETS_WEBHOOK_URL is in .env.local)
 */
import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch {}
}

loadEnv();

const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "1jeMYVFs4l_cx8-pkfgfSI1vUd4fYTWnwMyV0u0Ksuvw";
const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`;

console.log("==================================================");
console.log("KICK TO TECH — GOOGLE SHEETS REGISTRATION SYNC");
console.log("==================================================");
console.log(`Target Spreadsheet: ${spreadsheetUrl}`);

if (!webhookUrl) {
  console.log("\n[Notice] GOOGLE_SHEETS_WEBHOOK_URL is not set in environment.");
  console.log("Follow the 1-minute setup instructions in: scripts/google-apps-script.js");
  console.log("Then run:");
  console.log('GOOGLE_SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/.../exec" node scripts/sync-google-sheet.mjs\n');
} else {
  console.log(`Webhook URL: ${webhookUrl}`);
}
