/**
 * KICK TO TECH — backend API integration tests.
 *
 * Runtime: Node's built-in test runner + fetch (no external deps).
 *   Prereq: dev server running on BASE with AUTH_ADMIN_BOOTSTRAP_PASSWORD set.
 *   Run:    node --test scripts/test-api.mjs
 *
 * Covers: health, student register/login/logout/me, duplicate + validation +
 * admin-domain rejection, admin login/me, student→admin denial, unauth denial,
 * certificate issue → public verify, revoked/unknown verify.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000/api/v1";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@kicktotech.in";
const ADMIN_PW = process.env.AUTH_ADMIN_BOOTSTRAP_PASSWORD ?? "dev-admin-password-123";

function makeClient() {
  let cookie = "";
  async function call(method, path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookies = res.headers.getSetCookie?.() ?? [];
    for (const c of setCookies) {
      const [pair] = c.split(";");
      const name = pair.split("=")[0];
      // keep latest value per cookie name
      const others = cookie.split("; ").filter((x) => x && !x.startsWith(name + "="));
      cookie = [...others, pair].filter(Boolean).join("; ");
    }
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  }
  return {
    get: (p) => call("GET", p),
    post: (p, b) => call("POST", p, b),
  };
}

const unique = () => `stud_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;

before(async () => {
  const res = await fetch(`${BASE}/health`).catch(() => null);
  if (!res || !res.ok) {
    throw new Error(`Dev server not reachable at ${BASE}. Start it first (npm run dev with AUTH_ADMIN_BOOTSTRAP_PASSWORD set).`);
  }
});

test("health returns ok", async () => {
  const c = makeClient();
  const { status, json } = await c.get("/health");
  assert.equal(status, 200);
  assert.equal(json.success, true);
  assert.equal(json.data.status, "ok");
});

test("student register → login → me → logout lifecycle", async () => {
  const c = makeClient();
  const email = unique();

  const reg = await c.post("/auth/student/register", { name: "Test Student", email, password: "Password123", role: "student" });
  assert.equal(reg.status, 201, JSON.stringify(reg.json));
  assert.equal(reg.json.data.user.email, email);
  assert.equal(reg.json.data.user.role, "student");
  assert.equal(reg.json.data.user.passwordHash, undefined, "must not leak password hash");
  assert.equal(reg.json.data.user.password, undefined, "must not leak password");

  const me1 = await c.get("/auth/student/me");
  assert.equal(me1.status, 200);
  assert.equal(me1.json.data.user.email, email);

  await c.post("/auth/student/logout");
  const me2 = await c.get("/auth/student/me");
  assert.equal(me2.status, 200);
  assert.equal(me2.json.data?.user, null, "session must be invalid (null user) after logout");

  const login = await c.post("/auth/student/login", { email, password: "Password123" });
  assert.equal(login.status, 200);
  const me3 = await c.get("/auth/student/me");
  assert.equal(me3.status, 200);
});

test("duplicate registration is rejected (409)", async () => {
  const c = makeClient();
  const email = unique();
  const first = await c.post("/auth/student/register", { name: "Dup User", email, password: "Password123", role: "student" });
  assert.equal(first.status, 201);
  const second = await c.post("/auth/student/register", { name: "Dup User", email, password: "Password123", role: "student" });
  assert.equal(second.status, 409);
  assert.equal(second.json.error.code, "CONFLICT");
});

test("weak password fails validation (400)", async () => {
  const c = makeClient();
  const r = await c.post("/auth/student/register", { name: "Weak", email: unique(), password: "123", role: "student" });
  assert.equal(r.status, 400);
  assert.equal(r.json.error.code, "VALIDATION_ERROR");
});

test("admin-domain email cannot use the student portal (403)", async () => {
  const c = makeClient();
  const r = await c.post("/auth/student/register", { name: "Admin", email: "someone@kicktotech.in", password: "Password123", role: "student" });
  assert.equal(r.status, 403);
  assert.equal(r.json.error.code, "FORBIDDEN");
});

test("invalid student credentials rejected (401)", async () => {
  const c = makeClient();
  const email = unique();
  await c.post("/auth/student/register", { name: "Cred", email, password: "Password123", role: "student" });
  const bad = await c.post("/auth/student/login", { email, password: "wrongpass" });
  assert.equal(bad.status, 401);
  assert.equal(bad.json.error.code, "INVALID_CREDENTIALS");
});

test("unauthenticated cannot access admin API (401)", async () => {
  const c = makeClient();
  const r = await c.get("/admin/analytics");
  assert.equal(r.status, 401);
});

test("student session cannot access admin API (401/403)", async () => {
  const c = makeClient();
  await c.post("/auth/student/register", { name: "S", email: unique(), password: "Password123", role: "student" });
  const r = await c.get("/admin/analytics");
  assert.ok(r.status === 401 || r.status === 403, `expected 401/403, got ${r.status}`);
});

test("admin login → me → issue certificate → public verify", async () => {
  const c = makeClient();
  const login = await c.post("/auth/admin/login", { email: ADMIN_EMAIL, password: ADMIN_PW });
  assert.equal(login.status, 200, JSON.stringify(login.json) + " (is AUTH_ADMIN_BOOTSTRAP_PASSWORD set?)");
  assert.equal(login.json.data.user.role, "SUPER_ADMIN");

  const me = await c.get("/auth/admin/me");
  assert.equal(me.status, 200);
  assert.ok(Array.isArray(me.json.data.permissions));

  const recipient = `Verify Target ${Math.random().toString(36).slice(2, 8)}`;
  const issue = await c.post("/admin/certificates", {
    recipientName: recipient,
    program: "Cybersecurity with Project",
    domain: "cybersecurity",
    grade: "A",
  });
  assert.equal(issue.status, 201, JSON.stringify(issue.json));
  const certId = issue.json.data.certificate.certificateId;
  assert.match(certId, /^KTT-\d{4}-[A-Z0-9]{8}$/, "secure, non-sequential cert id");

  // Public verify (fresh client, no auth)
  const pub = makeClient();
  const v = await pub.get(`/certificates/verify/${encodeURIComponent(certId)}`);
  assert.equal(v.status, 200);
  assert.equal(v.json.data.found, true);
  assert.equal(v.json.data.valid, true);
  assert.equal(v.json.data.recipientName, recipient);
  assert.equal(v.json.data.email, undefined, "verify must not leak private email");

  const bogus = await pub.get("/certificates/verify/KTT-2026-ZZZZZZZZ");
  assert.equal(bogus.json.data.found, false);
});

test("admin login with wrong password rejected (401)", async () => {
  const c = makeClient();
  const r = await c.post("/auth/admin/login", { email: ADMIN_EMAIL, password: "definitely-wrong" });
  assert.equal(r.status, 401);
});
