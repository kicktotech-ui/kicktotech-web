import { getStore, isHackathonRecord, type ApplicationRecord } from "./data";
import { applicationId as makeAppId } from "./crypto";
import { writeAudit } from "./audit";
import { AppError } from "./http";
import { getPaymentConfig, publicPaymentInfo, buildWhatsappUrl, type PublicPaymentInfo } from "./payments/config";
import { resolveMentorForDomain, normalizeCertificateDomain, DOMAIN_META } from "@/lib/certificates/mentors";
import type { ApplicationInput } from "./validation";
import { sendBrevoTemplateEmail } from "./email/brevo";
import { sendHackathonConfirmationEmail } from "./hackathonApplications";
import { syncConfirmedHackathonParticipant } from "./integrations/googleSheets";

/*
 * Internship application service — the manual UPI + WhatsApp payment gate.
 *
 * No payment gateway: an application is created in PAYMENT_PENDING, the user
 * pays via UPI and sends proof over WhatsApp, and an admin manually flips it to
 * PAYMENT_VERIFIED. Certificate issuance is gated on PAYMENT_VERIFIED.
 */

function dedupeKeyFor(email: string, domain: string): string {
  return `${email.trim().toLowerCase()}:${normalizeCertificateDomain(domain)}`;
}

export interface SubmitResult {
  application: ApplicationRecord;
  duplicate: boolean;
  payment: PublicPaymentInfo;
  whatsappUrl: string | null;
}

export async function submitApplication(input: ApplicationInput): Promise<SubmitResult> {
  const store = getStore();
  const domain = normalizeCertificateDomain(input.domain);
  const cfg = getPaymentConfig();
  const dedupeKey = dedupeKeyFor(input.email, domain);

  // Idempotent: refresh/retry with the same email+domain reuses the record,
  // unless it was rejected (then allow a fresh attempt by resetting to pending).
  let application = await store.getApplicationByDedupeKey(dedupeKey);
  let duplicate = false;

  if (application && application.status !== "PAYMENT_REJECTED") {
    duplicate = true;
  } else if (application && application.status === "PAYMENT_REJECTED") {
    application = await store.updateApplication(application.id, {
      status: "PAYMENT_PENDING", reviewNote: undefined, updatedAt: new Date().toISOString(),
    });
  } else {
    const mentor = resolveMentorForDomain(domain);
    const now = new Date().toISOString();
    const record: ApplicationRecord = {
      id: store.newId(),
      applicationId: makeAppId(),
      name: input.name,
      email: input.email,
      phone: input.phone,
      college: input.college,
      prn: input.prn,
      schoolName: input.schoolName,
      division: input.division,
      course: input.course,
      year: input.year,
      city: input.city,
      domain,
      mentorId: mentor?.id,
      mentorName: mentor?.name,
      amount: cfg.amount,
      status: "PAYMENT_PENDING",
      createdAt: now,
      updatedAt: now,
      dedupeKey,
    };
    application = await store.createApplication(record);

    // Fire-and-forget: attempt to send confirmation email via Brevo.
    // Failure does NOT block or roll back the application.
    sendApplicationConfirmationEmail(record).catch(() => {});
  }

  if (!application) throw new AppError("SERVER_ERROR", "Could not create the application.");

  const whatsappUrl = buildWhatsappUrl(cfg, {
    name: application.name,
    domain: DOMAIN_META[domain].label,
    applicationId: application.applicationId,
  });
  return { application, duplicate, payment: publicPaymentInfo(cfg), whatsappUrl };
}

/** User confirms they've paid + will send proof → PROOF_SUBMITTED. */
export async function submitPaymentProof(applicationId: string): Promise<ApplicationRecord> {
  const store = getStore();
  const app = await store.getApplicationByAppId(applicationId);
  if (!app) throw new AppError("NOT_FOUND", "Application not found.");
  if (app.status === "PAYMENT_VERIFIED" || app.status === "CERTIFICATE_ISSUED") return app; // already past this stage
  const updated = await store.updateApplication(app.id, { status: "PAYMENT_PROOF_SUBMITTED", updatedAt: new Date().toISOString() });
  return updated ?? app;
}

