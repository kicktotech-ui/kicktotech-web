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

  // 3. Test non-existent email (anti-enumeration check)
  console.log("3. Testing non-existent email (anti-enumeration check)");
  const fakeForgot = await post("/auth/forgot-password", { email: "nonexistent-user-999@example.com" });
  assert.equal(fakeForgot.status, 200);
  assert.ok(fakeForgot.json.data.message.includes("instructions"));
  console.log("   ✓ Non-existent email returns same neutral message (200)");

  // 4. Test invalid token on reset endpoint
  console.log("4. Testing invalid reset token rejection (401)");
  const invalidReset = await post("/auth/reset-password", {
    token: "invalid.fake.token.12345",
    password: newPassword,
  });
  assert.equal(invalidReset.status, 401);
  console.log("   ✓ Invalid token rejected with 401");

  console.log("\nALL FORGOT PASSWORD API CHECKS PASSED!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
