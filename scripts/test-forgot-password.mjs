import assert from "node:assert/strict";

const BASE = "http://localhost:3000/api/v1";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function run() {
  console.log("=== Testing Password Reset Flow ===");

  const email = `test-reset-${Date.now()}@example.com`;
  const originalPassword = "Password123";
  const newPassword = "NewSecretPassword456";

  // 1. Register test user
  console.log("1. Registering test user:", email);
  const reg = await post("/auth/student/register", {
    name: "Reset Tester",
    email,
    password: originalPassword,
    role: "student",
  });
  assert.equal(reg.status, 201, `Registration failed: ${JSON.stringify(reg.json)}`);
  console.log("   ✓ User registered");

  // 2. Request forgot password
  console.log("2. Requesting forgot password email");
  const forgot = await post("/auth/forgot-password", { email });
  assert.equal(forgot.status, 200, `Forgot password failed: ${JSON.stringify(forgot.json)}`);
  assert.ok(forgot.json.data.message.includes("instructions"));
  console.log("   ✓ Forgot password API responded 200:", forgot.json.data.message);

  // 3. Test non-existent email (explicit feedback check)
  console.log("3. Testing non-existent email (explicit feedback check)");
  const fakeForgot = await post("/auth/forgot-password", { email: "nonexistent-user-999@example.com" });
  assert.equal(fakeForgot.status, 404);
  assert.ok(fakeForgot.json.error.message.includes("No account found"));
  console.log("   ✓ Non-existent email returns clear 404 error");

  // 4. Test invalid token on reset endpoint
  console.log("4. Testing invalid reset token rejection (401)");
  const invalidReset = await post("/auth/reset-password", {
    token: "invalid.fake.token.12345",
    password: newPassword,
  });
  assert.equal(invalidReset.status, 401);
  console.log("   ✓ Invalid token rejected with 401");

  // 5. Test real reset with valid token
  console.log("5. Testing password reset & subsequent login with new password");
  // We can query MongoDB directly to get the created user and generate a token
  const { MongoClient } = await import("mongodb");
  const fs = await import("fs");
  const env = fs.readFileSync(".env.local", "utf8");
  const uri = (env.match(/MONGODB_URI=(.*)/) || [])[1]?.trim();
  const dbName = (env.match(/MONGODB_DB_NAME=(.*)/) || [])[1]?.trim() || "kicktotech";
  const client = new MongoClient(uri);
  await client.connect();
  const user = await client.db(dbName).collection("users").findOne({ email });
  assert.ok(user, "User record must exist in DB");

  // Create HMAC token manually matching crypto.ts + service.ts
  const { createHmac } = await import("node:crypto");
  const sessionSecret = (env.match(/AUTH_SESSION_SECRET=(.*)/) || [])[1]?.trim();
  const payload = Buffer.from(
    JSON.stringify({
      uid: user.id,
      email: user.email.toLowerCase().trim(),
      hashSlice: (user.passwordHash || "").slice(0, 10),
      exp: Date.now() + 3600_000,
      purpose: "pwd_reset",
    })
  ).toString("base64url");
  const mac = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  const validToken = `${payload}.${mac}`;

  const resetRes = await post("/auth/reset-password", {
    token: validToken,
    password: newPassword,
  });
  assert.equal(resetRes.status, 200, `Reset failed: ${JSON.stringify(resetRes.json)}`);
  console.log("   ✓ Reset password succeeded with status 200");

  // 6. Test login with new password
  console.log("6. Logging in with new password");
  const loginRes = await post("/auth/student/login", {
    email,
    password: newPassword,
  });
  assert.equal(loginRes.status, 200, `Login failed: ${JSON.stringify(loginRes.json)}`);
  assert.ok(loginRes.json.data.token, "Login should return JWT/session token");
  console.log("   ✓ Logged in successfully with updated credentials!");

  // Clean up test user
  await client.db(dbName).collection("users").deleteOne({ email });
  await client.close();

  console.log("\nALL FORGOT PASSWORD & RESET API CHECKS PASSED!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
