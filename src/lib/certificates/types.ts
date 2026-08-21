/** A signatory as shown on the certificate (name + designation + signature). */
export interface CertificateSignatory {
  name: string;
  designation: string;
  signatureAsset: string;
}

/**
 * The complete data needed to RENDER a certificate (preview or issued). This is
 * a presentation model — for an issued certificate it is built from the
 * immutable stored snapshot, so rendering never depends on live mentor lookups.
 */
export interface CertificateData {
  recipientName: string;
  program: string;
  domainLabel: string;
  grade?: string;
  certificateId: string;
  issuedDateLabel: string;
  durationLabel?: string;
  mentor: {
    name: string;
    designation: string;
    signatureAsset: string;
  } | null;
  signatories: CertificateSignatory[];
  verificationUrl: string;
  /** When true the certificate is a non-issued preview (shows a watermark). */
  isPreview: boolean;
}

export type CertificateTemplateId = "classic" | "modern" | "minimal";

export const CERTIFICATE_TEMPLATES: { id: CertificateTemplateId; name: string }[] = [
  { id: "classic", name: "Classic — Teal institutional" },
  { id: "modern", name: "Modern — Accent band" },
  { id: "minimal", name: "Minimal — Fine line" },
];
