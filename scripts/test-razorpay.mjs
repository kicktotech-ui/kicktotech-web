import assert from "node:assert";
import { createHmac } from "node:crypto";
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../src/server/payments/razorpay.ts";
import {
  handleRazorpayWebhookEvent,
  HACK2SKILL_EVENT,
  HACKATHON_FEE_PAISE,
  HACKATHON_CURRENCY,
} from "../src/server/hackathonApplications.ts";
import { getStore } from "../src/server/data/index.ts";

// Set mock environment variables for test execution
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_dummy_key_id";
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "dummy_secret_key_123456789";
process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "dummy_webhook_secret_abcdef";
process.env.BREVO_API_KEY = "test_brevo_key";
process.env.BREVO_SENDER_EMAIL = "test@kicktotech.in";
process.env.BREVO_HACKATHON_TEMPLATE_ID = "5";

async function runTests() {
  console.log("=================================================");
  console.log("KICK TO TECH × RAZORPAY INTEGRATION TEST SUITE");
  console.log("=================================================\n");

  const store = getStore();

  // Test 1: Payment Signature Verification
  console.log("Test 1: Checkout Payment Signature Verification");
  const testOrderId = "order_O8xG8x12345678";
  const testPaymentId = "pay_P8yH8y12345678";
  const expectedPaymentSignature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest("hex");

  const validPayment = verifyPaymentSignature({
    orderId: testOrderId,
    paymentId: testPaymentId,
    signature: expectedPaymentSignature,
  });
  assert.strictEqual(validPayment, true, "Valid payment signature must verify successfully");

  const invalidPayment = verifyPaymentSignature({
    orderId: testOrderId,
    paymentId: testPaymentId,
    signature: "invalid_signature_hex_value_0000000000000000000000000000000000000000000000000000000000000000",
  });
  assert.strictEqual(invalidPayment, false, "Tampered signature must be rejected");

  const mismatchedOrder = verifyPaymentSignature({
    orderId: "order_different_order_id",
    paymentId: testPaymentId,
    signature: expectedPaymentSignature,
  });
  assert.strictEqual(mismatchedOrder, false, "Mismatched order ID must fail verification");
  console.log("  ✓ Valid signature passed");
  console.log("  ✓ Tampered signature rejected");
  console.log("  ✓ Order mismatch rejected\n");

  // Test 2: Webhook Signature Verification
  console.log("Test 2: Webhook Signature Verification (Raw Body HMAC-SHA256)");
  const mockWebhookBody = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_test_captured_1",
          order_id: "order_test_1",
          amount: 9900,
          currency: "INR",
          status: "captured",
          notes: { applicationId: "APP-2026-TEST01" },
        },
      },
    },
  });

  const expectedWebhookSignature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(mockWebhookBody)
    .digest("hex");

  const validWebhook = verifyWebhookSignature({
    rawBody: mockWebhookBody,
    signature: expectedWebhookSignature,
  });
  assert.strictEqual(validWebhook, true, "Valid webhook signature must pass");

  const tamperedWebhook = verifyWebhookSignature({
    rawBody: mockWebhookBody + " ",
    signature: expectedWebhookSignature,
  });
  assert.strictEqual(tamperedWebhook, false, "Tampered webhook payload must fail verification");
  console.log("  ✓ Valid webhook signature passed");
  console.log("  ✓ Tampered body rejected\n");

  // Test 3: Application Storage & getApplicationByRazorpayOrderId
  console.log("Test 3: Application DataStore & Razorpay Order Mapping");
  const testAppId = `APP-2026-${Date.now().toString().slice(-6)}`;
  const testRecord = {
    id: store.newId(),
    applicationId: testAppId,
    name: "Aarav Sharma",
    email: `aarav.${Date.now()}@example.com`,
    phone: "9876543210",
    college: "JSPM Pune",
    domain: HACK2SKILL_EVENT,
    amount: 99,
    status: "PAYMENT_PENDING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dedupeKey: `aarav.${Date.now()}@example.com:${HACK2SKILL_EVENT}`,
    razorpayOrderId: "order_aarav_001",
  };
  await store.createApplication(testRecord);

  const foundByOrder = await store.getApplicationByRazorpayOrderId("order_aarav_001");
  assert.ok(foundByOrder, "Application must be queryable by razorpayOrderId");
  assert.strictEqual(foundByOrder.applicationId, testAppId);
  console.log(`  ✓ Application ${testAppId} created and retrieved via razorpayOrderId\n`);

  // Test 4: Webhook payment.captured processing
  console.log("Test 4: Webhook Event Handling (payment.captured)");
  const webhookResult = await handleRazorpayWebhookEvent("payment.captured", {
    payment: {
      entity: {
        id: "pay_aarav_success_1",
        order_id: "order_aarav_001",
        amount: HACKATHON_FEE_PAISE,
        currency: HACKATHON_CURRENCY,
        status: "captured",
        method: "upi",
        notes: { applicationId: testAppId },
      },
    },
  });

  assert.strictEqual(webhookResult.processed, true, "Webhook should process successfully");
  assert.strictEqual(webhookResult.status, "verified", "Status should transition to verified");

  const updatedApp = await store.getApplicationByAppId(testAppId);
  assert.ok(updatedApp);
  assert.strictEqual(updatedApp.status, "PAYMENT_VERIFIED", "Application status must be PAYMENT_VERIFIED");
  assert.strictEqual(updatedApp.razorpayPaymentId, "pay_aarav_success_1");
  assert.strictEqual(updatedApp.verifiedBy, "razorpay_webhook");
  console.log("  ✓ Application transitioned to PAYMENT_VERIFIED");
  console.log("  ✓ Payment ID and verifiedBy recorded accurately\n");

  // Test 5: Webhook Idempotency (duplicate delivery)
  console.log("Test 5: Webhook Idempotency & Duplicate Protection");
  const duplicateWebhookResult = await handleRazorpayWebhookEvent("payment.captured", {
    payment: {
      entity: {
        id: "pay_aarav_success_1",
        order_id: "order_aarav_001",
        amount: HACKATHON_FEE_PAISE,
        currency: HACKATHON_CURRENCY,
        status: "captured",
        notes: { applicationId: testAppId },
      },
    },
  });

  assert.strictEqual(duplicateWebhookResult.processed, true);
  assert.strictEqual(duplicateWebhookResult.status, "already_verified");
  console.log("  ✓ Duplicate webhook safely ignored without re-verifying\n");

  // Test 6: Amount and Currency Safety
  console.log("Test 6: Amount & Currency Validation Guard");
  const badAmountAppId = `APP-2026-${Date.now().toString().slice(-6)}`;
  await store.createApplication({
    id: store.newId(),
    applicationId: badAmountAppId,
    name: "Test User",
    email: `test.${Date.now()}@example.com`,
    phone: "9876543211",
    domain: HACK2SKILL_EVENT,
    amount: 99,
    status: "PAYMENT_PENDING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dedupeKey: `test.${Date.now()}@example.com:${HACK2SKILL_EVENT}`,
    razorpayOrderId: "order_bad_amount_1",
  });

  const wrongAmountResult = await handleRazorpayWebhookEvent("payment.captured", {
    payment: {
      entity: {
        id: "pay_bad_amount",
        order_id: "order_bad_amount_1",
        amount: 5000, // ₹50 instead of ₹99 (9900 paise)
        currency: "INR",
        status: "captured",
        notes: { applicationId: badAmountAppId },
      },
    },
  });
  assert.strictEqual(wrongAmountResult.processed, false, "Wrong amount must NOT be processed");
  assert.strictEqual(wrongAmountResult.status, "amount_mismatch");

  const appAfterBadPayment = await store.getApplicationByAppId(badAmountAppId);
  assert.strictEqual(appAfterBadPayment.status, "PAYMENT_PENDING", "Application must remain PAYMENT_PENDING");
  console.log("  ✓ Underpaid amount rejected; status remained PAYMENT_PENDING\n");

  console.log("=================================================");
  console.log("ALL 6 TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
