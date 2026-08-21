/**
 * Populate .env.local with Firebase Admin credentials from a local service
 * account JSON — WITHOUT ever printing the private key.
 *
 * Usage: node scripts/configure-firebase-env.mjs <path-to-service-account.json>
 *
 * - Reads project_id / client_email / private_key from the JSON.
 * - Writes/updates FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *   in .env.local (private key stored with \n escapes, quoted).
 * - Prints ONLY presence confirmation — never secret values.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

const jsonArg = process.argv[2];
if (!jsonArg) { console.error("Missing service-account JSON path argument."); process.exit(1); }
const jsonPath = resolve(root, jsonArg);
if (!existsSync(jsonPath)) { console.error("Service-account JSON not found at given path."); process.exit(1); }

let sa;
try { sa = JSON.parse(readFileSync(jsonPath, "utf8")); }
catch { console.error("Could not parse the service-account JSON."); process.exit(1); }

const projectId = sa.project_id;
const clientEmail = sa.client_email;
const privateKey = sa.private_key; // real newlines from JSON

if (!projectId || !clientEmail || !privateKey) {
  console.error("Service-account JSON missing required fields (project_id/client_email/private_key).");
  process.exit(1);
}

// Escape real newlines back to \n and wrap in quotes for the env file.
const escapedKey = privateKey.replace(/\r?\n/g, "\\n");

let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
// Remove any existing (commented or active) FIREBASE_ admin lines.
env = env
  .split("\n")
  .filter((l) => !/^\s*#?\s*FIREBASE_PROJECT_ID\s*=/.test(l))
  .filter((l) => !/^\s*#?\s*FIREBASE_CLIENT_EMAIL\s*=/.test(l))
  .filter((l) => !/^\s*#?\s*FIREBASE_PRIVATE_KEY\s*=/.test(l))
  .join("\n")
  .replace(/\n{3,}/g, "\n\n")
  .trimEnd();

env += `\n\n# Firebase ADMIN (server) — SECRET service account. Populated locally; never commit.\n`;
env += `FIREBASE_PROJECT_ID=${projectId}\n`;
env += `FIREBASE_CLIENT_EMAIL=${clientEmail}\n`;
env += `FIREBASE_PRIVATE_KEY="${escapedKey}"\n`;

writeFileSync(envPath, env + "\n", "utf8");

// Presence-only confirmation (NO secret values).
console.log("Firebase Admin env written to .env.local:");
console.log("  FIREBASE_PROJECT_ID   :", projectId ? "PRESENT" : "MISSING");
console.log("  FIREBASE_CLIENT_EMAIL :", clientEmail ? "PRESENT" : "MISSING");
console.log("  FIREBASE_PRIVATE_KEY  :", privateKey ? "PRESENT (hidden)" : "MISSING");
