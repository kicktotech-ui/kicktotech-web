import { getStore, type ApplicationRecord } from "./data";
import { applicationId as makeAppId } from "./crypto";
import { AppError } from "./http";
import {
  getPaymentConfig,
  buildWhatsappUrl,
  type PublicPaymentInfo,
} from "./payments/config";
import type {
  HackathonApplicationInput,
  RazorpayPaymentVerifyInput,
} from "./validation";
import { sendBrevoTemplateEmail } from "./email/brevo";
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  fetchRazorpayPayment,
  getRazorpayConfig,
} from "./payments/razorpay";

/*
 * Hack2Skill hackathon application service — powered by Razorpay Standard Checkout.
 *
 * Integrates official server-side Razorpay Orders, constant-time signature verification,
 * Brevo Template #5 confirmation email automation (with duplicate-send protection),
 * and an idempotent webhook handler.
 */

/** Stable event identifier stored in the `domain` field of ApplicationRecord. */
export const HACK2SKILL_EVENT = "hack2skill";

/** Fixed Hackathon fee constants strictly determined on the server. */
export const HACKATHON_FEE_INR = 99;
export const HACKATHON_FEE_PAISE = 9900;
export const HACKATHON_CURRENCY = "INR";

function dedupeKeyFor(email: string): string {
  return `${email.trim().toLowerCase()}:${HACK2SKILL_EVENT}`;
}

/** Return the ₹99 hackathon payment config (legacy compatibility helper). */
function getHackathonPaymentConfig() {
  const base = getPaymentConfig();
  const amount = HACKATHON_FEE_INR;
  return {
    ...base,
    amount,
    note: process.env.HACKATHON_PAYMENT_NOTE?.trim() || "PromptWars × KICK To TECH registration fee",
    messageTemplate:
      process.env.HACKATHON_WHATSAPP_TEMPLATE?.trim() ||
      "Hello, I have completed the PromptWars registration payment.\n\nName: {name}\nApplication ID: {applicationId}\nAmount: ₹{amount}",
  };
}

/** Build the public-safe payment info (kept for backward compatibility). */
function hackathonPublicPaymentInfo(cfg = getHackathonPaymentConfig()): PublicPaymentInfo {
  return {
    upiId: cfg.upiId,
    payeeName: cfg.payeeName,
    amount: cfg.amount,
    currency: cfg.currency,
    upiUri: "",
    whatsappNumber: cfg.whatsappNumber,
    whatsappConfigured: Boolean(cfg.whatsappNumber),
  };
}

export interface HackathonSubmitResult {
  application: ApplicationRecord;
  duplicate: boolean;
  payment: PublicPaymentInfo;
  whatsappUrl: string | null;
}

/**
 * Submit or retrieve an existing Hack2Skill hackathon application.
 * Authoritative identity comes from the authenticated session.
 */
export async function submitHackathonApplication(
  input: HackathonApplicationInput,
  authenticatedEmail: string,
): Promise<HackathonSubmitResult> {
  const store = getStore();
  const cfg = getHackathonPaymentConfig();
  const verifiedEmail = authenticatedEmail.trim().toLowerCase();
  const dedupeKey = dedupeKeyFor(verifiedEmail);

  // Idempotent: same verified email for hack2skill reuses the record (unless rejected).
  let application = await store.getApplicationByDedupeKey(dedupeKey);
  let duplicate = false;

  if (application && application.status !== "PAYMENT_REJECTED") {
    duplicate = true;
  } else if (application && application.status === "PAYMENT_REJECTED") {
    application = await store.updateApplication(application.id, {
      status: "PAYMENT_PENDING",
      reviewNote: undefined,
      updatedAt: new Date().toISOString(),
    });
  } else {
    const now = new Date().toISOString();
    const record: ApplicationRecord = {
      id: store.newId(),
      applicationId: makeAppId(),
      name: input.name,
      email: verifiedEmail,
      phone: input.phone,
      college: input.college,
      course: input.course,
      year: input.year,
      schoolName: input.teamName,
      domain: HACK2SKILL_EVENT,
      amount: HACKATHON_FEE_INR,
      status: "PAYMENT_PENDING",
      createdAt: now,
      updatedAt: now,
      dedupeKey,
    };
    application = await store.createApplication(record);
  }

  if (!application) throw new AppError("SERVER_ERROR", "Could not create the application.");

  const whatsappUrl = buildWhatsappUrl(cfg, {
    name: application.name,
    domain: "Hack2Skill Hackathon",
    applicationId: application.applicationId,
  });
  return { application, duplicate, payment: hackathonPublicPaymentInfo(cfg), whatsappUrl };
}

