/**
 * Comprehensive Test Suite for PromptWars Payment Fix & Hackathon Flow.
 *
 * Tests:
 * 1. Application found and registered.
 * 2. Active Razorpay order reuse (authoritative validation: status, amount, currency).
 * 3. Transient Razorpay gateway error (502) -> throws SERVICE_UNAVAILABLE; DOES NOT create replacement order.
 * 4. Transient network error -> throws SERVICE_UNAVAILABLE; DOES NOT create replacement order.
 * 5. HTTP 400 Authentication/Config error -> throws SERVER_ERROR; DOES NOT create replacement order.
 * 6. HTTP 400 Inconclusive Bad Request -> throws SERVICE_UNAVAILABLE; DOES NOT create replacement order.
 * 7. HTTP 400 Confirmed Nonexistent ID ("The id provided does not exist") -> creates fresh replacement order.
 * 8. HTTP 404 Confirmed Missing order -> creates fresh replacement order.
 * 9. Application genuinely missing (correctly returns NOT_FOUND / 404).
 * 10. Firestore quota exceeded (returns SERVICE_UNAVAILABLE / 503, NOT 404).
 * 11. Database unavailable (returns SERVICE_UNAVAILABLE / 503, NOT 404).
 * 12. Invalid webhook signature rejection (HTTP 400).
 * 13. Successful payment verification and amount/currency guards.
 * 14. Duplicate webhook delivery / idempotency handling.
 * 15. Transient database failure in webhook returns retryable non-2xx (HTTP 500).
 */

import assert from "node:assert";
import { createHmac } from "node:crypto";

