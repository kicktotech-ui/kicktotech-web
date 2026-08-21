/**
 * Manual-payment application lifecycle test against the REAL backend (memory
 * store — no Firestore, quota-independent). Covers:
 *  - public apply (create) + idempotency (refresh → same applicationId)
 *  - proof submission → PAYMENT_PROOF_SUBMITTED
 *  - admin verify → PAYMENT_VERIFIED
 *  - certificate issuance BLOCKED until verified, then allowed + links back
 *  - reject flow
 */
import assert from "node:assert";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000/api/v1";
function env(k) {
  try {
    for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && m[1] === k) return m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
  return undefined;
}
const ADMIN_EMAIL = env("ADMIN_EMAIL") || "admin@kicktotech.in";
const ADMIN_PW = env("AUTH_ADMIN_BOOTSTRAP_PASSWORD") || "dev-admin-password-123";

let cookie = "";
async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setC = res.headers.get("set-cookie");
  if (setC) cookie = setC.split(";")[0];
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function main() {
  const email = `applicant.${Date.now()}@example.com`;

  // 1) Public apply → PAYMENT_PENDING + payment info.
  const a1 = await call("POST", "/internship/apply", { name: "Lakhan Patil", email, phone: "9325490236", college: "JSPM", year: "3rd", domain: "python" });
  assert.equal(a1.status, 201, JSON.stringify(a1.json));
  const appId = a1.json.data.applicationId;
  assert.match(appId, /^APP-\d{4}-[A-Z0-9]{6}$/, "human application id");
  assert.equal(a1.json.data.status, "PAYMENT_PENDING");
  assert.ok(a1.json.data.payment.upiUri.startsWith("upi://pay?"), "UPI uri");
  assert.ok(typeof a1.json.data.payment.amount === "number", "amount");
  console.log(`✓ apply → ${appId} (PENDING), UPI uri present`);

  // 2) Idempotency: same email+domain → same application id, duplicate flag.
  const a2 = await call("POST", "/internship/apply", { name: "Lakhan Patil", email, phone: "9325490236", domain: "python" });
  assert.equal(a2.status, 200, "duplicate → 200");
  assert.equal(a2.json.data.duplicate, true);
  assert.equal(a2.json.data.applicationId, appId, "no duplicate application");
  console.log("✓ idempotent re-apply (no duplicate)");

  // 3) Certificate issuance BLOCKED before verification.
  await call("POST", "/auth/admin/login", { email: ADMIN_EMAIL, password: ADMIN_PW });
  const blocked = await call("POST", "/admin/certificates", { recipientName: "Lakhan Patil", program: "Python Programming with AI Project", domain: "python", applicationId: appId });
  assert.equal(blocked.status, 403, `issuance must be blocked pre-verify: ${JSON.stringify(blocked.json)}`);
  console.log("✓ issuance blocked before payment verified (403)");

  // 4) Proof submitted (public).
  cookie = ""; // simulate public
  const proof = await call("POST", "/internship/apply/proof", { applicationId: appId });
  assert.equal(proof.json.data.status, "PAYMENT_PROOF_SUBMITTED");
  console.log("✓ proof submitted → PAYMENT_PROOF_SUBMITTED");

  // 5) Admin verify payment.
  await call("POST", "/auth/admin/login", { email: ADMIN_EMAIL, password: ADMIN_PW });
  const verify = await call("PATCH", "/admin/applications", { applicationId: appId, action: "verify" });
  assert.equal(verify.json.data.application.status, "PAYMENT_VERIFIED");
  console.log("✓ admin verify → PAYMENT_VERIFIED");

  // 6) Now issuance is allowed + links back to the application.
  const issue = await call("POST", "/admin/certificates", { recipientName: "Lakhan Patil", program: "Python Programming with AI Project", domain: "python", mentorId: "omkar-pawar", applicationId: appId });
  assert.equal(issue.status, 201, `issue after verify: ${JSON.stringify(issue.json)}`);
  const certId = issue.json.data.certificate.certificateId;
  assert.equal(issue.json.data.certificate.mentorName, "Omkar Pawar");
  console.log(`✓ issuance allowed after verify → ${certId}`);

  // Application now CERTIFICATE_ISSUED.
  const list = await call("GET", "/admin/applications?pageSize=200");
  const row = list.json.data.rows.find((r) => r.applicationId === appId);
  assert.equal(row.status, "CERTIFICATE_ISSUED");
  assert.equal(row.certificateId, certId, "application links to certificate");
  console.log("✓ application → CERTIFICATE_ISSUED, linked to cert");

  // 7) Reject flow on a fresh application.
  const email2 = `reject.${Date.now()}@example.com`;
  cookie = "";
  const b1 = await call("POST", "/internship/apply", { name: "Reject Me", email: email2, phone: "9000000000", domain: "java" });
  const appId2 = b1.json.data.applicationId;
  await call("POST", "/auth/admin/login", { email: ADMIN_EMAIL, password: ADMIN_PW });
  const rej = await call("PATCH", "/admin/applications", { applicationId: appId2, action: "reject", reason: "Payment not received" });
  assert.equal(rej.json.data.application.status, "PAYMENT_REJECTED");
  const blocked2 = await call("POST", "/admin/certificates", { recipientName: "Reject Me", program: "Java", domain: "java", applicationId: appId2 });
  assert.equal(blocked2.status, 403, "rejected app cannot issue");
  console.log("✓ reject → PAYMENT_REJECTED, issuance blocked");

  console.log("\nALL APPLICATION LIFECYCLE TESTS PASSED");
}
main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
