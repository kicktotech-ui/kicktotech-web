/**
 * Mentor + authorized-signatory registry for certificates.
 *
 * This is the single, data-driven source that maps a mentor to their REAL
 * signature asset (files live in /public/cert-assets). Certificate rendering
 * NEVER hardcodes `if domain === "python" ...`; instead the domain resolves to
 * a mentor record here, and at issuance the resolved mentor is snapshotted onto
 * the certificate so it stays immutable even if this registry changes later.
 *
 * Client- and server-safe (no node-only imports).
 */

export type CertificateDomain = "python" | "java" | "data-analytics" | "cybersecurity";

export interface MentorRecord {
  id: string;
  name: string;
  designation: string;
  /** The internship domain this mentor leads. */
  domain: CertificateDomain;
  /** Web path to the mentor's real signature (transparent PNG preferred). */
  signatureAsset: string;
  /** Web path to the mentor's photo (used in admin selector, not the cert). */
  photo?: string;
  isActive: boolean;
}

export interface Signatory {
  id: string;
  name: string;
  designation: string;
  signatureAsset: string;
}

/** Human-readable labels + accents per domain (single source of truth). */
export const DOMAIN_META: Record<CertificateDomain, { label: string; program: string; accent: string }> = {
  python: { label: "Python (AI + Projects)", program: "Python Programming with AI Project", accent: "#0f766e" },
  java: { label: "Java Development", program: "Java Development with Project", accent: "#b45309" },
  "data-analytics": { label: "Data Analytics", program: "Data Analytics with Project", accent: "#6d28d9" },
  cybersecurity: { label: "Cybersecurity", program: "Cybersecurity with Project", accent: "#15803d" },
};

export const DOMAIN_SLUGS: CertificateDomain[] = ["python", "java", "data-analytics", "cybersecurity"];

export function isCertificateDomain(v: unknown): v is CertificateDomain {
  return typeof v === "string" && (DOMAIN_SLUGS as string[]).includes(v);
}

/** Normalize any stored/legacy domain string to a known slug (display-safe). */
export function normalizeCertificateDomain(v: unknown): CertificateDomain {
  const s = String(v ?? "").toLowerCase().replace(/[\s_]+/g, "-");
  if (s.includes("python")) return "python";
  if (s.includes("java")) return "java";
  if (s.includes("cyber") || s.includes("security")) return "cybersecurity";
  if (s.includes("data") || s.includes("analytic")) return "data-analytics";
  return "python";
}

/**
 * Domain mentors. Keyed by a stable mentor id. The signature files are the REAL
 * assets already present in /public/cert-assets.
 */
export const MENTORS: MentorRecord[] = [
  {
    id: "omkar-pawar",
    name: "Omkar Pawar",
    designation: "Python & AI Mentor",
    domain: "python",
    signatureAsset: "/cert-assets/omkar-pawar-python-signature.png",
    photo: "/team/omkar-pawar.jpeg",
    isActive: true,
  },
  {
    id: "pooja-kolekar",
    name: "Pooja Kolekar",
    designation: "Java Development Mentor",
    domain: "java",
    signatureAsset: "/cert-assets/pooja-java-signature.png",
    photo: "/team/pooja-kolekar.jpg",
    isActive: true,
  },
  {
    id: "samruddhi-more",
    name: "Samruddhi More",
    designation: "Cybersecurity Mentor",
    domain: "cybersecurity",
    signatureAsset: "/cert-assets/samruddhi-cybersecurity-signature.png",
    photo: "/team/samruddhi-more.png",
    isActive: true,
  },
  {
    id: "tauheed",
    name: "Tauheed",
    designation: "Data Analytics Mentor",
    domain: "data-analytics",
    signatureAsset: "/cert-assets/tauhid-data-analytics-signature.png",
    photo: "/team/tauheed.jpeg",
    isActive: true,
  },
];

/**
 * Organization authorized signatories that appear on every certificate. These
 * are real people with real signature assets; do not invent additional ones.
 */
export const AUTHORIZED_SIGNATORIES: Signatory[] = [
  {
    id: "mayur-patil",
    name: "Mayur Patil",
    designation: "Founder & CEO",
    signatureAsset: "/cert-assets/mayur-patil-signature.png",
  },
  {
    id: "kaustubh-pawar",
    name: "Kaustubh Pawar",
    designation: "Co-Founder",
    signatureAsset: "/cert-assets/kaustubh-pawar-signature-new.png",
  },
];

export function listMentors(): MentorRecord[] {
  return MENTORS.filter((m) => m.isActive);
}

export function getMentorById(id: string | undefined | null): MentorRecord | null {
  if (!id) return null;
  return MENTORS.find((m) => m.id === id) ?? null;
}

/** Data-driven domain → mentor resolution (no inline conditionals in the UI). */
export function resolveMentorForDomain(domain: CertificateDomain): MentorRecord | null {
  return MENTORS.find((m) => m.domain === domain && m.isActive) ?? null;
}
