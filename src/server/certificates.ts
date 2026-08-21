import { getStore, type CertificateRecord } from "./data";
import { firebaseStore } from "./data/firebase";
import { certificateId as makeCertId } from "./crypto";
import { verificationUrlFor } from "./config";
import { writeAudit } from "./audit";
import { AppError } from "./http";
import type { IssueCertificateInput } from "./validation";
import {
  resolveMentorForDomain, getMentorById, AUTHORIZED_SIGNATORIES,
  normalizeCertificateDomain, type CertificateDomain,
} from "@/lib/certificates/mentors";

/*
 * Certificate service — the backend source of truth.
 *
 * - IDs are secure & non-sequential (crypto.certificateId), generated ONLY here
 *   at issuance (never in the frontend, never during preview).
 * - Issuance is IDEMPOTENT: a stable dedupe key means a double-click / retry
 *   returns the SAME certificate instead of creating a duplicate.
 * - The mentor + signatories are SNAPSHOTTED onto the record, so later edits to
 *   the mentor registry never mutate an already-issued certificate.
 */

/** Stable idempotency key for an issuance request. */
function dedupeKeyFor(input: IssueCertificateInput): string {
  const domain = normalizeCertificateDomain(input.domain);
  if (input.internId) return `intern:${input.internId.toLowerCase()}:${domain}`;
  return `name:${input.recipientName.trim().toLowerCase()}:${domain}:${input.program.trim().toLowerCase()}`;
}

export async function issueCertificate(
  input: IssueCertificateInput,
  meta: { actor: string; requestId: string },
): Promise<{ certificate: CertificateRecord; duplicate: boolean }> {
  const store = getStore();
  const domain = normalizeCertificateDomain(input.domain) as CertificateDomain;
  const dedupeKey = dedupeKeyFor(input);

  // Payment gate: if this issuance is linked to an application, that application
  // MUST be payment-verified. This is enforced server-side, never trusting the UI.
  if (input.applicationId) {
    const app = await store.getApplicationByAppId(input.applicationId);
    if (!app) throw new AppError("NOT_FOUND", "Linked application not found.");
    if (app.status !== "PAYMENT_VERIFIED" && app.status !== "CERTIFICATE_ISSUED") {
      throw new AppError("FORBIDDEN", `Payment is not verified for this application (status: ${app.status}). Verify the payment before issuing.`);
    }
  }

  // Idempotency: if this exact credential was already issued, return it.
  const existing = await store.getCertificateByDedupeKey(dedupeKey);
  if (existing) return { certificate: existing, duplicate: true };

  // Allocate a unique, non-sequential id (collision-safe retry loop).
  let certId = makeCertId();
  while (await store.getCertificateByCertId(certId)) certId = makeCertId();

  // Resolve the mentor: explicit override wins, else data-driven by domain.
  const mentor = getMentorById(input.mentorId) ?? resolveMentorForDomain(domain);
  if (!mentor) {
    throw new AppError("VALIDATION_ERROR", `No mentor is configured for the "${domain}" domain. Configure a mentor + signature before issuing.`);
  }
  if (!mentor.signatureAsset) {
    throw new AppError("VALIDATION_ERROR", `Mentor "${mentor.name}" has no signature configured. Add a signature before issuing.`);
  }

  const now = new Date().toISOString();
  const record: CertificateRecord = {
    id: store.newId(),
    certificateId: certId,
    recipientName: input.recipientName,
    email: input.email,
    college: input.college,
    program: input.program,
    domain,
    grade: input.grade,
    durationLabel: input.durationLabel,
    startDate: input.startDate,
    endDate: input.endDate,
    status: "issued",
    issuedAt: now,
    updatedAt: now,
    internId: input.internId,
    issuedBy: meta.actor,
    dedupeKey,
    // Immutable mentor + signatory snapshot.
    mentorId: mentor.id,
    mentorName: mentor.name,
    mentorDesignation: mentor.designation,
    mentorSignatureAsset: mentor.signatureAsset,
    signatories: AUTHORIZED_SIGNATORIES.map((s) => ({ name: s.name, designation: s.designation, signatureAsset: s.signatureAsset })),
  };

  await store.createCertificate(record);

  // Link the certificate back to its application (marks CERTIFICATE_ISSUED).
  if (input.applicationId) {
    const app = await store.getApplicationByAppId(input.applicationId);
    if (app) await store.updateApplication(app.id, { status: "CERTIFICATE_ISSUED", certificateId: record.certificateId, updatedAt: now });
  }

  await writeAudit({ actor: meta.actor, action: "CERTIFICATE_ISSUED", target: record.certificateId, requestId: meta.requestId });
  return { certificate: record, duplicate: false };
}

export async function listCertificates(): Promise<CertificateRecord[]> {
  return getStore().listCertificates();
}

export async function revokeCertificate(certificateId: string, meta: { actor: string; requestId: string }): Promise<CertificateRecord> {
  const store = getStore();
  const cert = await store.getCertificateByCertId(certificateId);
  if (!cert) throw new AppError("NOT_FOUND", "Certificate not found.");
  if (cert.status === "revoked") return cert; // idempotent revoke
  if (cert.status !== "issued") {
    throw new AppError("CONFLICT", `Only issued certificates can be revoked (current status: ${cert.status}).`);
  }
  const updated = await store.updateCertificate(cert.id, {
    status: "revoked",
    revokedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await writeAudit({ actor: meta.actor, action: "CERTIFICATE_REVOKED", target: certificateId, requestId: meta.requestId });
  return updated ?? cert;
}

export interface PublicVerification {
  found: boolean;
  valid?: boolean;
  status?: string;
  certificateId?: string;
  recipientName?: string;
  program?: string;
  domain?: string;
  grade?: string;
  durationLabel?: string;
  issuedAt?: string;
  revokedAt?: string;
  mentorName?: string;
  mentorDesignation?: string;
  verificationUrl?: string;
  verifiedAt?: string;
}

/**
 * Public, privacy-safe verification payload. NO email / internId / db-id /
 * college / phone exposed. Checks the REAL Firestore certificates first, then
 * the session store (so freshly issued certs verify immediately).
 */
export async function verifyCertificate(certificateId: string): Promise<PublicVerification> {
  const id = certificateId.trim();
  if (!id) return { found: false };

  let cert: CertificateRecord | null = null;
  try {
    cert = await firebaseStore().getCertificateByCertId(id);
  } catch {
    cert = null; // Firebase unavailable / quota — fall through to session store
  }
  if (!cert) cert = await getStore().getCertificateByCertId(id);
  if (!cert) return { found: false };

  return {
    found: true,
    valid: cert.status === "issued",
    status: cert.status,
    certificateId: cert.certificateId,
    recipientName: cert.recipientName,
    program: cert.program,
    domain: cert.domain,
    grade: cert.grade,
    durationLabel: cert.durationLabel,
    issuedAt: cert.issuedAt,
    revokedAt: cert.revokedAt,
    mentorName: cert.mentorName,
    mentorDesignation: cert.mentorDesignation,
    verificationUrl: verificationUrlFor(cert.certificateId),
    verifiedAt: new Date().toISOString(),
  };
}
