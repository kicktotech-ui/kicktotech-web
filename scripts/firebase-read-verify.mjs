/**
 * READ-ONLY verification that the FirebaseDataStore mapping reads REAL data.
 * Zero writes. Prints counts + one certificate's NON-PII fields only
 * (never names/emails/phones). Run: node scripts/firebase-read-verify.mjs
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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
  } catch {}
}

const str = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
const toIso = (v) => (!v ? "" : typeof v === "string" ? v : typeof v?.toDate === "function" ? v.toDate().toISOString() : String(v));
const normStatus = (v) => { const s = str(v).toLowerCase(); return s === "revoked" || s === "expired" || s === "invalid" ? "revoked" : "issued"; };

async function main() {
  loadEnvLocal();
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.error("Missing Firebase Admin credentials."); process.exit(1);
  }
  const app = getApps().length ? getApps()[0] : initializeApp({
    credential: cert({ projectId: FIREBASE_PROJECT_ID, clientEmail: FIREBASE_CLIENT_EMAIL, privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }),
  });
  const db = getFirestore(app);

  console.log(`\n[read-verify] Project ${FIREBASE_PROJECT_ID} — READ ONLY\n`);
  for (const col of ["certificates", "interns", "users"]) {
    const c = await db.collection(col).count().get();
    console.log(`  ${col} count: ${c.data().count}`);
  }

  // Fetch one real certificate and prove the lookup-by-id mapping (non-PII only).
  const sample = await db.collection("certificates").limit(1).get();
  if (!sample.empty) {
    const certificateId = str(sample.docs[0].data().certificateId);
    const byId = await db.collection("certificates").where("certificateId", "==", certificateId).limit(1).get();
    const d = byId.docs[0].data();
    console.log(`\n  Certificate lookup by id "${certificateId}" → FOUND`);
    console.log(`    program : ${str(d.courseTitle)}`);
    console.log(`    domain  : ${str(d.domain)}`);
    console.log(`    grade   : ${str(d.grade)}`);
    console.log(`    status  : ${str(d.status)} → ${normStatus(d.status)}`);
    console.log(`    issuedAt: ${toIso(d.issuedAt)}`);
    console.log(`    (recipient name/email intentionally NOT printed — PII)`);
  }
  console.log(`\n[read-verify] Done. Reads only. 0 writes.\n`);
}
main().catch((e) => { console.error("[read-verify] Error:", e.message); process.exit(1); });
