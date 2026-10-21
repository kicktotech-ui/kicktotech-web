import { getStore, type ApplicationRecord } from "./data";
import { applicationId as makeAppId } from "./crypto";
import { AppError } from "./http";
import {
  getPaymentConfig,
  buildWhatsappUrl,
  type PublicPaymentInfo,
} from "./payments/config";
import type { HackathonApplicationInput } from "./validation";
import { sendBrevoTemplateEmail } from "./email/brevo";

/*
 * Hack2Skill hackathon application service.
 *
 * Reuses the same DataStore / ApplicationRecord as internship, but stores a
 * distinct `domain` value ("hack2skill") and uses its own payment amount (₹99)
 * and Brevo template. This keeps the existing internship flow untouched while
 * sharing the same data layer, admin panel, and payment verification workflow.
 */

/** Stable event identifier stored in the `domain` field of ApplicationRecord. */
const HACK2SKILL_EVENT = "hack2skill";

function dedupeKeyFor(email: string): string {
  return `${email.trim().toLowerCase()}:${HACK2SKILL_EVENT}`;
}

/** Return the ₹99 hackathon payment config, reusing existing UPI/WhatsApp env vars. */
function getHackathonPaymentConfig() {
  const base = getPaymentConfig();
  const amount = Number(process.env.HACKATHON_PAYMENT_AMOUNT ?? 99) || 99;
  return {
    ...base,
    amount,
    note: process.env.HACKATHON_PAYMENT_NOTE?.trim() || "Hack2Skill hackathon registration fee",
    messageTemplate:
      process.env.HACKATHON_WHATSAPP_TEMPLATE?.trim() ||
      "Hello, I have completed the Hack2Skill hackathon registration payment.\n\nName: {name}\nEvent: Hack2Skill Hackathon\nApplication ID: {applicationId}\nAmount: ₹{amount}\n\nI am sending my payment proof for verification.",
  };
}

/** Build the public-safe payment info for the hackathon QR flow. */
function hackathonPublicPaymentInfo(cfg = getHackathonPaymentConfig()): PublicPaymentInfo {
  return {
    upiId: cfg.upiId,
    payeeName: cfg.payeeName,
    amount: cfg.amount,
    currency: cfg.currency,
    // Not used — client shows the static QR image instead of generating from URI.
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

export async function submitHackathonApplication(
  input: HackathonApplicationInput,
): Promise<HackathonSubmitResult> {
  const store = getStore();
  const cfg = getHackathonPaymentConfig();
  const dedupeKey = dedupeKeyFor(input.email);

  // Idempotent: same email for hack2skill reuses the record (unless rejected).
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
      email: input.email,
      phone: input.phone,
      college: input.college,
      // Hackathon-specific fields stored in optional ApplicationRecord fields
      course: input.course,
      year: input.year,
      // Store team name in `schoolName` (reusing existing field; no schema migration)
      schoolName: input.teamName,
      domain: HACK2SKILL_EVENT,
      amount: cfg.amount,
      status: "PAYMENT_PENDING",
      createdAt: now,
      updatedAt: now,
      dedupeKey,
    };
    application = await store.createApplication(record);
    // Email is NOT sent here — it is triggered only after admin payment verification.
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
// Hackathon proof submission (triggers confirmation email immediately)
// ---------------------------------------------------------------------------

/**
 * Hackathon-specific proof submission handler.
 *
 * 1. Looks up the application by human-readable applicationId.
 * 2. Validates it is a hack2skill application.
 * 3. Transitions status to PAYMENT_PROOF_SUBMITTED (if not already past that).
 * 4. Triggers the confirmation email (template #5) using the registered email.
 *    The email is idempotent — `confirmationEmailSentAt` prevents duplicates.
 *
 * Returns the updated application record plus email delivery status.
 */
export async function submitHackathonPaymentProof(
  applicationId: string,
): Promise<{ application: ApplicationRecord; emailSent: boolean; emailAlreadySent: boolean }> {
  const store = getStore();
  const app = await store.getApplicationByAppId(applicationId);
  if (!app) throw new AppError("NOT_FOUND", "Application not found.");

  // Only handle hack2skill applications through this path.
  if (app.domain !== HACK2SKILL_EVENT) {
    throw new AppError("VALIDATION_ERROR", "This endpoint is only for Hack2Skill applications.");
  }

  // Transition status (idempotent — skip if already at or past PROOF_SUBMITTED).
  let current = app;
  if (app.status === "PAYMENT_PENDING") {
    const updated = await store.updateApplication(app.id, {
      status: "PAYMENT_PROOF_SUBMITTED",
      updatedAt: new Date().toISOString(),
    });
    current = updated ?? app;
  }
  // If already PAYMENT_PROOF_SUBMITTED, PAYMENT_VERIFIED, or CERTIFICATE_ISSUED,
  // we still attempt the email (the idempotency guard inside handles duplicates).

  // Trigger confirmation email (idempotent via confirmationEmailSentAt).
  let emailSent = false;
  let emailAlreadySent = false;

  // Re-read from store to get the latest confirmationEmailSentAt value
  const freshApp = await store.getApplicationByAppId(applicationId);
  const appForEmail = freshApp ?? current;

  if (appForEmail.confirmationEmailSentAt) {
    emailAlreadySent = true;
    console.info(`[hackathon] Email already sent for ${applicationId}, skipping.`);
  } else {
    try {
      const result = await sendHackathonConfirmationEmail(appForEmail);
      emailSent = result.sent;
    } catch (err) {
      // Log the failure but do NOT throw — proof submission itself succeeded.
      console.error(`[hackathon] Email trigger failed for ${applicationId}:`, err);
      // emailSent remains false; the response will indicate the email was not sent.
    }
  }

  return { application: current, emailSent, emailAlreadySent };
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
 *  - Does NOT silently swallow failures — throws so the caller can retry.
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
      amount: app.amount ?? 99,
      teamName: app.schoolName ?? "",
      college: app.college ?? "",
      hack2skillUrl: "https://hack2skill.com/",
    },
  });

  if (!result.success) {
    console.error(`[hackathon] Confirmation email FAILED for ${app.applicationId}: ${result.error}`);
    // Throw so caller knows it failed and can retry later.
    throw new Error(`Brevo email failed for ${app.applicationId}: ${result.error}`);
  }

  // Mark as sent to prevent duplicates on retry.
  const store = getStore();
  await store.updateApplication(app.id, { confirmationEmailSentAt: new Date().toISOString() });
  console.info(`[hackathon] Confirmation email sent for application ${app.applicationId}`);
  return { sent: true };
}