export async function listApplications(): Promise<ApplicationRecord[]> {
  return getStore().listApplications();
}

export async function getApplication(applicationId: string): Promise<ApplicationRecord | null> {
  return getStore().getApplicationByAppId(applicationId);
}

/** Admin manually verifies the payment → PAYMENT_VERIFIED (issuance unlocked). */
export async function verifyPayment(applicationId: string, meta: { actor: string; requestId: string }): Promise<ApplicationRecord> {
  const store = getStore();
  const app = await store.getApplicationByAppId(applicationId);
  if (!app) throw new AppError("NOT_FOUND", "Application not found.");
  if (app.status === "PAYMENT_VERIFIED" || app.status === "CERTIFICATE_ISSUED") return app; // idempotent
  const updated = await store.updateApplication(app.id, {
    status: "PAYMENT_VERIFIED", verifiedBy: meta.actor, verifiedAt: new Date().toISOString(), reviewNote: undefined, updatedAt: new Date().toISOString(),
  });
  await writeAudit({ actor: meta.actor, action: "PAYMENT_VERIFIED", target: applicationId, requestId: meta.requestId });

  const verified = updated ?? app;

  // Trigger hackathon confirmation email & Google Sheet sync for Hack2Skill applications (post-verification).
  // Fire-and-forget: admin verification succeeds regardless of email/sheet delivery.
  if (verified.domain === "hack2skill" || isHackathonRecord(verified as unknown as Record<string, unknown>)) {
    sendHackathonConfirmationEmail(verified).catch((err) => {
      console.error(`[applications] Hack2Skill confirmation email failed for ${applicationId}:`, err);
    });
    syncConfirmedHackathonParticipant(verified).catch((err) => {
      console.error(`[applications] Google Sheet sync failed for ${applicationId}:`, err);
    });
  }

  return verified;
}

/** Admin rejects the payment proof → PAYMENT_REJECTED. */
export async function rejectPayment(applicationId: string, reason: string | undefined, meta: { actor: string; requestId: string }): Promise<ApplicationRecord> {
  const store = getStore();
  const app = await store.getApplicationByAppId(applicationId);
  if (!app) throw new AppError("NOT_FOUND", "Application not found.");
  if (app.status === "CERTIFICATE_ISSUED") throw new AppError("CONFLICT", "A certificate has already been issued for this application.");
  const updated = await store.updateApplication(app.id, {
    status: "PAYMENT_REJECTED", reviewNote: reason, updatedAt: new Date().toISOString(),
  });
  await writeAudit({ actor: meta.actor, action: "PAYMENT_REJECTED", target: applicationId, requestId: meta.requestId });
  return updated ?? app;
}

/** Link an issued certificate back to its application (marks CERTIFICATE_ISSUED). */
export async function markApplicationCertified(applicationId: string, certificateId: string): Promise<void> {
  const store = getStore();
  const app = await store.getApplicationByAppId(applicationId);
  if (!app) return;
  await store.updateApplication(app.id, { status: "CERTIFICATE_ISSUED", certificateId, updatedAt: new Date().toISOString() });
}

// ---------------------------------------------------------------------------
// Brevo confirmation email (fire-and-forget helper)
// ---------------------------------------------------------------------------

/**
 * Attempt to send an application confirmation email via Brevo.
 * This is deliberately non-transactional with the application: if Brevo fails,
 * the application still exists. The result is logged server-side only.
 */
async function sendApplicationConfirmationEmail(app: ApplicationRecord): Promise<void> {
  const templateId = Number(process.env.BREVO_TEMPLATE_ID ?? 1);
  const domainLabel = DOMAIN_META[app.domain as keyof typeof DOMAIN_META]?.label ?? app.domain;

  const result = await sendBrevoTemplateEmail({
    to: { email: app.email, name: app.name },
    templateId,
    params: {
      name: app.name,
      email: app.email,
      domain: domainLabel,
      applicationId: app.applicationId,
      amount: app.amount ?? 0,
    },
  });

  if (result.success) {
    console.info(`[applications] Confirmation email sent for application ${app.applicationId}`);
  } else {
    console.warn(`[applications] Confirmation email failed for application ${app.applicationId}: ${result.error}`);
  }
}