// ---------------------------------------------------------------------------
// Razorpay Order Creation & Verification
// ---------------------------------------------------------------------------

export interface RazorpayOrderInitResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  applicationId: string;
  alreadyPaid?: boolean;
}

/**
 * Create or reuse a Razorpay Order for an existing pending Hack2Skill application.
 * Strictly enforces server-side amount (₹99 = 9900 paise) and student ownership.
 */
export async function createHackathonPaymentOrder(
  applicationId: string,
  authenticatedEmail: string,
): Promise<RazorpayOrderInitResult> {
  const store = getStore();
  const app = await store.getApplicationByAppId(applicationId);
  if (!app) throw new AppError("NOT_FOUND", "Application not found.");

  if (app.domain !== HACK2SKILL_EVENT) {
    throw new AppError("VALIDATION_ERROR", "This endpoint is only for Hack2Skill applications.");
  }

  if (app.email.trim().toLowerCase() !== authenticatedEmail.trim().toLowerCase()) {
    throw new AppError("FORBIDDEN", "You are not authorized to pay for this application.");
  }

  // Already paid guard
  if (app.status === "PAYMENT_VERIFIED" || app.status === "CERTIFICATE_ISSUED") {
    const { keyId } = getRazorpayConfig();
    return {
      orderId: app.razorpayOrderId ?? "",
      amount: HACKATHON_FEE_PAISE,
      currency: HACKATHON_CURRENCY,
      keyId,
      applicationId: app.applicationId,
      alreadyPaid: true,
    };
  }

  const { keyId } = getRazorpayConfig();

  // Create order on Razorpay
  const order = await createRazorpayOrder({
    applicationId: app.applicationId,
    amountPaise: HACKATHON_FEE_PAISE,
    currency: HACKATHON_CURRENCY,
    notes: {
      applicationId: app.applicationId,
      email: app.email,
      name: app.name,
    },
  });

  // Associate order with application
  await store.updateApplication(app.id, {
    razorpayOrderId: order.id,
    updatedAt: new Date().toISOString(),
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId,
    applicationId: app.applicationId,
    alreadyPaid: false,
  };
}

/**
 * Verify client-submitted payment details.
 *
 * Checks:
 * 1. Application exists and belongs to the authenticated student.
 * 2. Idempotent check (if already verified, returns immediately).
 * 3. Constant-time payment signature verification.
 * 4. Order ID matches the application's assigned order ID.
 * 5. Authoritative validation against Razorpay API (amount, currency, captured/authorized status).
 * 6. Marks application PAYMENT_VERIFIED and triggers Brevo confirmation email (Template #5).
 */
export async function verifyHackathonPayment(
  input: RazorpayPaymentVerifyInput,
  authenticatedEmail: string,
): Promise<{ application: ApplicationRecord; verified: boolean; duplicate: boolean }> {
  const store = getStore();
  const app = await store.getApplicationByAppId(input.applicationId);
  if (!app) throw new AppError("NOT_FOUND", "Application not found.");

  if (app.domain !== HACK2SKILL_EVENT) {
    throw new AppError("VALIDATION_ERROR", "This endpoint is only for Hack2Skill applications.");
  }

  if (app.email.trim().toLowerCase() !== authenticatedEmail.trim().toLowerCase()) {
    throw new AppError("FORBIDDEN", "You are not authorized to verify payment for this application.");
  }

  // Idempotency: if already verified, skip repeated processing and email.
  if (app.status === "PAYMENT_VERIFIED" || app.status === "CERTIFICATE_ISSUED") {
    return { application: app, verified: true, duplicate: true };
  }

  // 1. Verify payment signature
  const validSignature = verifyPaymentSignature({
    orderId: input.razorpay_order_id,
    paymentId: input.razorpay_payment_id,
    signature: input.razorpay_signature,
  });

  if (!validSignature) {
    console.warn(`[hackathon] Invalid signature for application ${app.applicationId}`);
    throw new AppError("VALIDATION_ERROR", "Payment verification failed: invalid signature.");
  }

  // 2. Verify order match
  if (app.razorpayOrderId && app.razorpayOrderId !== input.razorpay_order_id) {
    console.warn(
      `[hackathon] Order mismatch for ${app.applicationId}: expected ${app.razorpayOrderId}, got ${input.razorpay_order_id}`,
    );
    throw new AppError("CONFLICT", "Payment does not match the active order for this application.");
  }

  // 3. Verify authoritative details from Razorpay API
  const paymentDetails = await fetchRazorpayPayment(input.razorpay_payment_id);
  if (paymentDetails) {
    if (paymentDetails.amount !== HACKATHON_FEE_PAISE) {
      console.warn(
        `[hackathon] Amount mismatch for ${app.applicationId}: expected ${HACKATHON_FEE_PAISE}, got ${paymentDetails.amount}`,
      );
      throw new AppError("VALIDATION_ERROR", "Payment verification failed: incorrect amount.");
    }
    if (paymentDetails.currency !== HACKATHON_CURRENCY) {
      console.warn(
        `[hackathon] Currency mismatch for ${app.applicationId}: expected ${HACKATHON_CURRENCY}, got ${paymentDetails.currency}`,
      );
      throw new AppError("VALIDATION_ERROR", "Payment verification failed: unexpected currency.");
    }
    if (paymentDetails.orderId && paymentDetails.orderId !== input.razorpay_order_id) {
      throw new AppError("CONFLICT", "Payment order ID mismatch.");
    }
    if (paymentDetails.status !== "captured" && paymentDetails.status !== "authorized") {
      throw new AppError("CONFLICT", `Payment is not in captured status (${paymentDetails.status}).`);
    }
  }

  // 4. Update status to PAYMENT_VERIFIED
  const now = new Date().toISOString();
  const updated = await store.updateApplication(app.id, {
    status: "PAYMENT_VERIFIED",
    razorpayOrderId: input.razorpay_order_id,
    razorpayPaymentId: input.razorpay_payment_id,
    razorpaySignature: input.razorpay_signature,
    paymentMethod: paymentDetails?.method ?? "razorpay",
    verifiedBy: "razorpay_checkout",
    verifiedAt: now,
    updatedAt: now,
  });

  const verifiedApp = updated ?? app;

  // 5. Trigger Brevo Template ID 5 (non-blocking for payment response, but awaited safe)
  try {
    await sendHackathonConfirmationEmail(verifiedApp);
  } catch (emailErr) {
    console.error(`[hackathon] Post-checkout confirmation email failed for ${app.applicationId}:`, emailErr);
  }

  return { application: verifiedApp, verified: true, duplicate: false };
}

/**
 * Handle incoming Razorpay Webhook events.
 *
 * Supported events:
 * - payment.captured
 * - order.paid
 * - payment.failed
 */
export async function handleRazorpayWebhookEvent(
  event: string,
  payload: Record<string, unknown>,
): Promise<{ processed: boolean; status: string; applicationId?: string }> {
  const store = getStore();

  if (event === "payment.captured" || event === "order.paid") {
    const paymentEntity = (payload.payment as { entity?: Record<string, unknown> } | undefined)?.entity;
    const orderEntity = (payload.order as { entity?: Record<string, unknown> } | undefined)?.entity;

    const orderId = (orderEntity?.id as string) || (paymentEntity?.order_id as string);
    const paymentId = (paymentEntity?.id as string) || undefined;
    const amount = Number(paymentEntity?.amount ?? orderEntity?.amount ?? 0);
    const currency = (paymentEntity?.currency as string) || (orderEntity?.currency as string) || "INR";
    const notes = ((paymentEntity?.notes || orderEntity?.notes) as Record<string, string>) || {};

    const targetAppId = notes.applicationId;

    let app: ApplicationRecord | null = null;
    if (targetAppId) {
      app = await store.getApplicationByAppId(targetAppId);
    }
    if (!app && orderId) {
      app = await store.getApplicationByRazorpayOrderId(orderId);
    }

    if (!app) {
      console.warn(`[webhook] No matching application found for order ${orderId} / app ${targetAppId}`);
      return { processed: false, status: "application_not_found" };
    }

    // Validate amount and currency
    if (amount !== HACKATHON_FEE_PAISE) {
      console.warn(`[webhook] Webhook amount mismatch for ${app.applicationId}: got ${amount}`);
      return { processed: false, status: "amount_mismatch", applicationId: app.applicationId };
    }
    if (currency !== HACKATHON_CURRENCY) {
      console.warn(`[webhook] Webhook currency mismatch for ${app.applicationId}: got ${currency}`);
      return { processed: false, status: "currency_mismatch", applicationId: app.applicationId };
    }

    // If already verified, ensure payment details are updated and email is sent if previously missed
    if (app.status === "PAYMENT_VERIFIED" || app.status === "CERTIFICATE_ISSUED") {
      if (paymentId && !app.razorpayPaymentId) {
        await store.updateApplication(app.id, {
          razorpayPaymentId: paymentId,
          updatedAt: new Date().toISOString(),
        });
      }
      if (!app.confirmationEmailSentAt) {
        try {
          await sendHackathonConfirmationEmail(app);
        } catch (e) {
          console.error(`[webhook] Retry confirmation email failed for ${app.applicationId}:`, e);
        }
      }
      return { processed: true, status: "already_verified", applicationId: app.applicationId };
    }

    // Transition status to PAYMENT_VERIFIED
    const now = new Date().toISOString();
    const updated = await store.updateApplication(app.id, {
      status: "PAYMENT_VERIFIED",
      razorpayOrderId: orderId || app.razorpayOrderId,
      razorpayPaymentId: paymentId || app.razorpayPaymentId,
      paymentMethod: (paymentEntity?.method as string) || "razorpay",
      verifiedBy: "razorpay_webhook",
      verifiedAt: now,
      updatedAt: now,
    });

    const verifiedApp = updated ?? app;

    try {
      await sendHackathonConfirmationEmail(verifiedApp);
    } catch (e) {
      console.error(`[webhook] Confirmation email failed for ${app.applicationId}:`, e);
    }

    return { processed: true, status: "verified", applicationId: app.applicationId };
  }

  if (event === "payment.failed") {
    const paymentEntity = (payload.payment as { entity?: Record<string, unknown> } | undefined)?.entity;
    const orderId = paymentEntity?.order_id as string | undefined;
    const notes = (paymentEntity?.notes as Record<string, string>) || {};
    const targetAppId = notes.applicationId;

    console.info(`[webhook] Payment failed event for order ${orderId} / app ${targetAppId}`);
    return { processed: true, status: "payment_failed_recorded", applicationId: targetAppId };
  }

  return { processed: true, status: "ignored_event" };
}

/**
 * Retrieve authoritative payment and application status.
 */
export async function getHackathonPaymentStatus(
  applicationId: string,
  authenticatedEmail: string,
): Promise<{
  applicationId: string;
  status: string;
  isPaid: boolean;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  confirmationEmailSentAt?: string;
}> {
  const store = getStore();
  const app = await store.getApplicationByAppId(applicationId);
  if (!app) throw new AppError("NOT_FOUND", "Application not found.");

  if (app.domain !== HACK2SKILL_EVENT) {
    throw new AppError("VALIDATION_ERROR", "This endpoint is only for Hack2Skill applications.");
  }

  if (app.email.trim().toLowerCase() !== authenticatedEmail.trim().toLowerCase()) {
    throw new AppError("FORBIDDEN", "You are not authorized to check this application.");
  }

  const isPaid = app.status === "PAYMENT_VERIFIED" || app.status === "CERTIFICATE_ISSUED";

  return {
    applicationId: app.applicationId,
    status: app.status,
    isPaid,
    razorpayOrderId: app.razorpayOrderId,
    razorpayPaymentId: app.razorpayPaymentId,
    confirmationEmailSentAt: app.confirmationEmailSentAt,
  };
}

/** Legacy proof submission handler preserved for backward compatibility. */
export async function submitHackathonPaymentProof(
  applicationId: string,
  authenticatedEmail?: string,
): Promise<{ application: ApplicationRecord }> {
  const store = getStore();
  const app = await store.getApplicationByAppId(applicationId);
  if (!app) throw new AppError("NOT_FOUND", "Application not found.");

  if (app.domain !== HACK2SKILL_EVENT) {
    throw new AppError("VALIDATION_ERROR", "This endpoint is only for Hack2Skill applications.");
  }

  if (authenticatedEmail && app.email.trim().toLowerCase() !== authenticatedEmail.trim().toLowerCase()) {
    throw new AppError("FORBIDDEN", "You are not authorized to submit payment proof for this application.");
  }

  let current = app;
  if (app.status === "PAYMENT_PENDING") {
    const updated = await store.updateApplication(app.id, {
      status: "PAYMENT_PROOF_SUBMITTED",
      updatedAt: new Date().toISOString(),
    });
    current = updated ?? app;
  }

  return { application: current };
}

// ---------------------------------------------------------------------------
// Brevo hackathon confirmation email
// ---------------------------------------------------------------------------

/**
 * Send the Hack2Skill confirmation email via Brevo template #5.
 *
 * Guards:
 *  - Skips if `confirmationEmailSentAt` is already set (idempotent).
 *  - Updates the application with `confirmationEmailSentAt` only on success.
 *  - Does NOT silently swallow failures — throws so caller knows it failed.
 */
export async function sendHackathonConfirmationEmail(app: ApplicationRecord): Promise<{ sent: boolean }> {
  // Duplicate-send guard
  if (app.confirmationEmailSentAt) {
    console.info(`[hackathon] Confirmation email already sent for ${app.applicationId} at ${app.confirmationEmailSentAt}`);
    return { sent: false };
  }

  if (!app.email) {
    console.warn(`[hackathon] No email address for application ${app.applicationId}, skipping email.`);
    return { sent: false };
  }

  const templateId = Number(process.env.BREVO_HACKATHON_TEMPLATE_ID ?? 5);
  if (!templateId) {
    console.warn(`[hackathon] BREVO_HACKATHON_TEMPLATE_ID not configured, skipping email.`);
    return { sent: false };
  }

  const result = await sendBrevoTemplateEmail({
    to: { email: app.email, name: app.name },
    templateId,
    params: {
      name: app.name,
      email: app.email,
      event: "Hack2Skill Hackathon",
      applicationId: app.applicationId,
      amount: app.amount ?? HACKATHON_FEE_INR,
      teamName: app.schoolName ?? "",
      college: app.college ?? "",
      hack2skillUrl: "https://hack2skill.com/event/promptwars-x-kicktotech-promptwars-2026?utm_source=hack2skill&utm_medium=homepage",
    },
  });

  if (!result.success) {
    console.error(`[hackathon] Confirmation email FAILED for ${app.applicationId}: ${result.error}`);
    throw new Error(`Brevo email failed for ${app.applicationId}: ${result.error}`);
  }

  // Mark as sent to prevent duplicates on retry.
  const store = getStore();
  await store.updateApplication(app.id, { confirmationEmailSentAt: new Date().toISOString() });
  console.info(`[hackathon] Confirmation email sent for application ${app.applicationId}`);
  return { sent: true };
}
