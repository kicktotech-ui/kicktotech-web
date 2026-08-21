/**
 * Certificate lifecycle test against the REAL backend (memory store — no
 * Firestore, so it runs regardless of quota). Covers spec test cases:
 * TC1-4 mentor signature per domain, TC5 backend unique id, TC8 verify,
 * TC9 invalid, TC10 revoked, TC12 idempotent double-issue.
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
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setC = res.headers.get("set-cookie");
  if (setC) cookie = setC.split(";")[0];
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const EXPECT = {
  python: { mentor: "Omkar Pawar", sig: "omkar-pawar-python-signature" },
  java: { mentor: "Pooja Kolekar", sig: "pooja-java-signature" },
  cybersecurity: { mentor: "Samruddhi More", sig: "samruddhi-cybersecurity-signature" },
  "data-analytics": { mentor: "Tauheed", sig: "tauhid-data-analytics-signature" },
};

async function main() {
  const login = await call("POST", "/auth/admin/login", { email: ADMIN_EMAIL, password: ADMIN_PW });
  assert.equal(login.status, 200, "admin login");
  console.log("✓ admin login");

  // TC1-4: each domain resolves its real mentor + signature asset.
  const issuedIds = {};
  for (const [domain, exp] of Object.entries(EXPECT)) {
    const r = await call("POST", "/admin/certificates", {
      recipientName: `TC ${domain}`, program: `${domain} program`, domain, grade: "A",
      durationLabel: "5 Weeks",
    });
    assert.equal(r.status, 201, `issue ${domain}: ${JSON.stringify(r.json)}`);
    const c = r.json.data.certificate;
    assert.match(c.certificateId, /^KTT-\d{4}-[A-Z0-9]{8}$/, "TC5 secure id");
    assert.equal(c.mentorName, exp.mentor, `TC mentor for ${domain}`);
    assert.ok(String(c.mentorSignatureAsset).includes(exp.sig), `TC signature asset for ${domain} (${c.mentorSignatureAsset})`);
    assert.ok(Array.isArray(c.signatories) && c.signatories.length >= 2, "org signatories snapshot");
    issuedIds[domain] = c.certificateId;
    console.log(`✓ ${domain} → ${exp.mentor} (${c.certificateId})`);
  }

  // TC12: idempotent double-issue (same recipient+program+domain) → no duplicate.
  const first = await call("POST", "/admin/certificates", { recipientName: "Dup Test", program: "python program", domain: "python", grade: "A" });
  const second = await call("POST", "/admin/certificates", { recipientName: "Dup Test", program: "python program", domain: "python", grade: "A" });
  assert.equal(first.status, 201, "first issue 201");
  assert.equal(second.status, 200, "second issue 200 (duplicate)");
  assert.equal(second.json.data.duplicate, true, "TC12 duplicate flag");
  assert.equal(first.json.data.certificate.certificateId, second.json.data.certificate.certificateId, "TC12 same id, no duplicate");
  console.log("✓ TC12 idempotent double-issue (no duplicate)");

  // TC8: verify a valid cert (public, no auth).
  const noAuth = cookie; cookie = "";
  const v = await call("GET", `/certificates/verify/${issuedIds.python}`);
  assert.equal(v.json.data.found, true);
  assert.equal(v.json.data.valid, true);
  assert.equal(v.json.data.mentorName, "Omkar Pawar");
  assert.equal(v.json.data.email, undefined, "no PII leak");
  assert.ok(v.json.data.verificationUrl.includes("/verify_cert?cert="), "verification url");
  console.log("✓ TC8 public verify (valid, no PII)");

  // TC9: invalid id → not found.
  const bogus = await call("GET", "/certificates/verify/KTT-2026-ZZZZZZZZ");
  assert.equal(bogus.json.data.found, false, "TC9 not found");
  console.log("✓ TC9 invalid id → not found");

  // TC10: revoke → verify shows revoked, not valid.
  cookie = noAuth;
  const rev = await call("DELETE", "/admin/certificates", { certificateId: issuedIds.java });
  assert.equal(rev.status, 200, `revoke: ${JSON.stringify(rev.json)}`);
  assert.equal(rev.json.data.certificate.status, "revoked");
  cookie = "";
  const vr = await call("GET", `/certificates/verify/${issuedIds.java}`);
  assert.equal(vr.json.data.found, true);
  assert.equal(vr.json.data.valid, false, "TC10 revoked not valid");
  assert.equal(vr.json.data.status, "revoked");
  console.log("✓ TC10 revoke → verify revoked");

  console.log("\nALL CERTIFICATE TESTS PASSED");
}
main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