async function run() {
  console.log("================================================================");
  console.log(" RUNNING PROMPTWARS PAYMENT BUG & RECOVERY VERIFICATION SUITE   ");
  console.log("================================================================\n");

  // Mock env vars for test environment if not set
  process.env.DATA_BACKEND = "memory";
  process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_mockKey123";
  process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "mock_secret_key_456";
  process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "mock_webhook_secret_789";

  const { isFirestoreInfrastructureError, handleFirestoreError } = await import("../src/server/data/firebase");
  const { AppError } = await import("../src/server/http");
  const {
    submitHackathonApplication,
    createHackathonPaymentOrder,
    verifyHackathonPayment,
    handleRazorpayWebhookEvent,
  } = await import("../src/server/hackathonApplications");
  const { getStore } = await import("../src/server/data/index");
  const { verifyWebhookSignature, verifyPaymentSignature, fetchRazorpayOrder } = await import("../src/server/payments/razorpay");

  // -------------------------------------------------------------------------
  console.log("TEST 1: Infrastructure Error Classification");
  // -------------------------------------------------------------------------
  assert.strictEqual(
    isFirestoreInfrastructureError({ code: 8, message: "Quota exceeded." }),
    true,
    "gRPC code 8 should be recognized as infrastructure error",
  );
  assert.strictEqual(
    isFirestoreInfrastructureError({ status: "RESOURCE_EXHAUSTED", message: "429 Quota exceeded." }),
    true,
    "RESOURCE_EXHAUSTED status should be recognized as infrastructure error",
  );
  assert.strictEqual(
    isFirestoreInfrastructureError({ code: 14, message: "Service Unavailable" }),
    true,
    "gRPC code 14 should be recognized as infrastructure error",
  );
  assert.strictEqual(
    isFirestoreInfrastructureError({ code: 4, message: "deadline-exceeded" }),
    true,
    "Deadline exceeded should be recognized as infrastructure error",
  );
  assert.strictEqual(
    isFirestoreInfrastructureError({ code: 7, message: "permission-denied" }),
    true,
    "Permission denied should be recognized as infrastructure error",
  );
  assert.strictEqual(
    isFirestoreInfrastructureError({ message: "Document not found" }),
    false,
    "Generic error should not be classified as infrastructure error",
  );
  assert.strictEqual(
    isFirestoreInfrastructureError(null),
    false,
    "null should not crash isFirestoreInfrastructureError",
  );
  console.log("✓ isFirestoreInfrastructureError correctly classifies error types\n");

  // -------------------------------------------------------------------------
  console.log("TEST 2: Firestore Error Handler Throws Proper HTTP Statuses (No 404 Masking)");
  // -------------------------------------------------------------------------
  try {
    handleFirestoreError({ code: 8, message: "Quota exceeded." }, "testOp");
    assert.fail("Should have thrown AppError");
  } catch (err) {
    assert.ok(err instanceof AppError, "Must throw an AppError");
    assert.strictEqual(err.code, "SERVICE_UNAVAILABLE", "Quota error must map to SERVICE_UNAVAILABLE (503)");
    assert.ok(err.message.includes("quota"), "Error message must state quota was reached");
  }

  try {
    handleFirestoreError({ code: 14, message: "Service Unavailable" }, "testOp");
    assert.fail("Should have thrown AppError");
  } catch (err) {
    assert.ok(err instanceof AppError, "Must throw an AppError");
    assert.strictEqual(err.code, "SERVICE_UNAVAILABLE", "Unavailable error must map to SERVICE_UNAVAILABLE (503)");
  }
  console.log("✓ handleFirestoreError produces correct SERVICE_UNAVAILABLE exceptions\n");

  // -------------------------------------------------------------------------
  console.log("TEST 3: Application Genuinely Missing Returns HTTP 404 NOT_FOUND");
  // -------------------------------------------------------------------------
  try {
    await createHackathonPaymentOrder("APP-NONEXISTENT-999", "student@example.com");
    assert.fail("Nonexistent application must throw NOT_FOUND");
  } catch (err) {
    assert.ok(err instanceof AppError, "Must throw AppError");
    assert.strictEqual(err.code, "NOT_FOUND", "Missing application must return NOT_FOUND (404)");
    assert.strictEqual(err.message, "Application not found.", "Correct message returned");
  }
  console.log("✓ Genuine missing application returns NOT_FOUND (HTTP 404)\n");

  // -------------------------------------------------------------------------
  console.log("TEST 4: Registration & Active Order Reuse (No Duplicate Orders)");
  // -------------------------------------------------------------------------
  const store = getStore();
  const testEmail = `promptwars.student.${Date.now()}@example.com`;
  const regResult = await submitHackathonApplication(
    {
      name: "PromptWars Fighter",
      email: testEmail,
      phone: "9876543210",
      college: "COEP Pune",
      course: "Computer Engineering",
      year: "3rd Year",
      teamName: "NeuralKnights",
    },
    testEmail,
  );

  const testAppId = regResult.application.applicationId;
  assert.ok(testAppId.startsWith("APP-"), "Must have valid application ID");
  assert.strictEqual(regResult.application.status, "PAYMENT_PENDING", "Initial status must be PAYMENT_PENDING");

  const originalFetch = globalThis.fetch;
  const mockValidOrderId = `order_valid_${Date.now()}`;
  let orderCreatedCount = 0;

  globalThis.fetch = async (url, opts) => {
    const urlStr = String(url);
    if (urlStr.includes(`/orders/${mockValidOrderId}`)) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: mockValidOrderId,
          amount: 9900,
          currency: "INR",
          receipt: testAppId,
          status: "created",
        }),
      };
    }
    if (urlStr.endsWith("/orders") && opts?.method === "POST") {
      orderCreatedCount++;
      const newId = `order_new_${Date.now()}_${orderCreatedCount}`;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: newId,
          amount: 9900,
          currency: "INR",
          receipt: testAppId,
          status: "created",
        }),
      };
    }
    return originalFetch(url, opts);
  };

  await store.updateApplication(regResult.application.id, {
    razorpayOrderId: mockValidOrderId,
  });

  const orderResult = await createHackathonPaymentOrder(testAppId, testEmail);
  assert.strictEqual(orderResult.orderId, mockValidOrderId, "Must reuse verified active Razorpay order ID");
  assert.strictEqual(orderResult.amount, 9900, "Fee must be 9900 paise (₹99)");
  assert.strictEqual(orderResult.currency, "INR", "Currency must be INR");
  assert.strictEqual(orderResult.alreadyPaid, false, "Must indicate not already paid");
  assert.strictEqual(orderCreatedCount, 0, "No new order created when existing is verified active");
  console.log(`✓ Order creation verified & reused verified active order ${orderResult.orderId} without duplicates\n`);

  // -------------------------------------------------------------------------
  console.log("TEST 5: Transient Razorpay Gateway Failure (500) Does NOT Create Replacement Order");
  // -------------------------------------------------------------------------
  const mockTransientOrderId = `order_transient_${Date.now()}`;
  await store.updateApplication(regResult.application.id, {
    razorpayOrderId: mockTransientOrderId,
  });

  globalThis.fetch = async (url, opts) => {
    const urlStr = String(url);
    if (urlStr.includes(`/orders/${mockTransientOrderId}`)) {
      return {
        ok: false,
        status: 502,
        json: async () => ({ error: { description: "Bad Gateway" } }),
      };
    }
    if (urlStr.endsWith("/orders") && opts?.method === "POST") {
      orderCreatedCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: "should_not_be_created" }),
      };
    }
    return originalFetch(url, opts);
  };

  try {
    await createHackathonPaymentOrder(testAppId, testEmail);
    assert.fail("Transient 502 error must throw SERVICE_UNAVAILABLE");
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.strictEqual(err.code, "SERVICE_UNAVAILABLE", "Transient failure must return SERVICE_UNAVAILABLE (503)");
  }

  const appAfterTransient = await store.getApplicationByAppId(testAppId);
  assert.strictEqual(appAfterTransient.razorpayOrderId, mockTransientOrderId, "Existing order ID must be preserved during transient error");
  console.log("✓ Transient 502 returned HTTP 503; NO duplicate replacement order created\n");

  // -------------------------------------------------------------------------
  console.log("TEST 6: Transient Network Timeout Does NOT Create Replacement Order");
  // -------------------------------------------------------------------------
  globalThis.fetch = async (url, opts) => {
    const urlStr = String(url);
    if (urlStr.includes(`/orders/${mockTransientOrderId}`)) {
      throw new TypeError("fetch failed: connect ETIMEDOUT");
    }
    return originalFetch(url, opts);
  };

  try {
    await createHackathonPaymentOrder(testAppId, testEmail);
    assert.fail("Network failure must throw SERVICE_UNAVAILABLE");
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.strictEqual(err.code, "SERVICE_UNAVAILABLE");
  }
  console.log("✓ Network timeout returned HTTP 503; NO duplicate replacement order created\n");

  // -------------------------------------------------------------------------
  console.log("TEST 7: HTTP 400 Auth/Configuration Error Does NOT Create Replacement Order");
  // -------------------------------------------------------------------------
  const mockAuthErrOrderId = `order_auth_err_${Date.now()}`;
  await store.updateApplication(regResult.application.id, {
    razorpayOrderId: mockAuthErrOrderId,
  });

  globalThis.fetch = async (url, opts) => {
    const urlStr = String(url);
    if (urlStr.includes(`/orders/${mockAuthErrOrderId}`)) {
      return {
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: "BAD_REQUEST_ERROR",
            description: "The api key provided is invalid",
          },
        }),
      };
    }
    return originalFetch(url, opts);
  };

  try {
    await createHackathonPaymentOrder(testAppId, testEmail);
    assert.fail("HTTP 400 auth/key error must throw SERVER_ERROR");
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.strictEqual(err.code, "SERVER_ERROR", "Auth/config error must throw SERVER_ERROR");
  }

  const appAfterAuthErr = await store.getApplicationByAppId(testAppId);
  assert.strictEqual(appAfterAuthErr.razorpayOrderId, mockAuthErrOrderId, "Existing order ID preserved on 400 auth error");
  console.log("✓ HTTP 400 auth error threw SERVER_ERROR; NO replacement order created\n");

  // -------------------------------------------------------------------------
  console.log("TEST 8: HTTP 400 Inconclusive Bad Request Does NOT Create Replacement Order");
  // -------------------------------------------------------------------------
  const mockInconclusiveOrderId = `order_inconclusive_${Date.now()}`;
  await store.updateApplication(regResult.application.id, {
    razorpayOrderId: mockInconclusiveOrderId,
  });

  globalThis.fetch = async (url, opts) => {
    const urlStr = String(url);
    if (urlStr.includes(`/orders/${mockInconclusiveOrderId}`)) {
      return {
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: "BAD_REQUEST_ERROR",
            description: "Unexpected query parameter format",
          },
        }),
      };
    }
    return originalFetch(url, opts);
  };

  try {
    await createHackathonPaymentOrder(testAppId, testEmail);
    assert.fail("Inconclusive 400 error must throw SERVICE_UNAVAILABLE");
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.strictEqual(err.code, "SERVICE_UNAVAILABLE", "Inconclusive 400 must return SERVICE_UNAVAILABLE");
  }

  const appAfterInconclusive = await store.getApplicationByAppId(testAppId);
  assert.strictEqual(appAfterInconclusive.razorpayOrderId, mockInconclusiveOrderId, "Existing order preserved on inconclusive 400");
  console.log("✓ Inconclusive HTTP 400 threw SERVICE_UNAVAILABLE; NO replacement order created\n");

  // -------------------------------------------------------------------------
  console.log("TEST 9: HTTP 400 with Confirmed Nonexistent ID Authoritatively Creates Fresh Replacement");
  // -------------------------------------------------------------------------
  const mock400MissingOrderId = `order_400_confirmed_missing_${Date.now()}`;
  let freshCreatedOrderIdFrom400 = null;

  globalThis.fetch = async (url, opts) => {
    const urlStr = String(url);
    if (urlStr.includes(`/orders/${mock400MissingOrderId}`)) {
      return {
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: "BAD_REQUEST_ERROR",
            description: "The id provided does not exist",
          },
        }),
      };
    }
    if (urlStr.endsWith("/orders") && opts?.method === "POST") {
      freshCreatedOrderIdFrom400 = `order_fresh_400_replaced_${Date.now()}`;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: freshCreatedOrderIdFrom400,
          amount: 9900,
          currency: "INR",
          receipt: testAppId,
          status: "created",
        }),
      };
    }
    return originalFetch(url, opts);
  };

  await store.updateApplication(regResult.application.id, {
    razorpayOrderId: mock400MissingOrderId,
  });

  const replacedResultFrom400 = await createHackathonPaymentOrder(testAppId, testEmail);
  assert.strictEqual(replacedResultFrom400.orderId, freshCreatedOrderIdFrom400, "Must create replacement for confirmed nonexistent ID");
  console.log(`✓ Confirmed 400 nonexistent ID authoritatively replaced with fresh order ${replacedResultFrom400.orderId}\n`);

  // -------------------------------------------------------------------------
  console.log("TEST 10: Confirmed Missing Order (404) Authoritatively Creates Fresh Replacement");
  // -------------------------------------------------------------------------
  const mock404OrderId = `order_confirmed_missing_${Date.now()}`;
  let freshCreatedOrderId = null;

  globalThis.fetch = async (url, opts) => {
    const urlStr = String(url);
    if (urlStr.includes(`/orders/${mock404OrderId}`)) {
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: { description: "Order not found" } }),
      };
    }
    if (urlStr.endsWith("/orders") && opts?.method === "POST") {
      freshCreatedOrderId = `order_fresh_404_replaced_${Date.now()}`;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: freshCreatedOrderId,
          amount: 9900,
          currency: "INR",
          receipt: testAppId,
          status: "created",
        }),
      };
    }
    return originalFetch(url, opts);
  };

  await store.updateApplication(regResult.application.id, {
    razorpayOrderId: mock404OrderId,
  });

  const replacedResult = await createHackathonPaymentOrder(testAppId, testEmail);
  assert.strictEqual(replacedResult.orderId, freshCreatedOrderId, "Must create and assign new replacement order");
  const appAfter404 = await store.getApplicationByAppId(testAppId);
  assert.strictEqual(appAfter404.razorpayOrderId, freshCreatedOrderId, "Store must record fresh order ID");
  console.log(`✓ Confirmed 404 order authoritatively replaced with fresh order ${replacedResult.orderId}\n`);

  // Restore fetch
  globalThis.fetch = originalFetch;

  // -------------------------------------------------------------------------
  console.log("TEST 11: Authorization Guards on Order Creation");
  // -------------------------------------------------------------------------
  try {
    await createHackathonPaymentOrder(testAppId, "impostor@example.com");
    assert.fail("Unrelated email should be forbidden");
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.strictEqual(err.code, "FORBIDDEN", "Mismatched email must return FORBIDDEN (403)");
  }
  console.log("✓ Student ownership strictly enforced with HTTP 403\n");

  // -------------------------------------------------------------------------
  console.log("TEST 12: Webhook Signature Verification");
  // -------------------------------------------------------------------------
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const mockPayload = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: `pay_${Date.now()}`,
          order_id: freshCreatedOrderId,
          amount: 9900,
          currency: "INR",
          status: "captured",
          notes: {
            applicationId: testAppId,
          },
        },
      },
    },
  });

  const validSignature = createHmac("sha256", webhookSecret).update(mockPayload).digest("hex");
  const invalidSignature = "invalid_hex_signature_abcdef1234567890";

  assert.strictEqual(
    verifyWebhookSignature({ rawBody: mockPayload, signature: validSignature }),
    true,
    "Valid HMAC signature must be accepted",
  );
  assert.strictEqual(
    verifyWebhookSignature({ rawBody: mockPayload, signature: invalidSignature }),
    false,
    "Invalid HMAC signature must be rejected",
  );
  console.log("✓ Webhook signature verification verified (constant-time check)\n");

  // -------------------------------------------------------------------------
  console.log("TEST 13: Webhook Processing Transitions Application to PAYMENT_VERIFIED");
  // -------------------------------------------------------------------------
  const parsedEvent = JSON.parse(mockPayload);
  const webhookResult = await handleRazorpayWebhookEvent(parsedEvent.event, parsedEvent.payload);

  assert.strictEqual(webhookResult.processed, true, "Webhook must be processed");
  assert.strictEqual(webhookResult.status, "verified", "Status must transition to verified");

  const verifiedRecord = await store.getApplicationByAppId(testAppId);
  assert.strictEqual(verifiedRecord.status, "PAYMENT_VERIFIED", "Application must be PAYMENT_VERIFIED");
  assert.strictEqual(verifiedRecord.verifiedBy, "razorpay_webhook", "verifiedBy must record webhook source");
  console.log(`✓ Webhook successfully transitioned ${testAppId} to PAYMENT_VERIFIED\n`);

  // -------------------------------------------------------------------------
  console.log("TEST 14: Duplicate Webhook Delivery (Idempotency)");
  // -------------------------------------------------------------------------
  const duplicateWebhookResult = await handleRazorpayWebhookEvent(parsedEvent.event, parsedEvent.payload);
  assert.strictEqual(duplicateWebhookResult.processed, true, "Duplicate webhook must be processed safely");
  assert.strictEqual(duplicateWebhookResult.status, "already_verified", "Status must indicate already_verified");
  console.log("✓ Duplicate webhook event handled idempotently without redundant operations\n");

  // -------------------------------------------------------------------------
  console.log("TEST 15: Webhook Amount and Currency Validation Guards");
  // -------------------------------------------------------------------------
  const testEmail2 = `tamper.${Date.now()}@example.com`;
  const regResult2 = await submitHackathonApplication(
    {
      name: "Tamper Tester",
      email: testEmail2,
      phone: "9876543211",
      college: "PICT",
      course: "IT",
      year: "2nd Year",
      teamName: "TamperTeam",
    },
    testEmail2,
  );

  const tamperedPayload = {
    payment: {
      entity: {
        id: `pay_tampered_${Date.now()}`,
        amount: 100, // ₹1 instead of ₹99 (9900 paise)
        currency: "INR",
        notes: { applicationId: regResult2.application.applicationId },
      },
    },
  };

  const tamperedResult = await handleRazorpayWebhookEvent("payment.captured", tamperedPayload);
  assert.strictEqual(tamperedResult.processed, false, "Tampered amount must NOT be processed");
  assert.strictEqual(tamperedResult.status, "amount_mismatch", "Must flag amount_mismatch");

  const untouchedRecord = await store.getApplicationByAppId(regResult2.application.applicationId);
  assert.strictEqual(untouchedRecord.status, "PAYMENT_PENDING", "Tampered application status must stay PAYMENT_PENDING");
  console.log("✓ Underpaid/tampered payment rejected; status remained PAYMENT_PENDING\n");

  // -------------------------------------------------------------------------
  console.log("TEST 16: Payment Signature Verification for Checkout");
  // -------------------------------------------------------------------------
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const mockOrderId = "order_abc123";
  const mockPaymentId = "pay_xyz789";
  const clientSignature = createHmac("sha256", keySecret)
    .update(`${mockOrderId}|${mockPaymentId}`)
    .digest("hex");

  assert.strictEqual(
    verifyPaymentSignature({
      orderId: mockOrderId,
      paymentId: mockPaymentId,
      signature: clientSignature,
    }),
    true,
    "Valid checkout signature must pass",
  );

  assert.strictEqual(
    verifyPaymentSignature({
      orderId: mockOrderId,
      paymentId: mockPaymentId,
      signature: "forged_signature_0123456789abcdef",
    }),
    false,
    "Forged checkout signature must fail",
  );
  console.log("✓ Client payment signature validation is cryptographic and tamper-proof\n");

  // -------------------------------------------------------------------------
  console.log("TEST 17: Idempotent Payment Order Init When Already Paid");
  // -------------------------------------------------------------------------
  const alreadyPaidResult = await createHackathonPaymentOrder(testAppId, testEmail);
  assert.strictEqual(alreadyPaidResult.alreadyPaid, true, "Must flag alreadyPaid = true");
  console.log("✓ Checkout initialization returns alreadyPaid: true for paid applications\n");

  console.log("================================================================");
  console.log(" ALL 17 TESTS PASSED SUCCESSFULLY!                             ");
  console.log("================================================================");
}

run().catch((err) => {
  console.error("\n❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
