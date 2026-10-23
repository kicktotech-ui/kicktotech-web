import { getStore, isHackathonRecord, defaultAmountForDomain, type ApplicationRecord } from "./data";
import { applicationId as makeAppId } from "./crypto";
import { writeAudit } from "./audit";
import { AppError } from "./http";
import { getPaymentConfig, publicPaymentInfo, buildWhatsappUrl, type PublicPaymentInfo } from "./payments/config";
import { resolveMentorForDomain, normalizeCertificateDomain, DOMAIN_META } from "@/lib/certificates/mentors";
import type { ApplicationInput, AdminCreateApplicationInput } from "./validation";
import { sendBrevoTemplateEmail } from "./email/brevo";
import { sendHackathonConfirmationEmail } from "./hackathonApplications";
import { syncConfirmedHackathonParticipant } from "./integrations/googleSheets";
import { getAdminDb, isAdminConfigured } from "./firebase/admin";

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

export interface AccessGrantResult {
  application: ApplicationRecord;
  access?: {
    internId: string;
    activationCode: string;
    dashboardUrl: string;
    grantedAt: string;
  };
}

function normalizeDomainSlug(domain: string): "python" | "java" | "data-analytics" | "cybersecurity" {
  const s = domain.toLowerCase();
  if (s.includes("python")) return "python";
  if (s.includes("java")) return "java";
  if (s.includes("data") || s.includes("analytic")) return "data-analytics";
  if (s.includes("cyber") || s.includes("security")) return "cybersecurity";
  return "python";
}

/** Admin grants internship access to an application. */
export async function grantInternshipAccess(
  applicationId: string,
  meta: { actor: string; requestId: string }
): Promise<AccessGrantResult> {
  const store = getStore();
  const app = await store.getApplicationByAppId(applicationId);
  if (!app) throw new AppError("NOT_FOUND", "Application not found.");

  const now = new Date().toISOString();
  const updated = await store.updateApplication(app.id, {
    status: "PAYMENT_VERIFIED",
    verifiedBy: meta.actor,
    verifiedAt: app.verifiedAt || now,
    updatedAt: now,
  });

  const verified = updated ?? app;
  const domainSlug = normalizeDomainSlug(verified.domain);
  const internId = `KTT/INT/2026/S${Math.floor(1000 + Math.random() * 9000)}`;
  const activationCode = String(Math.floor(1000 + Math.random() * 9000));
  const dashboardUrl = "https://kicktotech.in/internship/dashboard";

  // If Firebase Admin is available, write to interns & manual_activations collections
  if (isAdminConfigured()) {
    try {
      const db = await getAdminDb();
      const internDoc = {
        id: verified.id,
        internId,
        name: verified.name,
        email: verified.email,
        phone: verified.phone,
        college: verified.college || "Kick To Tech Student",
        domainId: domainSlug,
        status: "ACTIVE",
        paymentStatus: "PAID",
        certificateStatus: "NOT_READY",
        progress: 0,
        mentorId: verified.mentorId,
        joinedAt: verified.verifiedAt || now,
        avatarColor: "#0057ff",
      };

      await Promise.allSettled([
        db.collection("interns").doc(verified.id).set(internDoc, { merge: true }),
        db.collection("ktt_interns").doc(verified.id).set(internDoc, { merge: true }),
        db.collection("manual_activations").doc(`act_${verified.id}`).set({
          id: `act_${verified.id}`,
          code: activationCode,
          internName: verified.name,
          internEmail: verified.email,
          domainId: domainSlug,
          status: "AVAILABLE",
          createdAt: now,
          expiresAt: new Date(Date.now() + 90 * 864e5).toISOString(),
        }, { merge: true }),
        db.collection("ktt_manual_activations").doc(`act_${verified.id}`).set({
          id: `act_${verified.id}`,
          code: activationCode,
          internName: verified.name,
          internEmail: verified.email,
          domainId: domainSlug,
          status: "AVAILABLE",
          createdAt: now,
          expiresAt: new Date(Date.now() + 90 * 864e5).toISOString(),
        }, { merge: true }),
      ]);
    } catch (err) {
      console.warn("[applications] Could not write intern/activation records to Firestore:", err);
    }
  }

  // Attempt confirmation email
  sendApplicationConfirmationEmail(verified).catch(() => {});

  await writeAudit({
    actor: meta.actor,
    action: "GRANT_INTERNSHIP_ACCESS",
    target: applicationId,
    requestId: meta.requestId,
  });

  return {
    application: verified,
    access: {
      internId,
      activationCode,
      dashboardUrl,
      grantedAt: now,
    },
  };
}

/** Admin updates details of any internship application (domain, amount, status, etc.). */
export async function updateApplicationDetails(
  applicationId: string,
  patch: Partial<ApplicationRecord>,
  meta: { actor: string; requestId: string }
): Promise<ApplicationRecord> {
  const store = getStore();
  const app = await store.getApplicationByAppId(applicationId);
  if (!app) throw new AppError("NOT_FOUND", "Application not found.");

  const now = new Date().toISOString();
  const updatePayload: Partial<ApplicationRecord> = {
    ...patch,
    updatedAt: now,
  };

  if (patch.status === "PAYMENT_VERIFIED" && !app.verifiedAt) {
    updatePayload.verifiedAt = now;
    updatePayload.verifiedBy = meta.actor;
  }

  const updated = await store.updateApplication(app.id, updatePayload);
  if (!updated) throw new AppError("SERVER_ERROR", "Failed to update application.");

  // If status is verified, grant access in background
  if (patch.status === "PAYMENT_VERIFIED") {
    grantInternshipAccess(applicationId, meta).catch((e) => {
      console.warn("[applications] Background access sync on update failed:", e);
    });
  }

  await writeAudit({
    actor: meta.actor,
    action: "UPDATE_APPLICATION",
    target: applicationId,
    requestId: meta.requestId,
  });

  return updated;
}

/** Admin directly creates an internship application record. */
export async function createAdminApplication(
  input: AdminCreateApplicationInput,
  meta: { actor: string; requestId: string }
): Promise<AccessGrantResult> {
  const store = getStore();
  const domain = input.domain.trim();
  const mentor = input.mentorId ? { id: input.mentorId, name: input.mentorName || "" } : resolveMentorForDomain(normalizeCertificateDomain(domain));
  const amount = typeof input.amount === "number" ? input.amount : defaultAmountForDomain(domain, false);
  const now = new Date().toISOString();
  const status = input.status || "PAYMENT_VERIFIED";

  const record: ApplicationRecord = {
    id: store.newId(),
    applicationId: makeAppId(),
    name: input.name,
    email: input.email,
    phone: input.phone,
    college: input.college,
    course: input.course,
    year: input.year,
    prn: input.prn,
    domain,
    mentorId: mentor?.id,
    mentorName: mentor?.name,
    amount,
    status,
    createdAt: now,
    updatedAt: now,
    dedupeKey: `${input.email.trim().toLowerCase()}:${domain}`,
    reviewNote: input.reviewNote,
    verifiedBy: status === "PAYMENT_VERIFIED" ? meta.actor : undefined,
    verifiedAt: status === "PAYMENT_VERIFIED" ? now : undefined,
  };

  const created = await store.createApplication(record);

  await writeAudit({
    actor: meta.actor,
    action: "ADMIN_CREATE_APPLICATION",
    target: created.applicationId,
    requestId: meta.requestId,
  });

  if (input.grantAccess || status === "PAYMENT_VERIFIED") {
    return grantInternshipAccess(created.applicationId, meta);
  }

  return { application: created };
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
