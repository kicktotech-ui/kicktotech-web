import assert from "node:assert";
import { loginAdmin } from "../src/server/auth/service.ts";
import { config } from "../src/server/config.ts";

async function runTests() {
  console.log("=================================================");
  console.log("TESTING ADMIN AUTHENTICATION FLOWS");
  console.log("=================================================\n");

  const meta = { ip: "127.0.0.1", requestId: "test-auth-req-1" };
  const adminEmail = config.admin.email; // e.g. "admin@kicktotech.in"
  const testBootstrapPassword = "SecretAdminPassword123!";

  // Test A: Master / Bootstrap Password Match
  process.env.AUTH_ADMIN_BOOTSTRAP_PASSWORD = testBootstrapPassword;
  // Reload config
  config.admin.bootstrapPassword = testBootstrapPassword;

  console.log("Test 1: Admin Login with bootstrap password");
  const user = await loginAdmin({ email: adminEmail, password: testBootstrapPassword }, meta);
  assert.strictEqual(user.email, adminEmail, "Admin email must match");
  assert.strictEqual(user.type, "admin", "User type must be admin");
  console.log("  ✓ Admin successfully logged in with bootstrap password");

  // Test 2: Invalid password rejection
  console.log("Test 2: Rejection of invalid password");
  let failed = false;
  try {
    await loginAdmin({ email: adminEmail, password: "wrong-password-999" }, meta);
  } catch (err) {
    failed = true;
    assert.strictEqual(err.code, "INVALID_CREDENTIALS", "Error code must be INVALID_CREDENTIALS");
  }
  assert.ok(failed, "Invalid password must throw error");
  console.log("  ✓ Invalid password rejected as expected");

  console.log("\n=================================================");
  console.log("ALL ADMIN AUTHENTICATION TESTS PASSED!");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
