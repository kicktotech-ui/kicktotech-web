/**
 * KICK TO TECH — READ-ONLY Firestore inspection (Phase 3, STEP: READ FIRST).
 *
 * Discovers the REAL existing collections + document shapes in the live project
 * so the FirebaseDataStore can be mapped WITHOUT inventing collection/field
 * names. Performs ZERO writes/updates/deletes.
 *
 * Prereq (.env.local, git-ignored): FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
 * FIREBASE_PRIVATE_KEY (service account).
 *
 * Run:  node scripts/firebase-inspect.mjs
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Minimal .env.local loader (no dependency).
function loadEnvLocal() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch { /* no .env.local */ }
}

async function main() {
  loadEnvLocal();
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.error("\n[inspect] Missing Firebase Admin credentials in .env.local:");
    console.error("  FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY");
    console.error("  (service account — Firebase Console → Project settings → Service accounts)\n");
    process.exit(1);
  }

  const app = getApps().length ? getApps()[0] : initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
  const db = getFirestore(app);

  console.log(`\n[inspect] Project: ${FIREBASE_PROJECT_ID} (READ-ONLY)\n`);
  const collections = await db.listCollections();
  if (collections.length === 0) {
    console.log("No top-level collections found.");
    return;
  }

  for (const col of collections) {
    const countSnap = await col.count().get().catch(() => null);
    const total = countSnap ? countSnap.data().count : "?";
    const sample = await col.limit(1).get();
    const fields = sample.empty ? [] : Object.keys(sample.docs[0].data());
    console.log(`• ${col.id}  (docs: ${total})`);
    console.log(`    sample doc id: ${sample.empty ? "—" : sample.docs[0].id}`);
    console.log(`    fields: ${fields.length ? fields.join(", ") : "—"}\n`);
  }

  console.log("[inspect] Done. Zero writes performed. Share this output to finalize the Firestore mapping.\n");
}

main().catch((e) => { console.error("[inspect] Error:", e.message); process.exit(1); });
