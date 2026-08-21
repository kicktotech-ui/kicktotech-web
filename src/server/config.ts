/**
 * KICK TO TECH — backend runtime configuration.
 *
 * All secrets come from the environment. NOTHING sensitive is hardcoded here.
 * `.env.local` (git-ignored) supplies real values in dev; deployment secrets in
 * prod. See .env.example for the documented variables.
 */

const isProd = process.env.NODE_ENV === "production";

/**
 * HMAC key used to sign session cookies. Resolved LAZILY (at request time), not
 * at import — so `next build` never crashes when the secret is unset. In
 * production a missing secret throws when signing is actually attempted; in dev
 * it falls back to an insecure value with a warning.
 */
export function getSessionSecret(): string {
  const value = process.env.AUTH_SESSION_SECRET;
  if (value && value.length > 0) return value;
  if (isProd) {
    throw new Error("[config] AUTH_SESSION_SECRET is required in production.");
  }
  return "dev-insecure-session-secret-change-me";
}

/**
 * Public base URL of the site (scheme + host, no trailing slash). Used to build
 * absolute verification URLs embedded in certificate QR codes. Resolves from
 * NEXT_PUBLIC_SITE_URL (works in prod), falling back to localhost in dev.
 */
export function getPublicBaseUrl(): string {
  // If explicitly set (e.g. production domain in Vercel env settings)
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  
  // If running on Vercel (Preview or Prod branch without explicit domain)
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const cleanUrl = vercelUrl.replace(/\/+$/, "");
    return cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
  }

  return isProd ? "https://kicktotech.in" : "http://localhost:3000";
}

/** Absolute verification URL for a given certificate id. */
export function verificationUrlFor(certificateId: string): string {
  return `${getPublicBaseUrl()}/verify_cert?cert=${encodeURIComponent(certificateId)}`;
}

export const config = {
  isProd,

  /** Session lifetime. */
  sessionTtlHours: Number(process.env.AUTH_SESSION_TTL_HOURS ?? 24),

  /** Cookie names (student and admin sessions are fully separate). */
  cookies: {
    student: "ktt_student_session",
    admin: "ktt_admin_session",
  },

  /**
   * Admin identity for routing/bootstrap only. This is NOT a credential.
   * The password is NEVER stored here — admin bootstrap reads a one-time
   * password from AUTH_ADMIN_BOOTSTRAP_PASSWORD (dev) or is provisioned by ops.
   */
  admin: {
    email: (process.env.ADMIN_EMAIL ?? "admin@kicktotech.in").toLowerCase(),
    bootstrapPassword: process.env.AUTH_ADMIN_BOOTSTRAP_PASSWORD ?? "",
  },

  /** Reserved email domain — accounts here may not use the student portal. */
  adminEmailDomain: "@kicktotech.in",

  password: {
    minLength: 8,
    pbkdf2Iterations: 210000,
  },

  rateLimit: {
    windowMs: 60_000,
    maxAuthAttempts: 10, // per IP per window on auth endpoints
  },

  cookieSecure: isProd, // Secure flag only over HTTPS in prod; off on localhost

  /**
   * Selects the data backend. Defaults to the in-memory store so local dev and
   * builds keep working with zero external dependencies and NO risk of writing
   * to real Firebase. Set DATA_BACKEND=firebase only after the Firebase Admin
   * service account AND the real Firestore collection names/schema are
   * confirmed (see src/server/data/firebase adapter — pending).
   */
  dataBackend: (process.env.DATA_BACKEND ?? "memory") as "memory" | "firebase",
} as const;
