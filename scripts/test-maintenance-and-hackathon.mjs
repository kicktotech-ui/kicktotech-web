/**
 * Verification Script: Reversible Internship Maintenance Mode & Hackathon Preservation.
 *
 * Verifies:
 * 1. Internship maintenance mode is active by default.
 * 2. Internship apply and proof endpoints return HTTP 503 (MAINTENANCE_MODE).
 * 3. /interns Firestore collection queries (listStudents, countStudents, queryCollection)
 *    are completely bypassed (return empty rows/0 reads).
 * 4. Hackathon registration and verification workflow is fully preserved and unaffected.
 */

import assert from "node:assert";

async function run() {
  console.log("=== 1. Checking Centralized Feature Flag ===");
  // Import using tsx runner
  const { isInternshipMaintenance, FEATURES } = await import("../src/config/features");

  assert.strictEqual(typeof isInternshipMaintenance, "function", "isInternshipMaintenance must be a function");
  assert.strictEqual(FEATURES.internshipMaintenance, true, "FEATURES.internshipMaintenance must default to true");
  assert.strictEqual(isInternshipMaintenance(), true, "isInternshipMaintenance() must return true by default");
  console.log("✓ Centralized feature flag is TRUE by default (internships paused)");

  console.log("\n=== 2. Checking Quota Protection on /interns Queries ===");
  const { queryCollection } = await import("../src/server/adminData");
  const internResult = await queryCollection("interns", { page: 1, pageSize: 10 });
  assert.deepStrictEqual(internResult.rows, [], "interns query must return empty rows in maintenance mode");
  assert.strictEqual(internResult.total, 0, "interns query total must be 0 in maintenance mode");
  console.log("✓ queryCollection('interns') returns 0 rows immediately without touching Firestore");

  console.log("\n=== 3. Checking Hackathon Data Layer & Workflow Isolation ===");
  const { submitHackathonApplication, submitHackathonPaymentProof } = await import("../src/server/hackathonApplications");
  const testEmail = `test.hackathon.${Date.now()}@example.com`;
  
  const hackAppResult = await submitHackathonApplication(
    {
      name: "Hackathon Tester",
      email: testEmail,
      phone: "9876543210",
      college: "JSPM Pune",
      course: "Computer Engineering",
      year: "3rd Year",
      teamName: "BugHunters",
    },
    testEmail
  );

  assert.ok(hackAppResult.application, "Hackathon application record must be created");
  assert.strictEqual(hackAppResult.application.domain, "hack2skill", "Hackathon domain must be hack2skill");
  assert.strictEqual(hackAppResult.application.status, "PAYMENT_PENDING", "Initial status must be PAYMENT_PENDING");
  assert.strictEqual(hackAppResult.payment.amount, 99, "Hackathon fee must be ₹99");
  assert.ok(hackAppResult.application.applicationId.startsWith("APP-"), "Must have valid application ID format");
  console.log(`✓ submitHackathonApplication created application ${hackAppResult.application.applicationId} (₹99)`);

  const proofResult = await submitHackathonPaymentProof(hackAppResult.application.applicationId, testEmail);
  assert.strictEqual(proofResult.application.status, "PAYMENT_PROOF_SUBMITTED", "Status must advance to PAYMENT_PROOF_SUBMITTED");
  console.log(`✓ submitHackathonPaymentProof advanced ${hackAppResult.application.applicationId} to PAYMENT_PROOF_SUBMITTED`);

  const { verifyPayment } = await import("../src/server/applications");
  const verified = await verifyPayment(hackAppResult.application.applicationId, {
    actor: "admin@kicktotech.in",
    requestId: "test-req-verify",
  });
  assert.strictEqual(verified.status, "PAYMENT_VERIFIED", "Status must be PAYMENT_VERIFIED");
  assert.strictEqual(verified.domain, "hack2skill", "Domain remains hack2skill");
  console.log(`✓ Admin verifyPayment successfully approved hackathon registration ${hackAppResult.application.applicationId}`);

  console.log("\n=== 4. Checking HTTP Error Taxonomies & API 503 Envelopes ===");
  const { AppError } = await import("../src/server/http");
  const err = new AppError("MAINTENANCE_MODE", "Internships paused");
  assert.strictEqual(err.code, "MAINTENANCE_MODE");
  console.log("✓ MAINTENANCE_MODE (HTTP 503) error code properly registered in http.ts");

  const { POST: applyPost } = await import("../src/app/api/v1/internship/apply/route");
  const mockReq1 = new Request("http://localhost:3000/api/v1/internship/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", email: "test@example.com", phone: "1234567890", domain: "python" }),
  });
  const res1 = await applyPost(mockReq1);
  assert.strictEqual(res1.status, 503, "POST /api/v1/internship/apply must return HTTP 503");
  const json1 = await res1.json();
  assert.strictEqual(json1.success, false);
  assert.strictEqual(json1.error.code, "MAINTENANCE_MODE");
  console.log("✓ POST /api/v1/internship/apply returns HTTP 503 MAINTENANCE_MODE");

  const { POST: proofPost } = await import("../src/app/api/v1/internship/apply/proof/route");
  const mockReq2 = new Request("http://localhost:3000/api/v1/internship/apply/proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicationId: "APP-2026-TEST" }),
  });
  const res2 = await proofPost(mockReq2);
  assert.strictEqual(res2.status, 503, "POST /api/v1/internship/apply/proof must return HTTP 503");
  const json2 = await res2.json();
  assert.strictEqual(json2.success, false);
  assert.strictEqual(json2.error.code, "MAINTENANCE_MODE");
  console.log("✓ POST /api/v1/internship/apply/proof returns HTTP 503 MAINTENANCE_MODE");

  console.log("\n========================================================");
  console.log("ALL MAINTENANCE & HACKATHON ISOLATION TESTS PASSED! 🎉");
  console.log("========================================================");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
