import { api, ApiError } from "@/lib/api";

/**
 * CertificateService — REAL public verification against the backend.
 *   GET /api/v1/certificates/verify/:id   (id format: KTT-YYYY-XXXX)
 *
 * The frontend NEVER decides validity; the backend queries the certificate
 * store (real Firestore first, then session store) and returns a privacy-safe
 * payload. No mock data, no hardcoded IDs.
 */

export type VerificationOutcome = "verified" | "revoked" | "not_found" | "error";

export interface PublicCertificate {
  certificateId: string;
  recipientName: string;
  program: string;
  domain?: string;
  grade?: string;
  durationLabel?: string;
  issuedAt?: string;
  revokedAt?: string;
  mentorName?: string;
  mentorDesignation?: string;
  verificationUrl?: string;
  verifiedAt?: string;
  status: string;
}

interface VerifyResponse {
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

export interface VerificationResult {
  outcome: VerificationOutcome;
  certificate: PublicCertificate | null;
}

export interface CertificateService {
  verifyCertificate(certificateId: string): Promise<VerificationResult>;
}

export const certificateService: CertificateService = {
  async verifyCertificate(certificateId) {
    const id = certificateId.trim();
    if (!id) return { outcome: "not_found", certificate: null };
    try {
      const r = await api.get<VerifyResponse>(`/certificates/verify/${encodeURIComponent(id)}`);
      if (!r.found) return { outcome: "not_found", certificate: null };
      const certificate: PublicCertificate = {
        certificateId: r.certificateId ?? id,
        recipientName: r.recipientName ?? "",
        program: r.program ?? "",
        domain: r.domain,
        grade: r.grade,
        durationLabel: r.durationLabel,
        issuedAt: r.issuedAt,
        revokedAt: r.revokedAt,
        mentorName: r.mentorName,
        mentorDesignation: r.mentorDesignation,
        verificationUrl: r.verificationUrl,
        verifiedAt: r.verifiedAt,
        status: r.status ?? "unknown",
      };
      return { outcome: r.valid ? "verified" : "revoked", certificate };
    } catch (e) {
      // Distinguish "not found" (404) from real server/network errors.
      if (e instanceof ApiError && e.status === 404) return { outcome: "not_found", certificate: null };
      return { outcome: "error", certificate: null };
    }
  },
};
